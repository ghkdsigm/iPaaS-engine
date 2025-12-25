import Ajv, { type ErrorObject } from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  coerceTypes: true,
  removeAdditional: false
});
addFormats(ajv);

const compiled = new Map<string, ReturnType<Ajv["compile"]>>();

function stableKey(schema: any) {
  try {
    return JSON.stringify(schema);
  } catch {
    return String(schema);
  }
}

function formatErrors(errors: ErrorObject[] | null | undefined) {
  if (!errors || errors.length === 0) return "Invalid arguments";
  return errors
    .slice(0, 10)
    .map((e) => {
      const path = e.instancePath || "(root)";
      const msg = e.message || "invalid";
      return `${path}: ${msg}`;
    })
    .join("; ");
}

export function validateArgs(schema: any, args: any): { ok: boolean; error?: string } {
  if (!schema) return { ok: true };

  let jsonSchema = schema;
  if (typeof schema === "string") {
    try {
      jsonSchema = JSON.parse(schema);
    } catch {
      return { ok: false, error: "argsSchema is not valid JSON" };
    }
  }

  const key = stableKey(jsonSchema);
  let validate = compiled.get(key);
  if (!validate) {
    try {
      validate = ajv.compile(jsonSchema);
      compiled.set(key, validate);
    } catch (e: any) {
      return { ok: false, error: `argsSchema compile failed: ${e?.message || String(e)}` };
    }
  }

  const ok = validate(args) as boolean;
  if (!ok) return { ok: false, error: formatErrors(validate.errors) };
  return { ok: true };
}
