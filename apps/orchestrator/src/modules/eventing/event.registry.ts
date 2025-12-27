import type { EventDefinition } from "./event.types";

export const EVENT_DEFINITIONS: Record<string, EventDefinition> = {
  "hr.generate_employee_id": {
    description: "Generate an employee id for a new hire",
    serverHint: "hr",
    slots: [
      { name: "name", required: true, type: "person", question: "입사자 이름이 누구인가요?" },
      { name: "startDate", required: false, type: "date", question: "입사일이 언제인가요? (예: 내일, 2025-12-27)" },
      { name: "team", required: false, type: "string", question: "배치될 팀/부서를 알려주세요. (예: 개발팀)" }
    ],
    argMap: {
      name: "name",
      startDate: "startDate",
      team: "team"
    }
  },

  "payroll.pay": {
    description: "Pay salary to an employee",
    serverHint: "finance",
    slots: [
      { name: "date", required: true, type: "date", question: "급여 지급 날짜가 언제인가요? (예: 오늘, 2025-12-27)" },
      { name: "payee", required: true, type: "person", question: "급여를 받을 대상(이름)은 누구인가요?" },
      { name: "amountWon", required: true, type: "money_krw", question: "지급할 금액이 얼마인가요? (예: 500만원)" },
      { name: "memo", required: false, type: "string", question: "메모가 있으면 알려주세요." }
    ],
    argMap: {
      date: "date",
      payee: "name",
      amountWon: "amountWon",
      memo: "memo"
    }
  },

  "dispatch.assign": {
    description: "Assign dispatch/order to an assignee",
    serverHint: "dispatch",
    slots: [
      { name: "date", required: true, type: "date", question: "배차 날짜가 언제인가요? (예: 오늘, 2025-12-27)" },
      { name: "assignee", required: true, type: "person", question: "배차 담당자(이름)는 누구인가요?" },
      { name: "loadValueWon", required: true, type: "money_krw", question: "물량/금액(원)이 얼마인가요? (예: 500만원)" },
      { name: "orderId", required: false, type: "string", question: "오더/배차 번호가 있나요?" },
      { name: "notes", required: false, type: "string", question: "추가 메모가 있나요?" }
    ],
    argMap: {
      date: "date",
      assignee: "assignee",
      loadValueWon: "loadValueWon",
      orderId: "orderId",
      notes: "notes"
    }
  },

  "ledger.post": {
    description: "Post a ledger entry",
    serverHint: "ledger",
    slots: [
      { name: "date", required: true, type: "date", question: "장부 반영 날짜가 언제인가요? (예: 오늘, 2025-12-27)" },
      { name: "amountWon", required: true, type: "money_krw", question: "장부에 적을 금액이 얼마인가요? (예: 500만원)" },
      { name: "summary", required: true, type: "string", question: "장부 요약(적요)을 뭐라고 적을까요?" },
      { name: "counterparty", required: true, type: "string", question: "상대방/대상(거래처/담당자)을 무엇으로 적을까요?" },
      { name: "ref", required: false, type: "string", question: "참조번호가 있나요?" }
    ],
    argMap: {
      date: "date",
      amountWon: "amountWon",
      summary: "summary",
      counterparty: "counterparty",
      ref: "ref"
    }
  }
};

export function argKeyFor(eventType: string, slotName: string) {
  const def = EVENT_DEFINITIONS[eventType];
  if (!def) return slotName;
  return def.argMap?.[slotName] || slotName;
}
