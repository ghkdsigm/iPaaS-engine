export type PlanStep = { tool: string; args: Record<string, any> };
export type Plan = { steps: PlanStep[] };
