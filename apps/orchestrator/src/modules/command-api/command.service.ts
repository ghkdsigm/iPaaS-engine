import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PolicyEngineService } from "../policy/policy-engine.service";
import { ToolRegistryService } from "../tool-registry/tool-registry.service";
import { WorkflowEngineService } from "../workflow-engine/workflow-engine.service";
import { maskBankAccount } from "../../common/utils/mask";
import * as crypto from "crypto";
import { EventInterpreterService } from "../eventing/event-interpreter.service";
import { EventPlannerService } from "../event-planner/event-planner.service";
import { InterpreterService } from "../interpreter/interpreter.service";

function hashIdempotency(raw: string) {
  const normalized = raw.trim().replace(/\s+/g, " ");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

@Injectable()
export class CommandService {
  constructor(
    private prisma: PrismaClient,
    private events: EventInterpreterService,
    private eventPlanner: EventPlannerService,
    private pii: InterpreterService,
    private policy: PolicyEngineService,
    private registry: ToolRegistryService,
    private workflow: WorkflowEngineService
  ) {}

  private async audit(type: string, meta: any) {
    try {
      await this.prisma.auditEvent.create({ data: { type, meta } });
    } catch {}
  }

  async create(command: string, providedIdempotencyKey?: string) {
    const idempotencyKey = providedIdempotencyKey || hashIdempotency(command);

    const existing = await this.prisma.command.findFirst({
      where: { idempotencyKey },
      include: { plan: true, runs: { orderBy: { createdAt: "desc" }, take: 1 } }
    });

    if (existing) {
      await this.audit("COMMAND_DEDUPED", { commandId: existing.id, idempotencyKey });
      const latestRun = existing.runs?.[0];
      if (latestRun?.status === "SUCCESS") {
        return {
          ok: true,
          status: "ALREADY_EXECUTED",
          commandId: existing.id,
          planId: existing.plan?.id,
          runId: latestRun.id
        };
      }
      return { ok: true, status: "REUSED", commandId: existing.id, planId: existing.plan?.id, runId: latestRun?.id || null };
    }

    const cmd = await this.prisma.command.create({ data: { raw: command, idempotencyKey } });
    await this.audit("COMMAND_CREATED", { commandId: cmd.id, idempotencyKey });

    // 데모: 현재는 hr만 존재. 향후 finance/dispatch/ledger 서버를 추가하면 여기서 ensure/sync 확장.
    await this.registry.ensureServer("hr");
    await this.registry.sync("hr");

    // 1) 이벤트+슬롯 해석
    const parsed = await this.events.interpret(command);
    await this.audit("EVENTS_PARSED", { commandId: cmd.id, events: parsed.events, missing: parsed.missing });

    if (!parsed.ok || parsed.events.length === 0) {
      await this.prisma.plan.create({
        data: {
          commandId: cmd.id,
          steps: { kind: "NO_MATCH", events: [], missing: [], raw: command } as any,
          needsApproval: false
        }
      });
      return {
        ok: false,
        status: "NO_MATCH",
        commandId: cmd.id,
        message: "처리 가능한 이벤트가 없습니다. 지원 이벤트: payroll.pay, dispatch.assign, ledger.post"
      };
    }

    // 2) 슬롯 미완성 => 절대 실행 금지. 질문만.
    if (parsed.missing.length > 0) {
      const planRow = await this.prisma.plan.create({
        data: {
          commandId: cmd.id,
          steps: { kind: "NEEDS_SLOTS", events: parsed.events, missing: parsed.missing, raw: command } as any,
          needsApproval: false
        }
      });

      return {
        ok: true,
        status: "NEEDS_SLOTS",
        commandId: cmd.id,
        planId: planRow.id,
        events: parsed.events,
        missing: parsed.missing,
        questions: parsed.missing.map(m => ({ eventId: m.eventId, eventType: m.eventType, slot: m.slot, question: m.question }))
      };
    }

    // 3) 도구 선택: 후보 검색 -> 존재하는 도구 pick -> args는 슬롯 기반으로 채움
    const planBuild = await this.eventPlanner.build(parsed.events);

    if (!planBuild.ok) {
      const planRow = await this.prisma.plan.create({
        data: {
          commandId: cmd.id,
          steps: {
            kind: planBuild.missingTools ? "NEEDS_TOOL" : "NEEDS_ARGS",
            events: parsed.events,
            missingTools: planBuild.missingTools,
            missingArgs: planBuild.missingArgs,
            preview: planBuild.missingTools ? [] : undefined,
            raw: command
          } as any,
          needsApproval: false
        }
      });

      return {
        ok: true,
        status: planBuild.missingTools ? "NEEDS_TOOL" : "NEEDS_ARGS",
        commandId: cmd.id,
        planId: planRow.id,
        reason: planBuild.reason,
        missingTools: planBuild.missingTools,
        missing: planBuild.missingArgs
      };
    }

    // 4) 정책 평가 (여기서는 '실행 가능' 단계에만 승인/차단이 걸리도록)
    const metas = [];
    for (const s of planBuild.steps) {
      const t = await this.registry.getToolByName(s.tool);
      metas.push({ tool: s.tool, args: s.args, riskLevel: t.riskLevel, requiredRoles: t.requiredRoles, piiFields: t.piiFields });
    }

    const policy = this.policy.evaluate({ spec: { events: parsed.events, piiTokens: parsed.piiTokens }, steps: metas, userRoles: ["hr"] });

    const planRow = await this.prisma.plan.create({
      data: {
        commandId: cmd.id,
        steps: { kind: "EXEC_PLAN", events: parsed.events, preview: planBuild.preview, steps: planBuild.steps } as any,
        needsApproval: policy.needsApproval
      }
    });

    await this.audit("PLAN_CREATED", { commandId: cmd.id, planId: planRow.id, needsApproval: policy.needsApproval });

    if (!policy.allowed) {
      await this.audit("PLAN_DENIED", { commandId: cmd.id, planId: planRow.id, reason: policy.reason });
      return { ok: false, status: "DENIED", commandId: cmd.id, planId: planRow.id, reason: policy.reason };
    }

    if (policy.needsApproval) {
      const approval = await this.prisma.approval.create({
        data: { planId: planRow.id, status: "PENDING", reason: policy.reason || "Approval required" }
      });
      await this.audit("APPROVAL_CREATED", { approvalId: approval.id, planId: planRow.id });
      return {
        ok: true,
        status: "NEEDS_APPROVAL",
        commandId: cmd.id,
        planId: planRow.id,
        approvalId: approval.id,
        maskedCommand: maskBankAccount(command),
        preview: planBuild.preview,
        steps: planBuild.steps
      };
    }

    const exec = await this.workflow.execute(cmd.id, planRow.id, planBuild.steps, token => this.pii.resolvePii(token));
    return { ok: true, status: "EXECUTED", runId: exec.runId, commandId: cmd.id, planId: planRow.id };
  }
}
