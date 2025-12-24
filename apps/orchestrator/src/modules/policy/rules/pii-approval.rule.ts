export function piiApprovalRule(spec: any) {
  const hasBank = !!spec.entities?.bankAccountToken;
  const hasSalary = typeof spec.entities?.salaryWon === "number";
  if (hasBank || hasSalary) {
    return { needsApproval: true, reason: "PII/Salary detected" };
  }
  return { needsApproval: false };
}
