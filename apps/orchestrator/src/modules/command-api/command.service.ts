import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { InterpreterService } from "../interpreter/interpreter.service";
import { PlannerService } from "../planner/planner.service";
import { PolicyEngineService } from "../policy/policy-engine.service";
import { ToolRegistryService } from "../tool-registry/tool-registry.service";
import { WorkflowEngineService } from "../workflow-engine/workflow-engine.service";
import { maskBankAccount } from "../../common/utils/mask";
import { makeIdempotencyKey } from "../../common/utils/idempotency";
import { AuditService } from "../../common/logging/audit.service";
import { PlanSchema } from "../planner/plan.schema";
import { DomainError } from "../../common/errors/domain.error";

@Injectable()
export class CommandService {
  constructor(
    private prisma: PrismaClient,
    private interpreter: InterpreterService,
    private planner: PlannerService,
    private policy: PolicyEngineService,
    private registry: ToolRegistryService,
    private workflow: WorkflowEngineService,
    private audit: AuditService
  ) {}

  async create(command: string, actorId: string | null = null, userRoles: string[] = []) {
    const idem = makeIdempotencyKey(command);

    // Idempotency: 같은 입력은 동일 Command를 재사용
    const existing = await this.prisma.command.findUnique({
      where: { idempotencyKey: idem },
      include: { plan: { include: { approval: true } }, runs: true }
    });

    if (existing) {
      await this.audit.record({
        type: "COMMAND_IDEMPOTENT_REUSED",
        actorId,
        commandId: existing.id,
        planId: existing.plan?.id || null,
        payload: { idempotencyKey: idem }
      });

      const latestRun = [...existing.runs].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))[0];
      if (latestRun?.status === "SUCCESS") {
        return { ok: true, status: "ALREADY_EXECUTED", commandId: existing.id, planId: existing.plan?.id, runId: latestRun.id, maskedCommand: existing.maskedRaw };
      }
      if (existing.plan?.approval?.status === "PENDING") {
        return { ok: true, status: "NEEDS_APPROVAL", commandId: existing.id, planId: existing.plan.id, approvalId: existing.plan.approval.id, maskedCommand: existing.maskedRaw, steps: (existing.plan.steps as any)?.steps || existing.plan.steps };
      }
      return { ok: true, status: "REUSED", commandId: existing.id, planId: existing.plan?.id, maskedCommand: existing.maskedRaw };
    }

    const masked = maskBankAccount(command);
    const cmd = await this.prisma.command.create({
      data: { raw: command, maskedRaw: masked, idempotencyKey: idem, actorId }
    });

    await this.audit.record({ type: "COMMAND_RECEIVED", actorId, commandId: cmd.id, payload: { maskedRaw: masked } });

    // Tool registry sync (MVP: hr only)
    await this.registry.ensureServer("hr");
    await this.registry.sync("hr");

    const spec = await this.interpreter.interpret(command);
    await this.audit.record({ type: "SPEC_INTERPRETED", actorId, commandId: cmd.id, payload: { intent: spec.intent, entities: spec.entities, unknownFields: spec.unknownFields, confidence: spec.confidence } });

    const plan = this.planner.build(spec);
    const validatedPlan = PlanSchema.parse(plan);

    const policy = this.policy.evaluate({ spec, planSteps: validatedPlan.steps, user: { roles: userRoles } });
    await this.audit.record({ type: "POLICY_EVALUATED", actorId, commandId: cmd.id, payload: policy });

    if (policy.decision === "DENIED") {
      throw new DomainError("POLICY_DENIED", policy.reasons.join(" | "), 403);
    }

    const planRow = await this.prisma.plan.create({
      data: {
        commandId: cmd.id,
        steps: validatedPlan as any,
        needsApproval: policy.decision === "NEEDS_APPROVAL"
      }
    });

    await this.audit.record({ type: "PLAN_CREATED", actorId, commandId: cmd.id, planId: planRow.id, payload: { steps: validatedPlan.steps.map(s => ({ tool: s.tool, risk: s.riskLevel })) } });

    if (policy.decision === "NEEDS_APPROVAL") {
      const approval = await this.prisma.approval.create({
        data: { planId: planRow.id, status: "PENDING", reason: policy.reasons.join(" | ") || "Approval required" }
      });
      await this.audit.record({ type: "APPROVAL_CREATED", actorId, commandId: cmd.id, planId: planRow.id, payload: { approvalId: approval.id, reason: approval.reason } });

      return {
        ok: true,
        status: "NEEDS_APPROVAL",
        commandId: cmd.id,
        planId: planRow.id,
        approvalId: approval.id,
        maskedCommand: masked,
        steps: validatedPlan.steps
      };
    }

    const exec = await this.workflow.executeOrResume({
      actorId,
      commandId: cmd.id,
      planId: planRow.id,
      steps: validatedPlan.steps,
      piiResolver: (t) => this.interpreter.resolvePii(t)
    });

    return { ok: true, status: "EXECUTED", runId: exec.runId, commandId: cmd.id, planId: planRow.id };
  }
}
