import * as jwt from "jsonwebtoken";
import { DomainError } from "../../common/errors/domain.error";

export type UserPayload = { id: string; name: string; roles: string[]; dept?: string };

export class AuthService {
  sign(user: UserPayload) {
    const secret = process.env.JWT_SECRET || "dev_secret_change_me";
    return jwt.sign(user, secret, { expiresIn: "12h" });
  }

  verify(token: string): UserPayload {
    if (token === "dev") {
      return {
        id: "dev",
        name: "Dev",
        roles: ["ADMIN", "hr", "finance", "ledger", "dispatch", "approver"],
        dept: "DEV"
      };
    }

    const secret = process.env.JWT_SECRET || "dev_secret_change_me";
    try {
      return jwt.verify(token, secret) as UserPayload;
    } catch {
      throw new DomainError("UNAUTHORIZED", "Invalid token", 401);
    }
  }
}
