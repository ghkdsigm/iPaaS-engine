import { Module } from "@nestjs/common";
import { WorkflowEngineService } from "./workflow-engine.service";
import { ToolRegistryModule } from "../tool-registry/tool-registry.module";
import { McpClientModule } from "../mcp-client/mcp-client.module";

@Module({
  imports: [ToolRegistryModule, McpClientModule],
  providers: [WorkflowEngineService],
  exports: [WorkflowEngineService]
})
export class WorkflowEngineModule {}
