export type EventType = "payroll.pay" | "dispatch.assign" | "ledger.post";

export type SlotValue = string | number | boolean | null;

export type EventSlots = Record<string, SlotValue>;

export type EventIntent = {
  id: string;
  type: EventType;
  slots: EventSlots;
  sourceText: string;
};

export type MissingSlot = {
  eventId: string;
  eventType: EventType;
  slot: string;
  required: boolean;
  question: string;
};

export type EventParseResult = {
  ok: boolean;
  events: EventIntent[];
  missing: MissingSlot[];
  piiTokens: Record<string, string>;
  raw: string;
};
