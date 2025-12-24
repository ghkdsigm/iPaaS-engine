import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ToolRegistryService } from "../tool-registry/tool-registry.service";
import { McpClientService } from "../mcp-client/mcp-client.service";
import { DomainError } from "../../common/errors/domain.error";
import { backoffMs } from "./retry/backoff";
import { DEFAULT_RETRY } from "./retry/retry.policy";

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

@Injectable()
export class WorkflowEngineService {
  constructor(private prisma: PrismaClient, private registry: ToolRegistryService, private mcp: McpClientService) {}

  async execute(commandId: string, planId: string, steps: any[], piiResolver?: (token: string) => string | null) {
    const run = await this.prisma.run.create({ data: { commandId, planId, status: "RUNNING" } });
    const ctx: Record<string, any> = {};

    try {
      for (let index = 0; index < steps.length; index++) {
        const step = steps[index];
        const row = await this.prisma.step.create({ data: { runId: run.id, index, tool: step.tool, args: step.args, status: "RUNNING" } });

        const tool = await this.registry.getToolByName(step.tool);
        let args = resolveTemplateArgs(step.args, ctx);

        if (args.startDate) args.startDate = normalizeStartDate(args.startDate);

        // Resolve PII token to real value just before execution
        if (args.bankAccountToken && piiResolver) {
          const real = piiResolver(args.bankAccountToken);
          args.bankAccount = real;
          delete args.bankAccountToken;
        }

        let attempt = 0;
        while (true) {
          try {
            const res = await this.mcp.execute(tool.server.baseUrl, step.tool, args);
            const result = res?.result ?? res;
            ctx[`step${index}`] = result;

            await this.prisma.step.update({ where: { id: row.id }, data: { status: "SUCCESS", result, finishedAt: new Date() } });
            break;
          } catch (e: any) {
            attempt += 1;
            if (attempt > DEFAULT_RETRY.maxAttempts) {
              await this.prisma.step.update({ where: { id: row.id }, data: { status: "FAILED", error: e?.message || "failed", finishedAt: new Date() } });
              throw new DomainError("STEP_FAILED", e?.message || "Step failed", 500);
            }
            await new Promise(r => setTimeout(r, backoffMs(attempt)));
          }
        }
      }

      await this.prisma.run.update({ where: { id: run.id }, data: { status: "SUCCESS", finishedAt: new Date() } });
      return { ok: true, runId: run.id };
    } catch (e) {
      await this.prisma.run.update({ where: { id: run.id }, data: { status: "FAILED", finishedAt: new Date() } });
      throw e;
    }
  }
}
