import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { WorkflowEngineService } from "../workflow-engine/workflow-engine.service";

@Injectable()
export class ApprovalsService {
  constructor(private prisma: PrismaClient, private workflow: WorkflowEngineService) {}

  async list() {
    const approvals = await this.prisma.approval.findMany({
      orderBy: { createdAt: "desc" },
      include: { plan: { include: { command: true } } }
    });

    return {
      ok: true,
      approvals: approvals.map((a) => ({
        id: a.id,
        status: a.status,
        reason: a.reason,
        createdAt: a.createdAt,
        resolvedAt: a.resolvedAt,
        planId: a.planId,
        command: { id: a.plan.command.id, raw: a.plan.command.raw, createdAt: a.plan.command.createdAt },
        preview: a.plan.preview ?? null,
        diff: a.plan.diff ?? null,
        steps: a.plan.steps
      }))
    };
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

    const steps = (approval.plan.steps as any[]) || [];
    const run = await this.workflow.executePlan({ commandId: approval.plan.commandId, planId: approval.planId, steps });

    return { ok: true, approvalId: id, run };
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