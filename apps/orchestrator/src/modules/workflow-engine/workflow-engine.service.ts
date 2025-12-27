import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ToolRepo } from "../tool-registry/repositories/tool.repo";
import { McpClientService } from "../mcp-client/mcp-client.service";

type PlanStep = { tool: string; args: any; timeoutMs?: number };

@Injectable()
export class WorkflowEngineService {
  constructor(
    private prisma: PrismaClient,
    private toolRepo: ToolRepo,
    private mcp: McpClientService
  ) {}

  async executePlan(input: { commandId: string; planId: string; steps: PlanStep[] }) {
    const { commandId, planId, steps } = input;

    const run = await this.prisma.run.create({
      data: {
        commandId,
        planId,
        status: "RUNNING",
        steps: {
          create: steps.map((s, index) => ({
            index,
            tool: s.tool,
            args: s.args ?? {},
            status: "PENDING"
          }))
        }
      },
      include: { steps: { orderBy: { index: "asc" } } }
    });

    try {
      const ctx: Record<string, any> = {};

      for (const step of run.steps) {
        await this.prisma.step.update({
          where: { id: step.id },
          data: { status: "RUNNING" }
        });

        const renderedArgs = this.renderArgs(step.args, ctx);

        const tool = await this.toolRepo.findToolByName(step.tool);
        if (!tool || !tool.server) {
          const msg = `TOOL_NOT_FOUND: ${step.tool}`;
          await this.prisma.step.update({
            where: { id: step.id },
            data: { status: "FAILED", error: msg, finishedAt: new Date() }
          });
          throw new Error(msg);
        }

        const res = await this.mcp.execute(tool.server.baseUrl, step.tool, renderedArgs);

        await this.prisma.step.update({
          where: { id: step.id },
          data: { status: "SUCCESS", result: res ?? null, finishedAt: new Date() }
        });

        ctx[`step${step.index}`] = res ?? null;
      }

      const finished = await this.prisma.run.update({
        where: { id: run.id },
        data: { status: "SUCCESS", finishedAt: new Date() },
        include: { steps: { orderBy: { index: "asc" } }, command: true }
      });

      return finished;
    } catch (e: any) {
      const finished = await this.prisma.run.update({
        where: { id: run.id },
        data: { status: "FAILED", finishedAt: new Date() },
        include: { steps: { orderBy: { index: "asc" } }, command: true }
      });
      return finished;
    }
  }

  private renderArgs(args: any, ctx: Record<string, any>): any {
    if (args == null) return args;

    if (typeof args === "string") {
      return args.replace(/\{\{\s*step(\d+)\.([a-zA-Z0-9_]+)\s*\}\}/g, (_, i, key) => {
        const v = ctx[`step${i}`]?.[key];
        return v == null ? "" : String(v);
      });
    }

    if (Array.isArray(args)) return args.map((v) => this.renderArgs(v, ctx));

    if (typeof args === "object") {
      const out: any = {};
      for (const [k, v] of Object.entries(args)) out[k] = this.renderArgs(v, ctx);
      return out;
    }

    return args;
  }
}
