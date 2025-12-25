import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { PiiVault } from "./pii.vault";
import type { CommandSpec } from "./command-spec";

const SalaryWon = z.number().int().positive().max(1_000_000_000);
const KoreanName = z.string().min(2).max(4);

function tryParseSalary(command: string) {
  const m = command.match(/(\d{3,5})\s*만원/);
  if (!m) return null;
  const v = Number(m[1]) * 10000;
  return SalaryWon.safeParse(v).success ? v : null;
}

function tryParseName(command: string) {
  const m = command.match(/([가-힣]{2,4})\s*(가|은|는)\s*내일/);
  if (!m) return null;
  return KoreanName.safeParse(m[1]).success ? m[1] : null;
}

function tryParseBank(command: string) {
  const m = command.match(/\b\d{2,3}-\d{2,4}-\d{5,}\b/);
  return m ? m[0] : null;
}

@Injectable()
export class InterpreterService {
  constructor(private vault: PiiVault) {}

  async interpret(command: string): Promise<CommandSpec> {
    const entities: Record<string, any> = {};
    const piiTokens: Record<string, string> = {};
    const confidence: Record<string, number> = {};
    const unknownFields: string[] = [];

    const bank = tryParseBank(command);
    if (bank) {
      const token = await this.vault.put(bank);
      piiTokens.bankAccount = token;
      entities.bankAccountToken = token;
      confidence.bankAccountToken = 0.95;
    }

    const salaryWon = tryParseSalary(command);
    if (salaryWon !== null) {
      entities.salaryWon = salaryWon;
      confidence.salaryWon = 0.8;
    } else {
      unknownFields.push("salaryWon");
    }

    const name = tryParseName(command);
    if (name) {
      entities.name = name;
      confidence.name = 0.8;
    } else {
      unknownFields.push("name");
    }

    if (/개발/.test(command)) {
      entities.dept = "개발팀";
      confidence.dept = 0.7;
    } else if (/영업/.test(command)) {
      entities.dept = "영업팀";
      confidence.dept = 0.7;
    } else {
      entities.dept = "미지정";
      confidence.dept = 0.4;
      unknownFields.push("dept");
    }

    entities.start = /내일/.test(command) ? "TOMORROW" : "UNKNOWN";
    confidence.start = entities.start === "TOMORROW" ? 0.7 : 0.3;

    return { intent: "NATURAL_COMMAND", entities, piiTokens, confidence, unknownFields };
  }

  async resolvePii(token: string) {
    return this.vault.get(token);
  }
}
