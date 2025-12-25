import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { WorkflowEngineService } from "../workflow-engine/workflow-engine.service";
import { ToolRegistryService } from "../tool-registry/tool-registry.service";
import { InterpreterService } from "../interpreter/interpreter.service";
import { AuditService } from "../../common/logging/audit.service";
import { PlanSchema } from "../planner/plan.schema";

@Injectable()
export class ApprovalsService {
  constructor(
    private prisma: PrismaClient,
    private workflow: WorkflowEngineService,
    private registry: ToolRegistryService,
    private interpreter: InterpreterService,
    private audit: AuditService
  ) {}

  async list() {
    const approvals = await this.prisma.approval.findMany({
      orderBy: { createdAt: "desc" },
      include: { plan: { include: { command: true } } }
    });

    return {
      approvals: approvals.map((a) => ({
        id: a.id,
        status: a.status,
        reason: a.reason,
        createdAt: a.createdAt,
        resolvedAt: a.resolvedAt,
        planId: a.planId,
        commandId: a.plan.commandId,
        maskedCommand: a.plan.command.maskedRaw
      }))
    };
  }

  async approve(id: string, actorId: string | null = null) {
    const approval = await this.prisma.approval.findUnique({
      where: { id },
      include: { plan: { include: { command: true } } }
    });
    if (!approval) return { ok: false };
    if (approval.status !== "PENDING") return { ok: true, status: approval.status };

    await this.prisma.approval.update({
      where: { id },
      data: { status: "APPROVED", resolvedAt: new Date() }
    });

    await this.audit.record({
      type: "APPROVAL_RESOLVED",
      actorId,
      commandId: approval.plan.commandId,
      planId: approval.planId,
      payload: { approvalId: id, status: "APPROVED" }
    });

    await this.registry.sync("hr");

    const parsed = PlanSchema.parse(approval.plan.steps as any);
    const exec = await this.workflow.executeOrResume({
      actorId,
      commandId: approval.plan.commandId,
      planId: approval.planId,
      steps: parsed.steps,
      piiResolver: (t) => this.interpreter.resolvePii(t)
    });

    return { ok: true, runId: exec.runId };
  }

  async reject(id: string, actorId: string | null = null, reason: string = "Rejected") {
    const approval = await this.prisma.approval.findUnique({
      where: { id },
      include: { plan: true }
    });

    await this.prisma.approval.update({
      where: { id },
      data: { status: "REJECTED", resolvedAt: new Date(), reason }
    });

    await this.audit.record({
      type: "APPROVAL_RESOLVED",
      actorId,
      commandId: approval?.plan.commandId || null,
      planId: approval?.planId || null,
      payload: { approvalId: id, status: "REJECTED", reason }
    });

    return { ok: true };
  }
}
