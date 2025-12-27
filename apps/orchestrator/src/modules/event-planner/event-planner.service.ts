import { Injectable } from "@nestjs/common";
import type { EventIntent, EventType, MissingSlot } from "../eventing/event.types";
import { ToolRegistryService } from "../tool-registry/tool-registry.service";
import { validateArgs } from "../tool-registry/schema/schema.validator";
import { argKeyFor } from "../eventing/event.registry";

export type StepDraft = { tool: string; args: any; timeoutMs?: number };

export type PlanBuildResult =
  | { ok: true; steps: StepDraft[]; preview: any[]; diffs: any[] }
  | {
      ok: false;
      reason: string;
      missingTools?: { eventType: EventType; candidates: string[] }[];
      missingArgs?: MissingSlot[];
      preview?: any[];
      diffs?: any[];
    };

function shallowClone<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}

function buildArgsFromSlots(eventType: EventType, slots: Record<string, any>) {
  const args: Record<string, any> = {};
  for (const [k, v] of Object.entries(slots || {})) {
    const argKey = argKeyFor(eventType, k);
    args[argKey] = v;
  }

  // Common aliases (helps when tools keep legacy arg names)
  if (eventType === "payroll.pay") {
    if (slots.payee && args.employeeName === undefined) args.employeeName = slots.payee;
    if (slots.amountWon && args.amountWon === undefined) args.amountWon = slots.amountWon;
  }
  return args;
}

function diffKeys(before: any, after: any) {
  const all = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const changes: any[] = [];
  for (const k of all) {
    const b = (before || {})[k];
    const a = (after || {})[k];
    if (JSON.stringify(b) !== JSON.stringify(a)) changes.push({ path: k, before: b, after: a });
  }
  return changes;
}

@Injectable()
export class EventPlannerService {
  constructor(private registry: ToolRegistryService) {}

  /**
   * EventPlanner:
   * 1) candidates = tools where tool.eventTypes includes eventType OR tool.tags includes event:<eventType>
   * 2) choose best candidate (deterministic ranking)
   * 3) map slots -> args (event argMap)
   * 4) validate argsSchema (AJV with coercion) -> finalArgs
   * 5) produce preview + diff (slots -> args -> coercedArgs)
   */
  async build(events: EventIntent[]): Promise<PlanBuildResult> {
    const steps: StepDraft[] = [];
    const preview: any[] = [];
    const diffs: any[] = [];
    const missingTools: { eventType: EventType; candidates: string[] }[] = [];
    const missingArgs: MissingSlot[] = [];

    for (const ev of events) {
      const candidates = await this.registry.findCandidatesForEvent(ev.type);
      if (!candidates.length) {
        missingTools.push({ eventType: ev.type, candidates: [] });
        preview.push({ eventId: ev.id, eventType: ev.type, selectedTool: null, args: buildArgsFromSlots(ev.type, ev.slots) });
        continue;
      }

      const selected = candidates[0];
      const mappedArgs = buildArgsFromSlots(ev.type, ev.slots);
      const finalArgs = shallowClone(mappedArgs);

      if (selected.argsSchema) {
        const v = validateArgs(selected.argsSchema, finalArgs);
        if (!v.ok) {
          // argsSchema mismatch -> do not execute, ask user
          missingArgs.push({
            eventId: ev.id,
            eventType: ev.type,
            slot: "(argsSchema)",
            question: `선택된 도구(${selected.name}) 실행에 필요한 인자 형태가 맞지 않습니다: ${v.error}`
          });
          preview.push({ eventId: ev.id, eventType: ev.type, selectedTool: selected.name, args: mappedArgs, argsError: v.error });
          diffs.push({ eventId: ev.id, eventType: ev.type, tool: selected.name, changes: diffKeys(mappedArgs, finalArgs) });
          continue;
        }
      }

      steps.push({ tool: selected.name, args: finalArgs });
      preview.push({ eventId: ev.id, eventType: ev.type, selectedTool: selected.name, args: finalArgs });
      diffs.push({ eventId: ev.id, eventType: ev.type, tool: selected.name, changes: diffKeys(mappedArgs, finalArgs) });
    }

    if (missingTools.length > 0) {
      return { ok: false, reason: "No executable tool for one or more events", missingTools, preview, diffs };
    }

    if (missingArgs.length > 0) {
      return { ok: false, reason: "Tool args are invalid or incomplete", missingArgs, preview, diffs };
    }

    return { ok: true, steps, preview, diffs };
  }
}
