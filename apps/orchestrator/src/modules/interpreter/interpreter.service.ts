import { Injectable } from "@nestjs/common";
import { PiiVault } from "./pii.vault";
import type { CommandSpec } from "./command-spec";

function extractKoreanName(command: string) {
  const m = command.match(/([가-힣]{2,4})\s*(가|은|는)\s*(내일|오늘|모레)/);
  return m ? m[1] : null;
}

function extractDept(command: string) {
  if (/개발/.test(command)) return "개발팀";
  if (/인사/.test(command)) return "인사팀";
  if (/영업/.test(command)) return "영업팀";
  return "미지정";
}

function extractStart(command: string) {
  if (/내일/.test(command)) return "TOMORROW";
  if (/오늘/.test(command)) return "TODAY";
  return "UNKNOWN";
}

function extractSalaryWon(command: string) {
  const m = command.match(/연봉\s*([0-9]{3,7})\s*만?\s*원/);
  if (!m) return null;
  const num = Number(m[1]);
  if (Number.isNaN(num)) return null;
  // if "5000만원" -> 5000 * 10000
  if (/만/.test(command)) return num * 10000;
  return num;
}

function extractBankAccount(command: string) {
  const bank = command.match(/\d{2,3}-\d{2,4}-\d{5,}/);
  return bank ? bank[0] : null;
}

@Injectable()
export class InterpreterService {
  constructor(private vault: PiiVault) {
    throw new Error("LEGACY_INTERPRETER_DISABLED: Use EventInterpreterService.parse(). Remove InterpreterModule imports.");}

  async interpret(command: string): Promise<CommandSpec> {
    const entities: Record<string, any> = {};
    const piiTokens: Record<string, string> = {};

    const bank = extractBankAccount(command);
    if (bank) {
      const token = await this.vault.put(bank);
      piiTokens.bankAccount = token;
      entities.bankAccountToken = token;
    }

    const salary = extractSalaryWon(command);
    if (salary !== null) entities.salaryWon = salary;

    const name = extractKoreanName(command);
    if (name) entities.name = name;

    entities.dept = extractDept(command);
    entities.start = extractStart(command);

    return { intent: "NATURAL_COMMAND", entities, piiTokens };
  }

  async resolvePii(token: string) {
    return await this.vault.get(token);
  }
}
