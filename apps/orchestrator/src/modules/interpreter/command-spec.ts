export type CommandSpec = {
  intent: "NATURAL_COMMAND";
  entities: Record<string, any>;
  piiTokens: Record<string, string>;
  confidence?: Record<string, number>;
  unknownFields?: string[];
};
