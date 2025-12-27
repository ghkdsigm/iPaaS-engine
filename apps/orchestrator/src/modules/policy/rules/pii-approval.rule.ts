export function piiApprovalRule(spec: any) {
  // 구버전(entities) + 신버전(events/piiTokens) 모두 지원
  const hasBank = !!spec?.entities?.bankAccountToken || !!spec?.piiTokens?.bankAccount;
  const hasSalary = typeof spec?.entities?.salaryWon === "number";

  const payrollAmount = Array.isArray(spec?.events)
    ? spec.events.some((e: any) => e?.type === "payroll.pay" && typeof e?.slots?.amountWon === "number")
    : false;

  if (hasBank || hasSalary || payrollAmount) {
    return { needsApproval: true, reason: "PII/급여 정보 포함" };
  }

  return { needsApproval: false };
}
