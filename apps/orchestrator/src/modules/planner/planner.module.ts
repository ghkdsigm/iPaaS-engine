import { Module } from "@nestjs/common";
import { PlannerService } from "./planner.service";
import { AnthropicService } from "./llm/anthropic.service";

@Module({
  providers: [PlannerService, AnthropicService],
  exports: [PlannerService]
})
export class PlannerModule {}
