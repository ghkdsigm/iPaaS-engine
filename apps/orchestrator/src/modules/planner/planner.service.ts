import { Injectable } from "@nestjs/common";
import type { CommandSpec } from "../interpreter/command-spec";
import type { Plan } from "./plan.schema";

@Injectable()
export class PlannerService {
  build(spec: CommandSpec): Plan {
    const name = spec.entities.name || "신규입사자";
    const steps = [
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
        }
      }
    ];
    return { steps };
  }
}
