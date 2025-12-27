import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PolicyEngineService } from "../policy/policy-engine.service";
import { ToolRegistryService } from "../tool-registry/tool-registry.service";
import { WorkflowEngineService } from "../workflow-engine/workflow-engine.service";
import * as crypto from "crypto";
import { EventInterpreterService } from "../eventing/event-interpreter.service";
import { EventPlannerService } from "../event-planner/event-planner.service";
import { EVENT_DEFINITIONS } from "../eventing/event.registry";

function hashIdempotency(raw: string) {
  const normalized = raw.trim().replace(/\s+/g, " ");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function userRolesFromEnv() {
  const v = (process.env.DEFAULT_USER_ROLES || "ADMIN").trim();
  return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : ["ADMIN"];
}

function slotChecklist(events: any[]) {
  return events.map((ev) => {
    const def = EVENT_DEFINITIONS[ev.type];
    const required = def.slots.filter((s) => s.required).map((s) => s.name);
    const filled = required.filter((k) => ev.slots?.[k] !== undefined && ev.slots?.[k] !== null && ev.slots?.[k] !== "");
    const missing = required.filter((k) => !filled.includes(k));
    return { eventId: ev.id, eventType: ev.type, required, filled, missing };
  });
}

@Injectable()
export class CommandService {
  constructor(
    private prisma: PrismaClient,
    private policy: PolicyEngineService,
    private registry: ToolRegistryService,
    private workflow: WorkflowEngineService,
    private eventInterpreter: EventInterpreterService,
    private eventPlanner: EventPlannerService
  ) {}

  async create(raw: string, idempotencyKey?: string) {
    const key = idempotencyKey || hashIdempotency(raw);

    const existing = await this.prisma.command.findFirst({ where: { idempotencyKey: key } });
    if (existing) {
      return { ok: true, status: "DEDUPED", commandId: existing.id };
    }

    const cmdRow = await this.prisma.command.create({
      data: { raw, idempotencyKey: key }
    });

    // 1) Event parse (Event + Slot). No "guess execution".
    const parsed = this.eventInterpreter.parse(raw);

    if (parsed.missing.length > 0) {
      // Store a draft plan for traceability (no steps)
      const plan = await this.prisma.plan.create({
        data: {
          commandId: cmdRow.id,
          steps: [],
          preview: { events: parsed.events, checklist: slotChecklist(parsed.events) },
          diff: null,
          needsApproval: false
        }
      });

      return {
        ok: true,
        status: "NEEDS_SLOTS",
        commandId: cmdRow.id,
        planId: plan.id,
        events: parsed.events,
        missing: parsed.missing,
        questions: parsed.missing.map((m) => ({
          eventId: m.eventId,
          eventType: m.eventType,
          slot: m.slot,
          question: m.question
        })),
        checklist: slotChecklist(parsed.events)
      };
    }

    // 2) Candidate search -> schema-based args -> preview + diff
    const planBuild = await this.eventPlanner.build(parsed.events);

    const plan = await this.prisma.plan.create({
      data: {
        commandId: cmdRow.id,
        steps: (planBuild.ok ? planBuild.steps : []) as any,
        preview: { events: parsed.events, preview: planBuild.preview ?? [], checklist: slotChecklist(parsed.events) },
        diff: { diffs: planBuild.diffs ?? [] },
        needsApproval: false
      }
    });

    if (!planBuild.ok) {
      return {
        ok: true,
        status: "NEEDS_SLOTS",
        commandId: cmdRow.id,
        planId: plan.id,
        reason: planBuild.reason,
        missingTools: planBuild.missingTools ?? [],
        missingArgs: planBuild.missingArgs ?? [],
        preview: planBuild.preview ?? [],
        diffs: planBuild.diffs ?? [],
        checklist: slotChecklist(parsed.events)
      };
    }

    // 3) Policy check (no execution if blocked)
    const stepMetas = [];
    for (const s of planBuild.steps) {
      const t = await this.registry.getToolByName(s.tool);
      stepMetas.push({
        tool: t.name,
        args: s.args,
        riskLevel: t.riskLevel,
        requiredRoles: t.requiredRoles,
        piiFields: t.piiFields
      });
    }

    const policy = this.policy.evaluate({ steps: stepMetas, userRoles: userRolesFromEnv() });
    if (!policy.allowed) {
      return {
        ok: true,
        status: "BLOCKED",
        commandId: cmdRow.id,
        planId: plan.id,
        reason: policy.reason,
        preview: planBuild.preview,
        diffs: planBuild.diffs,
        checklist: slotChecklist(parsed.events)
      };
    }

    // 4) Needs approval -> PREVIEW + Approval row
    if (policy.needsApproval) {
      await this.prisma.plan.update({ where: { id: plan.id }, data: { needsApproval: true } });
      const approval = await this.prisma.approval.create({
        data: { planId: plan.id, status: "PENDING", reason: policy.reason || "Approval required" }
      });

      return {
        ok: true,
        status: "PREVIEW",
        commandId: cmdRow.id,
        planId: plan.id,
        approvalId: approval.id,
        reason: approval.reason,
        preview: planBuild.preview,
        diffs: planBuild.diffs,
        checklist: slotChecklist(parsed.events),
        next: {
          approveEndpoint: `/approvals/${approval.id}/approve`,
          rejectEndpoint: `/approvals/${approval.id}/reject`
        }
      };
    }

    // 5) Auto execute
    const run = await this.workflow.executePlan({ commandId: cmdRow.id, planId: plan.id, steps: planBuild.steps });

    return {
      ok: true,
      status: "EXECUTED",
      commandId: cmdRow.id,
      planId: plan.id,
      run
    };
  }
}
