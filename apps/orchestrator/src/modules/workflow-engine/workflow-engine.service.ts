import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ToolRegistryService } from "../tool-registry/tool-registry.service";
import { McpClientService } from "../mcp-client/mcp-client.service";
import { DomainError } from "../../common/errors/domain.error";
import { backoffMs } from "./retry/backoff";
import { DEFAULT_RETRY } from "./retry/retry.policy";
import { validateArgs } from "../tool-registry/schema/schema.validator";
import { AuditService } from "../../common/logging/audit.service";

function resolveTemplateArgs(args: any, context: Record<string, any>) {
  const s = JSON.stringify(args);
  const out = s.replace(/\{\{step(\d+)\.([a-zA-Z0-9_]+)\}\}/g, (_m, i, k) => {
    const v = context[`step${i}`]?.[k];
    return v === undefined ? "" : String(v);
  });
  return JSON.parse(out);
}

function normalizeStartDate(v: any) {
  if (v === "TOMORROW") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  return v;
}

type ExecInput = {
  actorId?: string | null;
  commandId: string;
  planId: string;
  steps: any[];
  piiResolver?: (token: string) => Promise<string | null>;
};

@Injectable()
export class WorkflowEngineService {
  constructor(
    private prisma: PrismaClient,
    private registry: ToolRegistryService,
    private mcp: McpClientService,
    private audit: AuditService
  ) {}

  async executeOrResume(input: ExecInput) {
    // Idempotency at run level: if there's a successful run for this plan, return it
    const existingSuccess = await this.prisma.run.findFirst({
      where: { planId: input.planId, status: "SUCCESS" },
      orderBy: { createdAt: "desc" }
    });
    if (existingSuccess) return { ok: true, runId: existingSuccess.id };

    // If there is a RUNNING/FAILED run, attempt resume by creating new run and skipping successful steps
    const lastRun = await this.prisma.run.findFirst({
      where: { planId: input.planId },
      orderBy: { createdAt: "desc" }
    });

    const run = await this.prisma.run.create({
      data: { commandId: input.commandId, planId: input.planId, status: "RUNNING", actorId: input.actorId || null }
    });

    await this.audit.record({ type: "RUN_STARTED", actorId: input.actorId || null, commandId: input.commandId, planId: input.planId, runId: run.id });

    const ctx: Record<string, any> = {};
    const alreadyDone = new Map<number, any>();

    if (lastRun) {
      const prevSteps = await this.prisma.step.findMany({
        where: { runId: lastRun.id, status: "SUCCESS" },
        orderBy: { index: "asc" }
      });
      for (const s of prevSteps) {
        alreadyDone.set(s.index, s.result);
        ctx[`step${s.index}`] = s.result;
      }
    }

    try {
      for (let index = 0; index < input.steps.length; index++) {
        const step = input.steps[index];

        // Resume: skip steps that were already SUCCESS in previous run
        if (alreadyDone.has(index)) {
          await this.prisma.step.create({
            data: {
              runId: run.id,
              index,
              tool: step.tool,
              args: step.args,
              status: "SUCCESS",
              result: alreadyDone.get(index),
              finishedAt: new Date(),
              idempotencyKey: step.idempotencyKey || null
            }
          });
          continue;
        }

        const row = await this.prisma.step.create({
          data: {
            runId: run.id,
            index,
            tool: step.tool,
            args: step.args,
            status: "RUNNING",
            idempotencyKey: step.idempotencyKey || null
          }
        });

        await this.audit.record({ type: "STEP_STARTED", actorId: input.actorId || null, commandId: input.commandId, planId: input.planId, runId: run.id, stepId: row.id, payload: { tool: step.tool, index } });

        const tool = await this.registry.getToolByName(step.tool);
        if (!tool) throw new DomainError("TOOL_NOT_FOUND", `Tool not found: ${step.tool}`, 400);

        let args = resolveTemplateArgs(step.args, ctx);

        if (args.startDate) args.startDate = normalizeStartDate(args.startDate);

        // Resolve PII token to real value just before execution
        if (args.bankAccountToken && input.piiResolver) {
          const real = await input.piiResolver(args.bankAccountToken);
          args.bankAccount = real;
          delete args.bankAccountToken;
        }

        // Validate args against tool JSON schema
        const v = validateArgs(tool.argsSchema as any, args);
        if (!v.ok) {
          await this.prisma.step.update({
            where: { id: row.id },
            data: { status: "FAILED", error: v.error || "Schema validation failed", finishedAt: new Date() }
          });
          await this.audit.record({ type: "STEP_FAILED", actorId: input.actorId || null, commandId: input.commandId, planId: input.planId, runId: run.id, stepId: row.id, payload: { error: v.error } });
          throw new DomainError("ARGS_INVALID", v.error || "Args invalid", 400);
        }

        let attempt = 0;
        while (true) {
          try {
            const res = await this.mcp.execute(tool.server.baseUrl, step.tool, args, step.timeoutMs || 30000);
            const result = res?.result ?? res;
            ctx[`step${index}`] = result;

            await this.prisma.step.update({
              where: { id: row.id },
              data: { status: "SUCCESS", result, finishedAt: new Date() }
            });

            await this.audit.record({ type: "STEP_SUCCEEDED", actorId: input.actorId || null, commandId: input.commandId, planId: input.planId, runId: run.id, stepId: row.id, payload: { tool: step.tool } });

            break;
          } catch (e: any) {
            attempt += 1;
            if (attempt > DEFAULT_RETRY.maxAttempts) {
              await this.prisma.step.update({
                where: { id: row.id },
                data: { status: "FAILED", error: e?.message || "failed", finishedAt: new Date() }
              });
              await this.audit.record({ type: "STEP_FAILED", actorId: input.actorId || null, commandId: input.commandId, planId: input.planId, runId: run.id, stepId: row.id, payload: { error: e?.message || "failed" } });
              throw new DomainError("STEP_FAILED", e?.message || "Step failed", 500);
            }
            await new Promise((r) => setTimeout(r, backoffMs(attempt)));
          }
        }
      }

      await this.prisma.run.update({ where: { id: run.id }, data: { status: "SUCCESS", finishedAt: new Date() } });
      await this.audit.record({ type: "RUN_SUCCEEDED", actorId: input.actorId || null, commandId: input.commandId, planId: input.planId, runId: run.id });
      return { ok: true, runId: run.id };
    } catch (e) {
      await this.prisma.run.update({ where: { id: run.id }, data: { status: "FAILED", finishedAt: new Date() } });
      await this.audit.record({ type: "RUN_FAILED", actorId: input.actorId || null, commandId: input.commandId, planId: input.planId, runId: run.id, payload: { error: (e as any)?.message || "failed" } });
      throw e;
    }
  }
}
