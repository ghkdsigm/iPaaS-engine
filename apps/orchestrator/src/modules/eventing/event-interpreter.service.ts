import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { EventIntent, EventParseResult, EventType, MissingSlot } from "./event.types";
import { EVENT_DEFINITIONS } from "./event.registry";
import { PiiVault } from "../interpreter/pii.vault";

function normalizeSpaces(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function extractDateToken(text: string): string | null {
  if (/오늘/.test(text)) return "TODAY";
  if (/내일/.test(text)) return "TOMORROW";
  const iso = text.match(/(20\d{2})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : null;
}

function normalizeDate(token: string): string {
  if (token === "TODAY") return new Date().toISOString().slice(0, 10);
  if (token === "TOMORROW") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  return token;
}

function extractPerson(text: string): string | null {
  // 기대리/김과장 형태
  const m1 = text.match(/([가-힣]{2,4})(대리|과장|차장|부장|사원)/);
  if (m1) return `${m1[1]}${m1[2]}`;
  // 조사 기반 (홍길동이/홍길동은)
  const m2 = text.match(/([가-힣]{2,4})\s*(이|은|는|에게)/);
  return m2 ? m2[1] : null;
}

function extractAmountWon(text: string): number | null {
  // 500만원, 500만, 5,000,000원
  const m = text.match(/([0-9]{1,3}(?:,[0-9]{3})*|[0-9]+)\s*(만원|만|원)/);
  if (!m) return null;
  const raw = m[1].replace(/,/g, "");
  const num = Number(raw);
  if (Number.isNaN(num)) return null;
  if (m[2] === "만원" || m[2] === "만") return num * 10000;
  return num;
}

function includesAny(text: string, words: string[]) {
  return words.some(w => text.includes(w));
}

function detectEventTypes(text: string): EventType[] {
  const types: EventType[] = [];
  if (includesAny(text, ["월급", "급여", "보너스", "지급"])) types.push("payroll.pay");
  if (includesAny(text, ["배차", "배치", "배정", "할당"])) types.push("dispatch.assign");
  if (includesAny(text, ["장부", "전표", "분개", "기록"])) types.push("ledger.post");
  return types;
}

function splitClauses(raw: string) {
  return normalizeSpaces(raw)
    .split(/(?:그리고|,|\n|\.)/g)
    .map(s => s.trim())
    .filter(Boolean);
}

@Injectable()
export class EventInterpreterService {
  constructor(private vault: PiiVault) {}

  async interpret(raw: string): Promise<EventParseResult> {
    const clauses = splitClauses(raw);

    const events: EventIntent[] = [];
    const piiTokens: Record<string, string> = {};

    for (const clause of clauses) {
      const types = detectEventTypes(clause);
      if (types.length === 0) continue;

      const dateToken = extractDateToken(clause) || extractDateToken(raw);
      const date = dateToken ? normalizeDate(dateToken) : null;
      const person = extractPerson(clause) || extractPerson(raw);
      const amount = extractAmountWon(clause);

      for (const type of types) {
        const id = randomUUID();
        const slots: Record<string, any> = {};
        if (date) slots.date = date;

        if (type === "payroll.pay") {
          if (person) slots.payee = person;
          if (amount != null) slots.amountWon = amount;
        }

        if (type === "dispatch.assign") {
          if (person) slots.assignee = person;
          if (amount != null) slots.loadValueWon = amount;
        }

        if (type === "ledger.post") {
          if (amount != null) slots.amountWon = amount;
          // 요약은 문맥이 없으면 안전하게 질문하도록 비워둔다
          // 다만 "월급" 문장이라면 기본 적요 후보를 넣고 PREVIEW 단계에서 승인/수정 가능하게 한다
          if (/월급|급여/.test(clause) && person && amount != null) {
            slots.summary = `${person} 급여 지급`; 
            slots.counterparty = person;
          }
          if (/배차/.test(clause) && person && amount != null) {
            slots.summary = `${person} 배차 물량`; 
            slots.counterparty = person;
          }
        }

        events.push({ id, type, slots, sourceText: clause });
      }
    }

    const missing: MissingSlot[] = [];
    for (const ev of events) {
      const def = EVENT_DEFINITIONS[ev.type];
      for (const slotDef of def.slots) {
        const has = ev.slots[slotDef.name] !== undefined && ev.slots[slotDef.name] !== null && `${ev.slots[slotDef.name]}`.length > 0;
        if (slotDef.required && !has) {
          missing.push({
            eventId: ev.id,
            eventType: ev.type,
            slot: slotDef.name,
            required: true,
            question: slotDef.question
          });
        }
      }
    }

    // PII 처리: 현 단계에서는 "은행계좌"와 같이 위험한 값만 토큰화한다.
    // (예: 123-456-789012)
    const bankMatch = raw.match(/\b\d{2,3}-\d{2,4}-\d{5,}\b/);
    if (bankMatch) {
      const token = await this.vault.put(bankMatch[0]);
      piiTokens.bankAccount = token;
    }

    return {
      ok: events.length > 0,
      raw,
      events,
      missing,
      piiTokens
    };
  }
}
