type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: any[];
};

function typeOk(expected: string | undefined, v: any) {
  if (!expected) return true;
  if (expected === "string") return typeof v === "string";
  if (expected === "number") return typeof v === "number" && Number.isFinite(v);
  if (expected === "integer") return typeof v === "number" && Number.isInteger(v);
  if (expected === "boolean") return typeof v === "boolean";
  if (expected === "object") return typeof v === "object" && v !== null && !Array.isArray(v);
  if (expected === "array") return Array.isArray(v);
  return true;
}

export function validateArgs(schema: any, args: any): { ok: boolean; error?: string } {
  if (!schema) return { ok: true };

  const s = schema as JsonSchema;
  if (s.type && !typeOk(s.type, args)) return { ok: false, error: `Expected ${s.type}` };

  if (s.enum && !s.enum.includes(args)) return { ok: false, error: `Value not in enum` };

  if (s.type === "object") {
    const req = s.required || [];
    for (const k of req) {
      if (args?.[k] === undefined) return { ok: false, error: `Missing required: ${k}` };
    }
    const props = s.properties || {};
    for (const [k, ps] of Object.entries(props)) {
      if (args?.[k] === undefined) continue;
      if (ps.type && !typeOk(ps.type, args[k])) return { ok: false, error: `Invalid type for ${k}` };
      if (ps.enum && !ps.enum.includes(args[k])) return { ok: false, error: `Invalid enum for ${k}` };
    }
  }

  return { ok: true };
}
