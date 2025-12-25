import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";

function getKey(): Buffer {
  const raw = process.env.PII_VAULT_KEY || "";
  if (!raw) {
    throw new Error("PII_VAULT_KEY is required (32 bytes key in hex or base64)");
  }
  const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("PII_VAULT_KEY must be 32 bytes");
  return buf;
}

function encrypt(plain: string) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const cipherText = Buffer.concat([cipher.update(Buffer.from(plain, "utf-8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    cipherText: cipherText.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64")
  };
}

function decrypt(enc: { cipherText: string; iv: string; tag: string }) {
  const key = getKey();
  const iv = Buffer.from(enc.iv, "base64");
  const tag = Buffer.from(enc.tag, "base64");
  const cipherText = Buffer.from(enc.cipherText, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return plain.toString("utf-8");
}

@Injectable()
export class PiiVault {
  constructor(private prisma: PrismaClient) {}

  async put(value: string) {
    const token = "pii_" + crypto.randomBytes(12).toString("hex");
    const enc = encrypt(value);
    await this.prisma.piiSecret.create({
      data: { token, cipherText: enc.cipherText, iv: enc.iv, tag: enc.tag }
    });
    return token;
  }

  async get(token: string) {
    const row = await this.prisma.piiSecret.findUnique({ where: { token } });
    if (!row) return null;
    return decrypt({ cipherText: row.cipherText, iv: row.iv, tag: row.tag });
  }
}
