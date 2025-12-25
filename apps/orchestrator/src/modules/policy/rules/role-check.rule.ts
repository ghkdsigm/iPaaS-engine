export function roleCheckRule(user: { roles: string[] } | null, step: { requiredRoles?: string[] }) {
  const required = step.requiredRoles || [];
  if (required.length === 0) return { ok: true };
  const roles = user?.roles || [];
  const ok = required.some((r) => roles.includes(r));
  return ok ? { ok: true } : { ok: false, reason: `Missing roles: ${required.join(", ")}` };
}
