import { Body, Controller, Post } from "@nestjs/common";
import { PlannerService } from "./planner.service";

@Controller("planner")
export class PlannerController {
  constructor(private readonly planner: PlannerService) {}

  @Post()
  async plan(@Body() body: { command?: string }) {
    return this.planner.plan(body?.command ?? "");
  }
}
