export function externalSendRule(step: { tool: string; riskLevel?: string }) {
  // 매우 단순한 예: mail.send / slack.post / external.* 등을 외부 전송으로 간주
  const isExternal = /(^external\.|mail\.|slack\.|notify\.)/i.test(step.tool);
  if (!isExternal) return { ok: true };
  return { ok: false, reason: "External send requires explicit approval/policy allow" };
}
