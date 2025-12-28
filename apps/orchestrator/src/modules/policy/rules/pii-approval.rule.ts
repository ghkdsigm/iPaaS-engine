type StepMetaLike = {
  tool?: string;
  args?: any;
  piiFields?: string[];
};

function hasValue(v: any) {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return true;
}

function looksLikeBankAccountToken(s: string) {
  return /\d{2,}-\d{2,}-\d{4,}/.test(s);
}

export function piiApprovalRule(input: { steps?: StepMetaLike[]; piiTokens?: string[] } | StepMetaLike[]) {
  const steps: StepMetaLike[] = Array.isArray(input) ? input : Array.isArray(input.steps) ? input.steps : [];
  const piiTokens: string[] = Array.isArray(input) ? [] : Array.isArray(input.piiTokens) ? input.piiTokens : [];

  if (piiTokens.length > 0) {
    return { needsApproval: true, reason: "PII tokens detected" };
  }

  for (const s of steps) {
    const fields = Array.isArray(s.piiFields) ? s.piiFields : [];
    if (fields.length === 0) continue;

    for (const f of fields) {
      const v = s.args?.[f];
      if (hasValue(v)) return { needsApproval: true, reason: `PII field '${f}' present in ${s.tool ?? "step"}` };
    }
  }

  for (const s of steps) {
    const args = s.args;
    if (!args || typeof args !== "object") continue;

    for (const v of Object.values(args)) {
      if (typeof v === "string" && looksLikeBankAccountToken(v)) {
        return { needsApproval: true, reason: `Possible bank account token in args of ${s.tool ?? "step"}` };
      }
      if (Array.isArray(v) && v.some((x) => typeof x === "string" && looksLikeBankAccountToken(x))) {
        return { needsApproval: true, reason: `Possible bank account token in args of ${s.tool ?? "step"}` };
      }
    }
  }

  return { needsApproval: false };
}
