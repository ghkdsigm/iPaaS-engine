import { EnvSchema, type Env } from "./env.validation";

export function config() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = JSON.stringify(parsed.error.flatten(), null, 2);
    throw new Error(`Invalid environment variables: ${msg}`);
  }
  const env: Env = parsed.data;
  return {
    env
  };
}
