import { Module } from "@nestjs/common";
import { WorkflowEngineService } from "./workflow-engine.service";
import { ToolRegistryModule } from "../tool-registry/tool-registry.module";
import { McpClientModule } from "../mcp-client/mcp-client.module";
import { LoggerModule } from "../../common/logging/logger.module";

@Module({
  imports: [ToolRegistryModule, McpClientModule, LoggerModule],
  providers: [WorkflowEngineService],
  exports: [WorkflowEngineService]
})
export class WorkflowEngineModule {}
