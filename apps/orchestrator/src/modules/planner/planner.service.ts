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

function isPlainObject(v: any): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function mergeArgs(fallback: any, incoming: any) {
  if (!isPlainObject(fallback) && !isPlainObject(incoming)) return incoming ?? fallback ?? {};
  if (!isPlainObject(fallback)) return incoming ?? {};
  if (!isPlainObject(incoming)) return fallback ?? {};
  return { ...fallback, ...incoming };
}

function fillMissingArgsWithFallback(sanitized: any, fallback: Plan) {
  if (!sanitized?.steps || !Array.isArray(sanitized.steps)) return fallback;

  const fallbackByTool = new Map<string, any>();
  fallback.steps.forEach((s, idx) => {
    fallbackByTool.set(`${s.tool}__${idx}`, s);
  });

  const mergedSteps = sanitized.steps.map((s: any, idx: number) => {
    const fb = fallback.steps[idx] || fallbackByTool.get(`${s.tool}__${idx}`) || null;

    const incomingArgs = isPlainObject(s.args) ? s.args : {};
    const hasAnyArg = Object.keys(incomingArgs).length > 0;

    if (!fb) {
      return {
        tool: s.tool,
        args: hasAnyArg ? incomingArgs : {},
        timeoutMs: typeof s.timeoutMs === "number" ? s.timeoutMs : undefined
      };
    }

    const merged = mergeArgs(fb.args, incomingArgs);

    return {
      tool: s.tool,
      args: merged,
      timeoutMs: typeof s.timeoutMs === "number" ? s.timeoutMs : fb.timeoutMs
    };
  });

  return PlanSchema.parse({ steps: mergedSteps });
}

@Injectable()
export class PlannerService {
  constructor(
    private registry: ToolRegistryService,
    private llm: AnthropicService
  ) {}

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

    const fallback = defaultPlan(spec);

    const planJson = await this.llm.planJSON({ spec, toolCatalog: catalog });
    if (!planJson) return fallback;

    const allowed = new Set(catalog.map(t => t.name));

    const sanitized = {
      steps: Array.isArray(planJson.steps)
        ? planJson.steps
            .filter((s: any) => s && typeof s.tool === "string" && allowed.has(s.tool))
            .map((s: any) => ({
              tool: s.tool,
              args: isPlainObject(s.args) ? s.args : {},
              timeoutMs: typeof s.timeoutMs === "number" ? s.timeoutMs : undefined
            }))
        : []
    };

    if (sanitized.steps.length === 0) return fallback;

    try {
      return fillMissingArgsWithFallback(sanitized, fallback);
    } catch {
      return fallback;
    }
  }
}
