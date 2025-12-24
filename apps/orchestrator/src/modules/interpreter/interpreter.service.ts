import { Injectable } from "@nestjs/common";
import { PiiVault } from "./pii.vault";
import type { CommandSpec } from "./command-spec";

@Injectable()
export class InterpreterService {
  private vault = new PiiVault();

  interpret(command: string): CommandSpec {
    const entities: Record<string, any> = {};
    const piiTokens: Record<string, string> = {};

    const bank = command.match(/\b\d{2,3}-\d{2,4}-\d{5,}\b/);
    if (bank) {
      const token = this.vault.put(bank[0]);
      piiTokens.bankAccount = token;
      entities.bankAccountToken = token;
    }

    const salary = command.match(/(\d{3,5})\s*만원/);
    if (salary) entities.salaryWon = Number(salary[1]) * 10000;

    const name = command.match(/([가-힣]{2,4})\s*(가|은|는)\s*내일/);
    if (name) entities.name = name[1];

    entities.dept = /개발/.test(command) ? "개발팀" : "미지정";
    entities.start = /내일/.test(command) ? "TOMORROW" : "UNKNOWN";

    return { intent: "NATURAL_COMMAND", entities, piiTokens };
  }

  resolvePii(token: string) {
    return this.vault.get(token);
  }
}
