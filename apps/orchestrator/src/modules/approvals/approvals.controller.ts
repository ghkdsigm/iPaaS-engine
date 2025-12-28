import { Controller, Get, Header, Param, Post, Res } from "@nestjs/common";
import { ApprovalsService } from "./approvals.service";

@Controller("approvals")
export class ApprovalsController {
  constructor(private svc: ApprovalsService) {}

  @Get()
  @Header("Cache-Control", "no-cache, no-store, must-revalidate")
  @Header("Pragma", "no-cache")
  @Header("Expires", "0")
  async list(@Res() res: any) {
    const result = await this.svc.list();
    return res.json(result);
  }

  @Post(":id/approve")
  async approve(@Param("id") id: string) {
    return await this.svc.approve(id);
  }

  @Post(":id/reject")
  async reject(@Param("id") id: string) {
    return await this.svc.reject(id);
  }
}
