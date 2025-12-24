import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { InterpreterService } from "../interpreter/interpreter.service";
import { PlannerService } from "../planner/planner.service";
import { PolicyEngineService } from "../policy/policy-engine.service";
import { ToolRegistryService } from "../tool-registry/tool-registry.service";
import { WorkflowEngineService } from "../workflow-engine/workflow-engine.service";
import { maskBankAccount } from "../../common/utils/mask";

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

  async create(command: string) {
    const cmd = await this.prisma.command.create({ data: { raw: command } });

    await this.registry.ensureServer("hr");
    await this.registry.sync("hr");

    const spec = this.interpreter.interpret(command);
    const plan = this.planner.build(spec);
    const policy = this.policy.evaluate(spec);

    const planRow = await this.prisma.plan.create({ data: { commandId: cmd.id, steps: plan.steps as any, needsApproval: policy.needsApproval } });

    if (policy.needsApproval) {
      const approval = await this.prisma.approval.create({ data: { planId: planRow.id, status: "PENDING", reason: policy.reason || "Approval required" } });
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

    const exec = await this.workflow.execute(cmd.id, planRow.id, plan.steps, (t) => this.interpreter.resolvePii(t));
    return { ok: true, status: "EXECUTED", runId: exec.runId, commandId: cmd.id, planId: planRow.id };
  }
}
