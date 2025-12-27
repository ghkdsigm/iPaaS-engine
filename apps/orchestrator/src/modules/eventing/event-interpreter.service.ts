import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { EventIntent, EventParseResult, EventType, MissingSlot } from "./event.types";
import { EVENT_DEFINITIONS } from "./event.registry";

function normalizeSpaces(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function resolveDateToken(text: string) {
  const t = text;
  const iso = t.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  if (t.includes("오늘")) return "TODAY";
  if (t.includes("내일")) return "TOMORROW";
  return null;
}

function parseMoneyWon(text: string) {
  const t = text.replace(/,/g, "");
  const m1 = t.match(/(\d+(?:\.\d+)?)\s*(만원|만\s*원)\b/);
  if (m1) {
    const n = Number(m1[1]);
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 10000);
  }
  const m2 = t.match(/(\d+(?:\.\d+)?)\s*원\b/);
  if (m2) {
    const n = Number(m2[1]);
    if (!Number.isFinite(n)) return null;
    return Math.round(n);
  }
  return null;
}

function pickPersonToken(text: string) {
  const t = text;
  const m = t.match(/([가-힣]{2,5}\s*(?:대리|과장|차장|부장|이사|상무|대표|님)?)/);
  if (!m) return null;
  // Trim common particles so "홍길동이" -> "홍길동"
  return m[1].replace(/\s+/g, "").replace(/[이가을를은는]$/, "");
}

function pickTeamToken(text: string) {
  const t = text;
  const m = t.match(/([가-힣A-Za-z0-9_-]{1,20})(?:팀|부|실|본부)\b/);
  if (!m) return null;
  // Keep the suffix if present in the match
  const full = m[0];
  return normalizeSpaces(full);
}

function pickBankAccountToken(text: string) {
  const t = text;
  const m = t.match(/\b(\d{2,4}-\d{2,4}-\d{2,6})\b/);
  if (!m) return null;
  return m[1];
}

function detectEventTypes(text: string): EventType[] {
  const types: EventType[] = [];
  const t = text;

  // HR / onboarding
  // Example: "홍길동이 내일 입사" -> hr.generate_employee_id
  const hasHire = t.includes("입사") || t.includes("채용") || t.includes("입사자") || t.includes("신입");
  if (hasHire) {
    types.push("hr.generate_employee_id");
  }

  // Payroll
  // Be permissive: "500만원 주고" also counts as payroll intent if a person + amount exist.
  const hasPayrollKeyword = t.includes("월급") || t.includes("급여");
  const hasPayVerb = t.includes("줘") || t.includes("지급") || t.includes("입금") || t.includes("주고") || t.includes("보내");
  const hasMoney = parseMoneyWon(t) !== null;
  const hasPerson = pickPersonToken(t) !== null;
  if ((hasPayrollKeyword && hasPayVerb) || (hasPayVerb && hasMoney && hasPerson)) {
    types.push("payroll.pay");
  }

  const hasDispatch = t.includes("배차") && (t.includes("배치") || t.includes("배정") || t.includes("할당"));
  if (hasDispatch) {
    types.push("dispatch.assign");
  }

  const hasLedger = t.includes("장부") && (t.includes("적어") || t.includes("기록") || t.includes("반영") || t.includes("입력"));
  if (hasLedger) {
    types.push("ledger.post");
  }

  return types;
}

function maskName(name: string) {
  const n = (name || "").trim();
  if (!n) return n;
  if (n.length === 1) return "*";
  if (n.length === 2) return n[0] + "*";
  return n[0] + "*".repeat(Math.max(1, n.length - 2)) + n[n.length - 1];
}

function slotValueFor(eventType: EventType, slot: string, raw: string) {
  const t = raw;
  if (slot === "startDate") return resolveDateToken(t);
  if (slot === "team") return pickTeamToken(t);
  if (slot === "name") return pickPersonToken(t);
  if (slot === "bankAccount") return pickBankAccountToken(t);
  if (slot === "date") return resolveDateToken(t);
  if (slot === "amountWon" || slot === "loadValueWon") return parseMoneyWon(t);

  if (slot === "payee" || slot === "assignee") {
    const person = pickPersonToken(t);
    return person || null;
  }

  if (slot === "summary") {
    const m = t.match(/(?:적요|내용|메모)\s*(?:는|:)?\s*([^\n]+)$/);
    if (!m) return null;
    const v = normalizeSpaces(m[1]);
    return v.length ? v : null;
  }

  if (slot === "counterparty") {
    const m = t.match(/(?:상대방|거래처)\s*(?:는|:)?\s*([가-힣A-Za-z0-9_-]{2,})/);
    if (!m) return null;
    return normalizeSpaces(m[1]);
  }

  if (slot === "orderId") {
    const m = t.match(/(?:오더|배차|주문)\s*(?:번호|ID)?\s*(?:는|:)?\s*([A-Za-z0-9_-]{3,})/i);
    if (!m) return null;
    return normalizeSpaces(m[1]);
  }

  if (slot === "ref") {
    const m = t.match(/(?:참조|ref)\s*(?:번호|ID)?\s*(?:는|:)?\s*([A-Za-z0-9_-]{3,})/i);
    if (!m) return null;
    return normalizeSpaces(m[1]);
  }

  if (slot === "memo" || slot === "notes") {
    const m = t.match(/(?:메모|비고)\s*(?:는|:)?\s*([^\n]+)$/);
    if (!m) return null;
    const v = normalizeSpaces(m[1]);
    return v.length ? v : null;
  }

  return null;
}

function buildMissingSlots(event: EventIntent): MissingSlot[] {
  const def = EVENT_DEFINITIONS[event.type];
  const missing: MissingSlot[] = [];

  for (const s of def.slots) {
    if (!s.required) continue;
    const v = event.slots?.[s.name];
    const ok = v !== undefined && v !== null && String(v).trim() !== "";
    if (!ok) {
      missing.push({
        eventId: event.id,
        eventType: event.type,
        slot: s.name,
        question: s.question
      });
    }
  }

  return missing;
}

@Injectable()
export class EventInterpreterService { 

  private extractPiiTokens(text: string): string[] {
    const tokens: string[] = [];
    const person = pickPersonToken(text);
    if (person) tokens.push(maskName(person));
    const acct = pickBankAccountToken(text);
    if (acct) tokens.push(acct);
    return [...new Set(tokens)];
  }

  parse(raw: string): EventParseResult {
    const text = normalizeSpaces(raw);
    const types = detectEventTypes(text);

    const piiTokens = this.extractPiiTokens(text);

    const events: EventIntent[] = [];
    const missing: MissingSlot[] = [];

    for (const type of types) {
      const def = EVENT_DEFINITIONS[type];
      const id = randomUUID();
      const slots: Record<string, any> = {};

      for (const s of def.slots) {
        const v = slotValueFor(type, s.name, text);
        if (v !== null && v !== undefined && String(v).trim() !== "") {
          slots[s.name] = v;
        }
      }

      const ev: EventIntent = { id, type, slots, sourceText: raw };
      events.push(ev);
      missing.push(...buildMissingSlots(ev));
    }

    return {
      events,
      missing,
      piiTokens
    };
  }
}
