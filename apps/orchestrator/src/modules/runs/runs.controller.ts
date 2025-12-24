import { Controller, Get } from "@nestjs/common";
import { RunsService } from "./runs.service";

@Controller("runs")
export class RunsController {
  constructor(private svc: RunsService) {}
  @Get() list() { return this.svc.list(); }
}
