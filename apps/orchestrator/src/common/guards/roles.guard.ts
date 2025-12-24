import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const required: string[] = req.requiredRoles || [];
    if (!required.length) return true;
    const roles: string[] = user?.roles || [];
    return required.every(r => roles.includes(r));
  }
}
