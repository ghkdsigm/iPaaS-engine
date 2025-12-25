import { Injectable } from "@nestjs/common";
import crypto from "crypto";
import type { CommandSpec } from "../interpreter/command-spec";
import { PlanSchema, type Plan } from "./plan.schema";

function stepKey(tool: string, args: any) {
  return crypto.createHash("sha256").update(tool + ":" + JSON.stringify(args)).digest("hex");
}

@Injectable()
export class PlannerService {
  build(spec: CommandSpec): Plan {
    const name = spec.entities.name ?? "UNKNOWN";
    const dept = spec.entities.dept ?? "미지정";
    const salaryWon = spec.entities.salaryWon ?? null;
    const startDate = spec.entities.start ?? "UNKNOWN";
    const bankAccountToken = spec.entities.bankAccountToken ?? null;

    // 운영형 원칙:
    // - Planner는 정형 Plan(JSON)만 반환
    // - 실행은 WorkflowEngine이 담당
    const plan: Plan = {
      version: 1,
      steps: [
        {
          tool: "hr.generate_employee_id",
          args: { name, dept },
          riskLevel: "LOW",
          expected: "employeeId"
        },
        {
          tool: "hr.create_employee_account",
          args: { name, dept, startDate, salaryWon, bankAccountToken, employeeId: "{{step0.employeeId}}" },
          riskLevel: "HIGH",
          expected: "employeeAccountId"
        }
      ],
      notes: "Planner는 현재 MVP 템플릿 기반입니다. 운영에서는 템플릿/DSL + 승인/정책으로 통제합니다."
    };

    // step별 idempotencyKey 부여(재실행/재시도 안전)
    plan.steps = plan.steps.map((s) => ({ ...s, idempotencyKey: stepKey(s.tool, s.args) }));

    return PlanSchema.parse(plan);
  }
}
