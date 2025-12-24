export type CommandSpec = {
  intent: string;
  entities: Record<string, any>;
  piiTokens: Record<string, string>;
};
