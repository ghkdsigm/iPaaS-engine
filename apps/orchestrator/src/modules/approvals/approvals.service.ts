import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { WorkflowEngineService } from "../workflow-engine/workflow-engine.service";
import { ToolRegistryService } from "../tool-registry/tool-registry.service";
import { InterpreterService } from "../interpreter/interpreter.service";

@Injectable()
export class ApprovalsService {
  constructor(
    private prisma: PrismaClient,
    private workflow: WorkflowEngineService,
    private registry: ToolRegistryService,
    private interpreter: InterpreterService
  ) {}

  async list() {
    const approvals = await this.prisma.approval.findMany({
      orderBy: { createdAt: "desc" },
      include: { plan: { include: { command: true } } }
    });
    return { approvals };
  }

  async approve(id: string) {
    const approval = await this.prisma.approval.findUnique({
      where: { id },
      include: { plan: { include: { command: true } } }
    });
    if (!approval) return { ok: false, error: "NOT_FOUND" };
    if (approval.status !== "PENDING") return { ok: true, status: approval.status };

    await this.prisma.approval.update({
      where: { id },
      data: { status: "APPROVED", resolvedAt: new Date() }
    });

    await this.registry.ensureServer("hr");
    await this.registry.sync("hr");

    const steps = approval.plan.steps as any[];
    const exec = await this.workflow.execute(approval.plan.commandId, approval.planId, steps, t => this.interpreter.resolvePii(t));
    return { ok: true, runId: exec.runId };
  }

  async reject(id: string) {
    const approval = await this.prisma.approval.findUnique({ where: { id } });
    if (!approval) return { ok: false, error: "NOT_FOUND" };
    if (approval.status !== "PENDING") return { ok: true, status: approval.status };

    await this.prisma.approval.update({
      where: { id },
      data: { status: "REJECTED", resolvedAt: new Date() }
    });
    return { ok: true };
  }
}
