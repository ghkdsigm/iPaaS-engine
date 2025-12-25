import crypto from "crypto";

function getKey() {
  const raw = process.env.PII_VAULT_KEY || "";
  // Accept base64 or hex; fall back to utf8 (dev only)
  let buf: Buffer;
  try {
    buf = Buffer.from(raw, "base64");
    if (buf.length === 32) return buf;
  } catch {}
  try {
    buf = Buffer.from(raw, "hex");
    if (buf.length === 32) return buf;
  } catch {}
  buf = Buffer.from(raw, "utf8");
  if (buf.length < 32) {
    const padded = Buffer.alloc(32);
    buf.copy(padded);
    return padded;
  }
  return buf.subarray(0, 32);
}

export function encryptAesGcm(plain: string) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    cipherText: ct.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64")
  };
}

export function decryptAesGcm(cipherTextB64: string, ivB64: string, tagB64: string) {
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(Buffer.from(cipherTextB64, "base64")), decipher.final()]);
  return plain.toString("utf8");
}
