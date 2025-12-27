export type SlotType = "string" | "person" | "date" | "money_krw" | "bank_account";

export type SlotDefinition = {
  name: string;
  required: boolean;
  type: SlotType;
  question: string;
};

export type EventDefinition = {
  description: string;
  serverHint?: string;
  slots: SlotDefinition[];
  argMap?: Record<string, string>;
};

// NOTE: EventType is the contract between the interpreter -> planner -> tool registry.
// Add new types here when you introduce new executable tools.
export type EventType =
  | "payroll.pay"
  | "dispatch.assign"
  | "ledger.post"
  | "hr.generate_employee_id";

export type EventIntent = {
  id: string;
  type: EventType;
  slots: Record<string, any>;
  sourceText: string;
};

export type MissingSlot = {
  eventId: string;
  eventType: EventType;
  slot: string;
  question: string;
};

export type EventParseResult = {
  events: EventIntent[];
  missing: MissingSlot[];
  piiTokens: string[];
};
