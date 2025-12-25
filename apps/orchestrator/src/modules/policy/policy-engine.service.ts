import { Injectable } from "@nestjs/common";
import type { PolicyResult } from "./policy.result";
import { piiApprovalRule } from "./rules/pii-approval.rule";
import { externalSendRule } from "./rules/external-send.rule";
import { roleCheckRule } from "./rules/role-check.rule";

@Injectable()
export class PolicyEngineService {
  evaluate(input: {
    spec: any;
    planSteps: any[];
    user?: { roles: string[] } | null;
  }): PolicyResult {
    const reasons: string[] = [];

    // PII/급여 등 민감 정보가 있으면 승인 필요
    const pii = piiApprovalRule(input.spec);
    if (pii.needsApproval) reasons.push(pii.reason || "PII detected");

    // 외부 전송 step은 기본적으로 금지(또는 승인 필요) - 여기선 DENIED로 둠
    for (const s of input.planSteps || []) {
      const ext = externalSendRule(s);
      if (!ext.ok) reasons.push(ext.reason || "External send blocked");
      const role = roleCheckRule(input.user || null, s);
      if (!role.ok) reasons.push(role.reason || "Role check failed");
      if ((s.riskLevel || "").toUpperCase() === "HIGH") reasons.push(`High risk step: ${s.tool}`);
    }

    const hasExternalBlock = reasons.some((r) => r.toLowerCase().includes("external send"));
    if (hasExternalBlock) return { decision: "DENIED", reasons };

    if (reasons.length > 0) return { decision: "NEEDS_APPROVAL", reasons };

    return { decision: "ALLOWED", reasons: [] };
  }
}
