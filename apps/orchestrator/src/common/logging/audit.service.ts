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

export type AuditInput = {
  type: AuditType;
  actorId?: string | null;
  commandId?: string | null;
  planId?: string | null;
  runId?: string | null;
  stepId?: string | null;
  message?: string | null;
  payload?: unknown;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaClient) {}

  async emit(input: AuditInput) {
    const hasMeta = input.actorId !== undefined || input.payload !== undefined;

    const meta = hasMeta
      ? {
          actorId: input.actorId ?? null,
          payload: input.payload ?? null
        }
      : undefined;

    await this.prisma.auditEvent.create({
      data: {
        type: input.type,
        commandId: input.commandId ?? null,
        planId: input.planId ?? null,
        runId: input.runId ?? null,
        stepId: input.stepId ?? null,
        message: input.message ?? null,
        ...(meta !== undefined ? { meta } : {})
      }
    });
  }
}
