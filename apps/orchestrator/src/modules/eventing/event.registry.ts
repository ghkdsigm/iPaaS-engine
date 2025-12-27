import { z } from "zod";
import type { EventType } from "./event.types";

export type SlotDef = {
  name: string;
  required: boolean;
  question: string;
  description?: string;
};

export type EventDefinition = {
  type: EventType;
  description: string;
  slots: SlotDef[];
  slotSchema: z.ZodObject<any>;
};

const DateSlot = z.string().min(1);

export const EVENT_DEFINITIONS: Record<EventType, EventDefinition> = {
  "payroll.pay": {
    type: "payroll.pay",
    description: "Pay salary or bonus to an employee",
    slots: [
      { name: "date", required: true, question: "언제 지급할까요? (예: 오늘, 2025-12-27)" },
      { name: "payee", required: true, question: "누구에게 지급할까요? (예: 기대리)" },
      { name: "amountWon", required: true, question: "지급 금액은 얼마인가요? (원 단위)" },
      { name: "reason", required: false, question: "지급 사유/메모가 있으면 알려주세요." }
    ],
    slotSchema: z.object({
      date: DateSlot,
      payee: z.string().min(1),
      amountWon: z.number().positive(),
      reason: z.string().optional()
    })
  },
  "dispatch.assign": {
    type: "dispatch.assign",
    description: "Assign a dispatch/vehicle order to a person",
    slots: [
      { name: "date", required: true, question: "배차 날짜는 언제인가요?" },
      { name: "assignee", required: true, question: "누구에게 배차 배치할까요? (예: 기대리)" },
      { name: "loadValueWon", required: false, question: "물량/금액 정보가 있나요? (예: 500만원)" },
      { name: "memo", required: false, question: "배차 메모가 있으면 알려주세요." }
    ],
    slotSchema: z.object({
      date: DateSlot,
      assignee: z.string().min(1),
      loadValueWon: z.number().optional(),
      memo: z.string().optional()
    })
  },
  "ledger.post": {
    type: "ledger.post",
    description: "Create a ledger entry",
    slots: [
      { name: "date", required: true, question: "장부 날짜는 언제로 기록할까요?" },
      { name: "amountWon", required: true, question: "장부에 기록할 금액은 얼마인가요?" },
      { name: "summary", required: true, question: "장부 적요(설명)를 한 줄로 알려주세요." },
      { name: "counterparty", required: false, question: "상대방/대상자가 있나요?" }
    ],
    slotSchema: z.object({
      date: DateSlot,
      amountWon: z.number().positive(),
      summary: z.string().min(1),
      counterparty: z.string().optional()
    })
  }
};

export function requiredSlotsFor(type: EventType) {
  return EVENT_DEFINITIONS[type].slots.filter(s => s.required);
}
