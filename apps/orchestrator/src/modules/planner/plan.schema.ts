import { z } from "zod";

export const PlanStepSchema = z.object({
  tool: z.string().min(1),
  args: z.record(z.any()).default({}),
  timeoutMs: z.number().int().positive().max(300000).optional(),
  idempotencyKey: z.string().min(8).optional()
});

export const PlanSchema = z.object({
  steps: z.array(PlanStepSchema).min(1)
});

export type PlanStep = z.infer<typeof PlanStepSchema>;
export type Plan = z.infer<typeof PlanSchema>;
