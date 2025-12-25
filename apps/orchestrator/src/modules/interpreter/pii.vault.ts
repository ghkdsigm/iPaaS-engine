import crypto from "crypto";
import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { decryptAesGcm, encryptAesGcm } from "../../common/utils/crypto";

@Injectable()
export class PiiVault {
  constructor(private prisma: PrismaClient) {}

  async put(value: string) {
    const token = "pii_" + crypto.randomBytes(12).toString("hex");
    const enc = encryptAesGcm(value);
    await this.prisma.piiSecret.create({
      data: { token, cipherText: enc.cipherText, iv: enc.iv, tag: enc.tag }
    });
    return token;
  }

  async get(token: string) {
    const row = await this.prisma.piiSecret.findUnique({ where: { token } });
    if (!row) return null;
    return decryptAesGcm(row.cipherText, row.iv, row.tag);
  }
}
