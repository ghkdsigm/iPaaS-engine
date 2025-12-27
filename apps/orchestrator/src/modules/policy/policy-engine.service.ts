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
  evaluate(input: { steps: StepMeta[]; userRoles: string[] }): PolicyResult {
    // 1) external send / exfil prevention (if present in args/tool)
    const ext = externalSendRule(input.steps);
    if (!ext.allowed) return { allowed: false, needsApproval: false, reason: ext.reason };

    // 2) role check
    const role = roleCheckRule(input.steps, input.userRoles);
    if (!role.allowed) return { allowed: false, needsApproval: false, reason: role.reason };

    // 3) PII approval gate
    const pii = piiApprovalRule(input.steps);
    if (pii.needsApproval) {
      return { allowed: true, needsApproval: true, reason: pii.reason };
    }

    // 4) risk-level gate (MEDIUM/HIGH -> approval)
    const hasHighRisk = input.steps.some((s) => (s.riskLevel || "LOW") === "HIGH");
    const hasMediumRisk = input.steps.some((s) => (s.riskLevel || "LOW") === "MEDIUM");
    if (hasHighRisk || hasMediumRisk) {
      return { allowed: true, needsApproval: true, reason: "Risky operation requires approval" };
    }

    return { allowed: true, needsApproval: false };
  }
}
