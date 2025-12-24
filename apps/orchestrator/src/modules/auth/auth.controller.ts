import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { z } from "zod";
import { AuthService } from "./auth.service";
import { DomainError } from "../../common/errors/domain.error";

const LoginSchema = z.object({ username: z.string(), password: z.string() });

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("login")
  login(@Body() body: any) {
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) throw new DomainError("VALIDATION", "Invalid body", 400);

    // demo users
    const { username, password } = parsed.data;
    if (password !== "password") throw new DomainError("UNAUTHORIZED", "Bad credentials", 401);

    const roles = username === "hr" ? ["hr", "approver"] : ["viewer"];
    const token = this.auth.sign({ id: username, name: username, roles });
    return { ok: true, token };
  }

  @Get("me")
  me(@Req() req: any) {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) throw new DomainError("UNAUTHORIZED", "Missing token", 401);
    const user = this.auth.verify(token);
    return { ok: true, user };
  }
}
