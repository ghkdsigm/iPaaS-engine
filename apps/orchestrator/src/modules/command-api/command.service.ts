import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { EventInterpreterService } from "../eventing/event-interpreter.service";
import { EventPlannerService } from "../event-planner/event-planner.service";
import { PolicyEngineService } from "../policy/policy-engine.service";
import { ToolRegistryService } from "../tool-registry/tool-registry.service";
import { WorkflowEngineService } from "../workflow-engine/workflow-engine.service";

@Injectable()
export class CommandService {
  constructor(
    private prisma: PrismaClient,
    private toolRegistry: ToolRegistryService,
    private eventInterpreter: EventInterpreterService,
    private eventPlanner: EventPlannerService,
    private policy: PolicyEngineService,
    private workflow: WorkflowEngineService
  ) {}

  async create(raw: string, idempotencyKey?: string) {
    const existing = idempotencyKey ? await this.prisma.command.findUnique({ where: { idempotencyKey } }) : null;

    const command =
      existing ??
      (await this.prisma.command.create({
        data: { raw, idempotencyKey: idempotencyKey || null }
      }));

    await this.toolRegistry.ensureSeeded();

    const parsed = this.eventInterpreter.parse(raw);

    if (!parsed.events || parsed.events.length === 0) {
      return {
        ok: false,
        commandId: command.id,
        reason: "No intent detected",
        missingArgs: [],
        missingTools: [],
        preview: [],
        piiTokens: parsed.piiTokens ?? []
      };
    }

    const planBuild = await this.eventPlanner.build(parsed.events);
    if (!planBuild.ok) {
      return {
        ok: false,
        commandId: command.id,
        reason: planBuild.reason,
        missingArgs: planBuild.missingArgs ?? [],
        missingTools: planBuild.missingTools ?? [],
        preview: planBuild.preview ?? [],
        diffs: planBuild.diffs ?? [],
        piiTokens: parsed.piiTokens ?? []
      };
    }

    const steps = planBuild.steps;

    const meta = await this.toolRegistry.getStepMetas(steps.map((s) => ({ tool: s.tool, args: s.args })));
    const policyResult = this.policy.evaluate({
      steps: meta,
      userRoles: ["ADMIN"]
    });

    const plan = await this.prisma.plan.create({
      data: {
        commandId: command.id,
        steps: steps as any,
        preview: (planBuild.preview ?? null) as any,
        diff: (planBuild.diffs ?? null) as any,
        needsApproval: policyResult.needsApproval
      }
    });

    if (!policyResult.allowed) {
      return {
        ok: false,
        commandId: command.id,
        planId: plan.id,
        reason: policyResult.reason || "Policy denied",
        preview: planBuild.preview ?? [],
        diffs: planBuild.diffs ?? [],
        piiTokens: parsed.piiTokens ?? []
      };
    }

    if (policyResult.needsApproval) {
      const approval = await this.prisma.approval.create({
        data: {
          planId: plan.id,
          status: "PENDING"
        }
      });

      return {
        ok: true,
        commandId: command.id,
        planId: plan.id,
        status: "NEEDS_APPROVAL",
        approvalId: approval.id,
        preview: planBuild.preview ?? [],
        diffs: planBuild.diffs ?? [],
        piiTokens: parsed.piiTokens ?? []
      };
    }

    const run = await this.workflow.executePlan({
      commandId: command.id,
      planId: plan.id,
      steps
    });

    return {
      ok: true,
      commandId: command.id,
      planId: plan.id,
      status: "RUNNING",
      runId: run.id,
      piiTokens: parsed.piiTokens ?? []
    };
  }
}
