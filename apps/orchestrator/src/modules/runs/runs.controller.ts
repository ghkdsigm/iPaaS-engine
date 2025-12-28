import { Controller, Get, Header, Res } from "@nestjs/common";
import { RunsService } from "./runs.service";

@Controller("runs")
export class RunsController {
  constructor(private svc: RunsService) {}
  
  @Get()
  @Header("Cache-Control", "no-cache, no-store, must-revalidate")
  @Header("Pragma", "no-cache")
  @Header("Expires", "0")
  async list(@Res() res: any) {
    const result = await this.svc.list();
    return res.json(result);
  }
}
