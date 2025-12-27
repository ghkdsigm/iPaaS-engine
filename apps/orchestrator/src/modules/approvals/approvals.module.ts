import { Module } from "@nestjs/common";
import { ApprovalsController } from "./approvals.controller";
import { ApprovalsService } from "./approvals.service";
import { WorkflowEngineModule } from "../workflow-engine/workflow-engine.module";
import { ToolRegistryModule } from "../tool-registry/tool-registry.module";

@Module({
  imports: [WorkflowEngineModule, ToolRegistryModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService]
})
export class ApprovalsModule {}
