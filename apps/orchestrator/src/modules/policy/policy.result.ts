export type PolicyDecision = "ALLOWED" | "NEEDS_APPROVAL" | "DENIED";

export type PolicyResult = {
  decision: PolicyDecision;
  reasons: string[];
};
