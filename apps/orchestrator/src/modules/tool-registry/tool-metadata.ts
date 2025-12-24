export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type ToolMetadata = {
  name: string;
  description?: string;
  riskLevel?: RiskLevel;
  requiredRoles?: string[];
  piiFields?: string[];
};
