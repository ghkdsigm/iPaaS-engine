import { Injectable } from "@nestjs/common";
import type { PolicyResult } from "./policy.result";
import { piiApprovalRule } from "./rules/pii-approval.rule";
import { roleCheckRule } from "./rules/role-check.rule";
import { externalSendRule } from "./rules/external-send.rule";

type StepMeta = {
  tool: string;
  args: any;
  riskLevel?: string | null;
  requiredRoles?: string[];
  piiFields?: string[];
};

@Injectable()
export class PolicyEngineService {
  evaluate(input: { spec: any; steps: StepMeta[]; userRoles: string[] }): PolicyResult {
    const pii = piiApprovalRule(input.spec);
    if (pii.needsApproval) return { allowed: true, needsApproval: true, reason: pii.reason };

    const ext = externalSendRule(input.steps);
    if (!ext.allowed) return { allowed: false, needsApproval: false, reason: ext.reason };

    const role = roleCheckRule(input.steps, input.userRoles);
    if (!role.allowed) return { allowed: false, needsApproval: false, reason: role.reason };

    const hasHighRisk = input.steps.some(s => (s.riskLevel || "LOW") === "HIGH");
    const hasMediumRisk = input.steps.some(s => (s.riskLevel || "LOW") === "MEDIUM");
    if (hasHighRisk || hasMediumRisk) {
      return { allowed: true, needsApproval: true, reason: "Risky operation requires approval" };
    }

    return { allowed: true, needsApproval: false };
  }
}
