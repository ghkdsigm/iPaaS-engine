import { Injectable } from "@nestjs/common";
import type { PolicyResult } from "./policy.result";
import { piiApprovalRule } from "./rules/pii-approval.rule";

@Injectable()
export class PolicyEngineService {
  evaluate(spec: any): PolicyResult {
    const pii = piiApprovalRule(spec);
    if (pii.needsApproval) return { allowed: true, needsApproval: true, reason: pii.reason };
    return { allowed: true, needsApproval: false };
  }
}
