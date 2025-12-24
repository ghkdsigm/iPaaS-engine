export function validateArgs(schema: any, args: any): { ok: boolean; error?: string } {
  // Minimal placeholder: real implementation should validate JSON Schema (ajv recommended)
  if (!schema) return { ok: true };
  return { ok: true };
}
