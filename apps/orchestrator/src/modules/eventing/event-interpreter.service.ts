import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { EventIntent, EventParseResult, EventType, MissingSlot } from "./event.types";
import { EVENT_DEFINITIONS } from "./event.registry";
import { PiiVault } from "../interpreter/pii.vault";

function normalizeSpaces(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function resolveDateToken(token: string | null) {
  if (!token) return null;
  if (/^20\d{2}-\d{2}-\d{2}$/.test(token)) return token;

  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const ymd = (d: Date) => d.toISOString().slice(0, 10);

  if (token === "TODAY") return ymd(base);
  if (token === "TOMORROW") {
    const d = new Date(base.getTime() + 24 * 60 * 60 * 1000);
    return ymd(d);
  }
  return null;
}

function extractDateToken(text: string): string | null {
  if (text.includes("오늘")) return "TODAY";
  if (text.includes("내일")) return "TOMORROW";
  const iso = text.match(/(20\d{2})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : null;
}

function extractKoreanPerson(text: string): string | null {
  // very conservative: capture '기대리', '홍길동' etc.
  const m = text.match(/([가-힣]{2,4})(대리|과장|차장|부장)?/);
  if (!m) return null;
  return m[1] + (m[2] || "");
}

function extractAmountWon(text: string): number | null {
  // 500만원, 500 만원, 5000000원
  const man = text.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*만원/);
  if (man) {
    const n = Number(String(man[1]).replace(/,/g, ""));
    if (!Number.isFinite(n)) return null;
    return n * 10000;
  }

  const won = text.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*원/);
  if (won) {
    const n = Number(String(won[1]).replace(/,/g, ""));
    if (!Number.isFinite(n)) return null;
    return n;
  }

  return null;
}

function includesAny(text: string, words: string[]) {
  return words.some((w) => text.includes(w));
}

function detectEventTypes(text: string): EventType[] {
  const types: EventType[] = [];
  if (includesAny(text, ["월급", "급여", "보너스", "지급"])) types.push("payroll.pay");
  if (includesAny(text, ["배차", "배치", "배정", "할당"])) types.push("dispatch.assign");
  if (includesAny(text, ["장부", "전표", "분개", "기록"])) types.push("ledger.post");
  return types;
}

function splitClauses(raw: string) {
  const t = normalizeSpaces(raw);
  return t
    .split(/(그리고|,|그리고는|그리고도|하고|한 다음|다음에)/)
    .map((s) => normalizeSpaces(s))
    .filter((s) => s && !["그리고", ",", "하고", "한 다음", "다음에", "그리고는", "그리고도"].includes(s));
}

@Injectable()
export class EventInterpreterService {
  constructor(private pii: PiiVault) {}

  parse(raw: string): EventParseResult {
    const text = normalizeSpaces(raw);
    const clauses = splitClauses(text);

    const detected = detectEventTypes(text);
    const events: EventIntent[] = [];
    const missing: MissingSlot[] = [];

    for (const type of detected) {
      const def = EVENT_DEFINITIONS[type];
      const ev: EventIntent = {
        id: randomUUID(),
        type,
        slots: {},
        sourceText: text
      };

      // conservative extraction
      const date = resolveDateToken(extractDateToken(text));
      if (date) ev.slots.date = date;

      const person = extractKoreanPerson(text);
      const amountWon = extractAmountWon(text);

      if (type === "payroll.pay") {
        if (person) ev.slots.payee = person;
        if (amountWon != null) ev.slots.amountWon = amountWon;
      }

      if (type === "dispatch.assign") {
        if (person) ev.slots.assignee = person;
        if (amountWon != null) ev.slots.loadValueWon = amountWon;
      }

      if (type === "ledger.post") {
        if (amountWon != null) ev.slots.amountWon = amountWon;
        // summary/counterparty are NOT inferred by default (no guessing)
        if (person) ev.slots.counterparty = person;
      }

      // detect bank account token as PII (kept as token)
      const acct = text.match(/\b\d{2,4}-\d{2,4}-\d{2,6}\b/);
      if (acct) {
        const token = this.pii.store(acct[0]);
        ev.slots.bankAccountToken = token;
      }

      // missing slot questions
      for (const slotDef of def.slots) {
        if (!slotDef.required) continue;
        if (ev.slots[slotDef.name] === undefined || ev.slots[slotDef.name] === null || ev.slots[slotDef.name] === "") {
          missing.push({
            eventId: ev.id,
            eventType: type,
            slot: slotDef.name,
            question: slotDef.question
          });
        }
      }

      events.push(ev);
    }

    return { ok: true, events, missing };
  }
}
