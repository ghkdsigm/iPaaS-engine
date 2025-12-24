import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AuthService } from "../../modules/auth/auth.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return false;
    const user = this.auth.verify(token);
    req.user = user;
    return true;
  }
}
