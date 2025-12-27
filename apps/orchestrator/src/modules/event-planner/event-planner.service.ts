import { Injectable } from "@nestjs/common";
import type { EventIntent, EventType, MissingSlot } from "../eventing/event.types";
import { ToolRegistryService } from "../tool-registry/tool-registry.service";
import { validateArgs } from "../tool-registry/schema/schema.validator";

export type StepDraft = { tool: string; args: any; timeoutMs?: number };

export type PlanBuildResult =
  | { ok: true; steps: StepDraft[]; preview: any }
  | {
      ok: false;
      reason: string;
      missingTools?: { eventType: EventType; candidates: string[] }[];
      missingArgs?: MissingSlot[];
    };

const EVENT_TOOL_CANDIDATES: Record<EventType, string[]> = {
  "payroll.pay": ["payroll.pay", "finance.pay_salary", "hr.pay_salary"],
  "dispatch.assign": ["dispatch.assign", "dispatch.assign_order"],
  "ledger.post": ["ledger.post", "finance.ledger_post"]
};

function pickFirstExisting(available: Set<string>, candidates: string[]) {
  for (const c of candidates) if (available.has(c)) return c;
  return null;
}

function mapEventToArgs(type: EventType, slots: Record<string, any>) {
  if (type === "payroll.pay") {
    return {
      payee: slots.payee,
      amountWon: slots.amountWon,
      date: slots.date,
      reason: slots.reason
    };
  }

  if (type === "dispatch.assign") {
    return {
      assignee: slots.assignee,
      date: slots.date,
      loadValueWon: slots.loadValueWon,
      memo: slots.memo
    };
  }

  if (type === "ledger.post") {
    return {
      date: slots.date,
      amountWon: slots.amountWon,
      summary: slots.summary,
      counterparty: slots.counterparty
    };
  }

  return slots;
}

@Injectable()
export class EventPlannerService {
  constructor(private registry: ToolRegistryService) {}

  async build(events: EventIntent[]): Promise<PlanBuildResult> {
    const toolList = await this.registry.list();
    const available = new Set(toolList.tools.map(t => t.name));

    const missingTools: { eventType: EventType; candidates: string[] }[] = [];
    const steps: StepDraft[] = [];
    const preview: any[] = [];

    for (const ev of events) {
      const candidates = EVENT_TOOL_CANDIDATES[ev.type];
      const selected = pickFirstExisting(available, candidates);
      if (!selected) {
        missingTools.push({ eventType: ev.type, candidates });
        preview.push({ eventId: ev.id, eventType: ev.type, selectedTool: null, args: mapEventToArgs(ev.type, ev.slots) });
        continue;
      }

      const tool = await this.registry.getToolByName(selected);
      const args = mapEventToArgs(ev.type, ev.slots);
      const validation = validateArgs((tool as any).argsSchema, args);
      if (!validation.ok) {
        // schema 기반으로 부족한 슬롯을 질문으로 돌린다
        const missing: MissingSlot[] = [];
        const required = (tool as any).argsSchema?.required;
        if (Array.isArray(required)) {
          for (const k of required) {
            const v = (args as any)[k];
            const has = v !== undefined && v !== null && `${v}`.length > 0;
            if (!has) {
              missing.push({
                eventId: ev.id,
                eventType: ev.type,
                slot: String(k),
                required: true,
                question: `${ev.type} 실행을 위해 '${k}' 값이 필요합니다.`
              });
            }
          }
        }
        return { ok: false, reason: `Missing args for ${selected}`, missingArgs: missing };
      }

      steps.push({ tool: selected, args });
      preview.push({ eventId: ev.id, eventType: ev.type, selectedTool: selected, args });
    }

    if (missingTools.length > 0) {
      return {
        ok: false,
        reason: "No executable tool for one or more events",
        missingTools
      };
    }

    return { ok: true, steps, preview };
  }
}
