import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { InterpreterService } from "../interpreter/interpreter.service";
import { PlannerService } from "../planner/planner.service";
import { PolicyEngineService } from "../policy/policy-engine.service";
import { ToolRegistryService } from "../tool-registry/tool-registry.service";
import { WorkflowEngineService } from "../workflow-engine/workflow-engine.service";
import { maskBankAccount } from "../../common/utils/mask";
import * as crypto from "crypto";

function hashIdempotency(raw: string) {
  const normalized = raw.trim().replace(/\s+/g, " ");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

@Injectable()
export class CommandService {
  constructor(
    private prisma: PrismaClient,
    private interpreter: InterpreterService,
    private planner: PlannerService,
    private policy: PolicyEngineService,
    private registry: ToolRegistryService,
    private workflow: WorkflowEngineService
  ) {}

  private async audit(type: string, meta: any) {
    try {
      await this.prisma.auditEvent.create({ data: { type, meta } });
    } catch {}
  }

  async create(command: string, providedIdempotencyKey?: string) {
    const idempotencyKey = providedIdempotencyKey || hashIdempotency(command);

    const existing = await this.prisma.command.findFirst({
      where: { idempotencyKey },
      include: { plan: true, runs: { orderBy: { createdAt: "desc" }, take: 1 } }
    });

    if (existing) {
      await this.audit("COMMAND_DEDUPED", { commandId: existing.id, idempotencyKey });
      const latestRun = existing.runs?.[0];
      if (latestRun?.status === "SUCCESS") {
        return { ok: true, status: "ALREADY_EXECUTED", commandId: existing.id, planId: existing.plan?.id, runId: latestRun.id };
      }
      return { ok: true, status: "REUSED", commandId: existing.id, planId: existing.plan?.id, runId: latestRun?.id || null };
    }

    const cmd = await this.prisma.command.create({ data: { raw: command, idempotencyKey } });
    await this.audit("COMMAND_CREATED", { commandId: cmd.id, idempotencyKey });

    await this.registry.ensureServer("hr");
    await this.registry.sync("hr");

    const spec = await this.interpreter.interpret(command);
    const plan = await this.planner.build(spec);

    // enrich steps with tool metadata for policy evaluation
    const metas = [];
    for (const s of plan.steps) {
      const t = await this.registry.getToolByName(s.tool);
      metas.push({ tool: s.tool, args: s.args, riskLevel: t.riskLevel, requiredRoles: t.requiredRoles, piiFields: t.piiFields });
    }

    const policy = this.policy.evaluate({ spec, steps: metas, userRoles: ["hr"] });

    const planRow = await this.prisma.plan.create({
      data: { commandId: cmd.id, steps: plan.steps as any, needsApproval: policy.needsApproval }
    });

    await this.audit("PLAN_CREATED", { commandId: cmd.id, planId: planRow.id, needsApproval: policy.needsApproval });

    if (!policy.allowed) {
      await this.audit("PLAN_DENIED", { commandId: cmd.id, planId: planRow.id, reason: policy.reason });
      return { ok: false, status: "DENIED", commandId: cmd.id, planId: planRow.id, reason: policy.reason };
    }

    if (policy.needsApproval) {
      const approval = await this.prisma.approval.create({
        data: { planId: planRow.id, status: "PENDING", reason: policy.reason || "Approval required" }
      });
      await this.audit("APPROVAL_CREATED", { approvalId: approval.id, planId: planRow.id });
      return {
        ok: true,
        status: "NEEDS_APPROVAL",
        commandId: cmd.id,
        planId: planRow.id,
        approvalId: approval.id,
        maskedCommand: maskBankAccount(command),
        steps: plan.steps
      };
    }

    const exec = await this.workflow.execute(cmd.id, planRow.id, plan.steps, t => this.interpreter.resolvePii(t));
    return { ok: true, status: "EXECUTED", runId: exec.runId, commandId: cmd.id, planId: planRow.id };
  }
}
