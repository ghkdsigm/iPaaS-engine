import { Injectable } from "@nestjs/common";
import { ToolRegistryService } from "../tool-registry/tool-registry.service";

export type InterpretedIntent = {
  tool: string;
  args: Record<string, unknown>;
  confidence: number;
  pii?: string[];
};

function norm(s: string) {
  return (s ?? "").trim().replace(/\s+/g, " ");
}

function extractName(text: string) {
  const m = text.match(
    /([가-힣]{2,5})(?:\s*(?:대리|과장|차장|부장|이사|상무|전무|대표))?(?:이|가|은|는|을|를|님)?/
  );
  return m ? m[1] : undefined;
}

function extractAmount(text: string) {
  const m = text.match(/(\d+(?:,\d{3})*)(?:\s*)?(만원|만\s*원|원)/);
  if (!m) return undefined;
  const raw = m[1].replace(/,/g, "");
  const unit = m[2].replace(/\s/g, "");
  const n = Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return unit.startsWith("만") ? n * 10000 : n;
}

function extractAccount(text: string) {
  const m = text.match(/\b(\d{2,4}-\d{2,4}-\d{4,14})\b/);
  return m ? m[1] : undefined;
}

@Injectable()
export class InterpreterService {
  constructor(private readonly registry: ToolRegistryService) {}

  async interpret(command: string): Promise<InterpretedIntent> {
    const text = norm(command);

    const name = extractName(text);
    const amount = extractAmount(text);
    const account = extractAccount(text);

    const wantsHire = /입사|채용|신규\s*입사/.test(text);
    const wantsPay = /송금|이체|지급|주고|줘/.test(text);

    if (wantsHire && name) {
      return {
        tool: "hr.generate_employee_id",
        args: { name },
        confidence: 0.72,
        pii: []
      };
    }

    if (wantsPay && amount) {
      return {
        tool: "finance.pay_salary",
        args: { amount, account: account ?? null, name: name ?? null },
        confidence: 0.66,
        pii: account ? [account] : []
      };
    }

    const tools = await this.registry.listTools();
    const first = tools[0];

    return {
      tool: first?.name ?? "noop",
      args: { raw: text },
      confidence: 0.1,
      pii: account ? [account] : []
    };
  }
}
