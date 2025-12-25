import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApprovalsService } from "./approvals.service";

@Controller("approvals")
export class ApprovalsController {
  constructor(private svc: ApprovalsService) {}

  @Get()
  list() { return this.svc.list(); }

  @Post(":id/approve")
  approve(@Param("id") id: string) { return this.svc.approve(id); }

  @Post(":id/reject")
  reject(@Param("id") id: string) { return this.svc.reject(id); }
}
