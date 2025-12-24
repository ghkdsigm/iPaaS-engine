import { z } from "zod";

export const EnvSchema = z.object({
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  HR_MCP_BASE_URL: z.string().default("http://localhost:4001"),
  JWT_SECRET: z.string().min(8).default("dev_secret_change_me")
});

export type Env = z.infer<typeof EnvSchema>;
