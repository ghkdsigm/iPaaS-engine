export function roleCheckRule(
  steps: Array<{ tool: string; requiredRoles?: string[] }>,
  userRoles: string[]
) {
  for (const s of steps) {
    const required = Array.isArray(s.requiredRoles) ? s.requiredRoles : [];
    if (required.length === 0) continue;
    const ok = required.some(r => userRoles.includes(r));
    if (!ok) return { allowed: false, reason: `Missing required role for ${s.tool}: ${required.join(", ")}` };
  }
  return { allowed: true };
}
