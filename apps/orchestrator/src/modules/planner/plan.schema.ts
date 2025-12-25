import { z } from "zod";

export const PlanStepSchema = z.object({
  tool: z.string().min(3),
  args: z.record(z.any()),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).default("LOW"),
  timeoutMs: z.number().int().positive().max(120000).default(30000),
  idempotencyKey: z.string().min(8).optional(),
  expected: z.string().optional()
});

export const PlanSchema = z.object({
  version: z.literal(1),
  steps: z.array(PlanStepSchema).min(1),
  notes: z.string().optional()
});

export type PlanStep = z.infer<typeof PlanStepSchema>;
export type Plan = z.infer<typeof PlanSchema>;
