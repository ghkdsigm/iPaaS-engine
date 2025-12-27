import { Module } from "@nestjs/common";
import { ToolRegistryModule } from "../tool-registry/tool-registry.module";
import { EventPlannerService } from "./event-planner.service";

@Module({
  imports: [ToolRegistryModule],
  providers: [EventPlannerService],
  exports: [EventPlannerService]
})
export class EventPlannerModule {}
