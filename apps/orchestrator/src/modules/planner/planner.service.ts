import { Injectable } from "@nestjs/common";
import { EventInterpreterService } from "../eventing/event-interpreter.service";
import type { EventParseResult, EventIntent } from "../eventing/event.types";

@Injectable()
export class PlannerService {
  constructor(private readonly interpreter: EventInterpreterService) {}

  async plan(command: string): Promise<{
    ok: boolean;
    events: EventIntent[];
    missingArgs: string[];
    preview: Array<{ tool: string; args: Record<string, unknown> }>;
  }> {
    const parsed: EventParseResult = this.interpreter.parse(command ?? "");

    if (!parsed.events.length) {
      return {
        ok: false,
        events: [],
        missingArgs: [],
        preview: []
      };
    }

    const preview = parsed.events.map((e: EventIntent) => ({
      tool: e.type,
      args: (e.slots ?? {}) as Record<string, unknown>
    }));

    const missingArgs = (parsed.missing ?? []).map((m) => m.slot);

    return {
      ok: true,
      events: parsed.events,
      missingArgs,
      preview
    };
  }
}
