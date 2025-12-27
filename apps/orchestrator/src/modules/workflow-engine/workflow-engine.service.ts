import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ToolRegistryService } from "../tool-registry/tool-registry.service";
import { McpClientService } from "../mcp-client/mcp-client.service";
import { DomainError } from "../../common/errors/domain.error";
import { validateArgs } from "../tool-registry/schema/schema.validator";

type StepDraft = { tool: string; args: any; timeoutMs?: number };

@Injectable()
export class WorkflowEngineService {
  constructor(
    private prisma: PrismaClient,
    private registry: ToolRegistryService,
    private mcp: McpClientService
  ) {}

  async executePlan(params: { commandId: string; planId: string; steps: StepDraft[] }) {
    const { commandId, planId, steps } = params;

    const run = await this.prisma.run.create({
      data: {
        commandId,
        planId,
        status: "PENDING",
        steps: {
          create: steps.map((s, index) => ({
            index,
            tool: s.tool,
            args: s.args,
            status: "PENDING"
          }))
        }
      },
      include: { steps: true }
    });

    const ordered = [...run.steps].sort((a, b) => a.index - b.index);
    const ctx: Record<string, any> = {};

    try {
      for (const stepRow of ordered) {
        const draft = steps[stepRow.index];
        await this.prisma.step.update({
          where: { runId_index: { runId: run.id, index: stepRow.index } },
          data: { status: "RUNNING" }
        });

        const tool = await this.registry.getToolByName(draft.tool);
        const args = JSON.parse(JSON.stringify(draft.args ?? {}));

        if (tool.argsSchema) {
          const v = validateArgs(tool.argsSchema, args);
          if (!v.ok) {
            await this.prisma.step.update({
              where: { runId_index: { runId: run.id, index: stepRow.index } },
              data: { status: "FAILED", error: v.error, finishedAt: new Date() }
            });
            throw new DomainError("BAD_ARGS", v.error, 400);
          }
        }

        const r = await this.mcp.execute(tool.server.baseUrl, tool.name, args, draft.timeoutMs);

        await this.prisma.step.update({
          where: { runId_index: { runId: run.id, index: stepRow.index } },
          data: { status: "SUCCESS", result: r?.result ?? r, finishedAt: new Date() }
        });

        ctx[`step${stepRow.index}`] = r?.result ?? r;
      }

      await this.prisma.run.update({
        where: { id: run.id },
        data: { status: "SUCCESS", finishedAt: new Date() }
      });

      return { ok: true, runId: run.id, status: "SUCCESS" };
    } catch (e: any) {
      await this.prisma.run.update({
        where: { id: run.id },
        data: { status: "FAILED", finishedAt: new Date() }
      });
      const message = e instanceof Error ? e.message : String(e);
      return { ok: false, runId: run.id, status: "FAILED", error: message };
    }
  }
}
