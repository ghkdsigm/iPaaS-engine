import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

export type AuditType =
  | "COMMAND_RECEIVED"
  | "COMMAND_IDEMPOTENT_REUSED"
  | "SPEC_INTERPRETED"
  | "PLAN_CREATED"
  | "POLICY_EVALUATED"
  | "APPROVAL_CREATED"
  | "APPROVAL_RESOLVED"
  | "RUN_STARTED"
  | "STEP_STARTED"
  | "STEP_SUCCEEDED"
  | "STEP_FAILED"
  | "RUN_SUCCEEDED"
  | "RUN_FAILED";

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaClient) {}

  async record(input: {
    type: AuditType;
    actorId?: string | null;
    commandId?: string | null;
    planId?: string | null;
    runId?: string | null;
    stepId?: string | null;
    payload?: any;
  }) {
    await this.prisma.auditEvent.create({
      data: {
        type: input.type,
        actorId: input.actorId || null,
        commandId: input.commandId || null,
        planId: input.planId || null,
        runId: input.runId || null,
        stepId: input.stepId || null,
        payload: input.payload ?? null
      }
    });
  }
}
