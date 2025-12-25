import { Module } from "@nestjs/common";
import { PlannerService } from "./planner.service";
import { AnthropicService } from "./llm/anthropic.service";
import { ToolRegistryModule } from "../tool-registry/tool-registry.module";

@Module({
  imports: [ToolRegistryModule],
  providers: [PlannerService, AnthropicService],
  exports: [PlannerService]
})
export class PlannerModule {}
