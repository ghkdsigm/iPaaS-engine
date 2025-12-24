import crypto from "crypto";

export type VaultItem = { token: string; value: string };

export class PiiVault {
  private store = new Map<string, string>();

  put(value: string) {
    const token = "pii_" + crypto.randomBytes(8).toString("hex");
    this.store.set(token, value);
    return token;
  }

  get(token: string) {
    return this.store.get(token) || null;
  }
}
