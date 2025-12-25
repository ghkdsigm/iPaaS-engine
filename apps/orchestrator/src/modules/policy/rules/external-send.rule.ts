export function externalSendRule(steps: Array<{ tool: string }>) {
  const deniedPrefixes = ["external.", "mail.", "slack."];
  const denied = steps.find(s => deniedPrefixes.some(p => s.tool.startsWith(p)));
  if (denied) return { allowed: false, reason: `External send is denied by default: ${denied.tool}` };
  return { allowed: true };
}
