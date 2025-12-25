import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ToolRegistryService } from "../tool-registry/tool-registry.service";
import { McpClientService } from "../mcp-client/mcp-client.service";
import { DomainError } from "../../common/errors/domain.error";
import { backoffMs } from "./retry/backoff";
import { DEFAULT_RETRY } from "./retry/retry.policy";
import { compensationMap } from "./compensation/compensation.map";
import { validateArgs } from "../tool-registry/schema/schema.validator";

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
  if (v === "TODAY") return new Date().toISOString().slice(0, 10);
  return v;
}

@Injectable()
export class WorkflowEngineService {
  constructor(private prisma: PrismaClient, private registry: ToolRegistryService, private mcp: McpClientService) {}

  private async audit(type: string, meta: any) {
    try {
      await this.prisma.auditEvent.create({ data: { type, meta } });
    } catch {}
  }

  async execute(
    commandId: string,
    planId: string,
    steps: any[],
    piiResolver?: (token: string) => Promise<string | null>
  ) {
    const previousSuccess = await this.prisma.run.findFirst({
      where: { commandId, planId, status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      include: { steps: true }
    });

    const resumedCtx: Record<string, any> = {};
    const resumedIndex = new Set<number>();
    if (previousSuccess) {
      for (const s of previousSuccess.steps) {
        if (s.status === "SUCCESS" && s.result != null) {
          resumedCtx[`step${s.index}`] = s.result as any;
          resumedIndex.add(s.index);
        }
      }
    }

    const run = await this.prisma.run.create({ data: { commandId, planId, status: "RUNNING" } });
    await this.audit("RUN_STARTED", { commandId, planId, runId: run.id });

    const ctx: Record<string, any> = { ...resumedCtx };
    const executedIndexes: number[] = [];

    try {
      for (let index = 0; index < steps.length; index++) {
        const step = steps[index];

        if (resumedIndex.has(index)) {
          await this.prisma.step.create({
            data: { runId: run.id, index, tool: step.tool, args: step.args, status: "SUCCESS", result: ctx[`step${index}`] }
          });
          continue;
        }

        const row = await this.prisma.step.create({
          data: { runId: run.id, index, tool: step.tool, args: step.args, status: "RUNNING" }
        });

        const tool = await this.registry.getToolByName(step.tool);
        let args = resolveTemplateArgs(step.args, ctx);

        if (args.startDate) args.startDate = normalizeStartDate(args.startDate);

        if (args.bankAccountToken && piiResolver) {
          const real = await piiResolver(args.bankAccountToken);
          if (!real) throw new DomainError("PII_NOT_FOUND", "PII token not found", 400);
          delete args.bankAccountToken;
          args.bankAccount = real;
        }

        const validation = validateArgs((tool as any).argsSchema, args);
        if (!validation.ok) {
          throw new DomainError("ARGS_INVALID", `Invalid args for ${step.tool}: ${validation.error}`, 400);
        }

        let attempt = 0;
        while (true) {
          try {
            await this.audit("STEP_EXECUTE", { runId: run.id, stepId: row.id, tool: step.tool });
            const res = await this.mcp.execute(tool.server.baseUrl, step.tool, args, step.timeoutMs);
            const result = res?.result ?? res;

            ctx[`step${index}`] = result;
            executedIndexes.push(index);

            await this.prisma.step.update({
              where: { id: row.id },
              data: { status: "SUCCESS", result, finishedAt: new Date() }
            });

            await this.audit("STEP_SUCCESS", { runId: run.id, stepId: row.id, tool: step.tool });
            break;
          } catch (e: any) {
            attempt += 1;
            if (attempt > DEFAULT_RETRY.maxAttempts) {
              await this.prisma.step.update({
                where: { id: row.id },
                data: { status: "FAILED", error: e?.message || "failed", finishedAt: new Date() }
              });
              await this.audit("STEP_FAILED", { runId: run.id, stepId: row.id, tool: step.tool, error: e?.message });

              throw new DomainError("STEP_FAILED", e?.message || "Step failed", 500);
            }
            await new Promise(r => setTimeout(r, backoffMs(attempt)));
          }
        }
      }

      await this.prisma.run.update({ where: { id: run.id }, data: { status: "SUCCESS", finishedAt: new Date() } });
      await this.audit("RUN_SUCCESS", { runId: run.id });
      return { ok: true, runId: run.id };
    } catch (e) {
      await this.audit("RUN_FAILED", { runId: run.id, error: (e as any)?.message });

      // compensation (best-effort)
      for (let i = executedIndexes.length - 1; i >= 0; i--) {
        const idx = executedIndexes[i];
        const original = steps[idx];
        const comp = compensationMap[original.tool];
        if (!comp) continue;

        try {
          const tool = await this.registry.getToolByName(comp.tool);
          const compArgs = resolveTemplateArgs(comp.args, ctx);
          await this.mcp.execute(tool.server.baseUrl, comp.tool, compArgs, 15000);
          await this.audit("COMPENSATION_SUCCESS", { runId: run.id, tool: comp.tool, args: compArgs });
        } catch (ce: any) {
          await this.audit("COMPENSATION_FAILED", { runId: run.id, tool: comp.tool, error: ce?.message });
        }
      }

      await this.prisma.run.update({ where: { id: run.id }, data: { status: "FAILED", finishedAt: new Date() } });
      throw e;
    }
  }
}
