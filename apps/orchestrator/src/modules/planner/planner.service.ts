import { Injectable } from "@nestjs/common";
import type { CommandSpec } from "../interpreter/command-spec";
import { ToolRegistryService } from "../tool-registry/tool-registry.service";
import { AnthropicService } from "./llm/anthropic.service";
import { PlanSchema, type Plan } from "./plan.schema";

function defaultPlan(spec: CommandSpec): Plan {
  const name = spec.entities.name || "신규입사자";
  return PlanSchema.parse({
    steps: [
      { tool: "hr.generate_employee_id", args: { name } },
      {
        tool: "hr.create_employee_account",
        args: {
          employeeId: "{{step0.employeeId}}",
          name,
          dept: spec.entities.dept,
          startDate: spec.entities.start,
          salary: spec.entities.salaryWon,
          bankAccountToken: spec.entities.bankAccountToken
        },
        timeoutMs: 15000
      }
    ]
  });
}

@Injectable()
export class PlannerService {
  constructor(private registry: ToolRegistryService, private llm: AnthropicService) {}

  async build(spec: CommandSpec): Promise<Plan> {
    const tools = await this.registry.list();
    const catalog = tools.tools.map(t => ({
      name: t.name,
      description: t.description,
      riskLevel: t.riskLevel,
      requiredRoles: t.requiredRoles,
      piiFields: t.piiFields,
      argsSchema: t.argsSchema
    }));

    const planJson = await this.llm.planJSON({ spec, toolCatalog: catalog });
    if (!planJson) return defaultPlan(spec);

    // allowlist: filter to known tool names only
    const allowed = new Set(catalog.map(t => t.name));
    const sanitized = {
      steps: Array.isArray(planJson.steps)
        ? planJson.steps.filter((s: any) => s && typeof s.tool === "string" && allowed.has(s.tool)).map((s: any) => ({
            tool: s.tool,
            args: s.args && typeof s.args === "object" ? s.args : {},
            timeoutMs: typeof s.timeoutMs === "number" ? s.timeoutMs : undefined
          }))
        : []
    };

    if (sanitized.steps.length === 0) return defaultPlan(spec);
    return PlanSchema.parse(sanitized);
  }
}
