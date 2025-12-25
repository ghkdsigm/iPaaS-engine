import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { ApprovalsService } from "./approvals.service";

const ResolveSchema = z.object({
  actorId: z.string().optional(),
  reason: z.string().optional()
});

@Controller("approvals")
export class ApprovalsController {
  constructor(private svc: ApprovalsService) {}

  @Get()
  list() {
    return this.svc.list();
  }

  @Post(":id/approve")
  approve(@Param("id") id: string, @Body() body: any) {
    const parsed = ResolveSchema.parse(body || {});
    return this.svc.approve(id, parsed.actorId || null);
  }

  @Post(":id/reject")
  reject(@Param("id") id: string, @Body() body: any) {
    const parsed = ResolveSchema.parse(body || {});
    return this.svc.reject(id, parsed.actorId || null, parsed.reason || "Rejected");
  }
}
