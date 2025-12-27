import { Module } from "@nestjs/common";
import { ToolRegistryService } from "./tool-registry.service";
import { ToolRegistryController } from "./tool-registry.controller";
import { McpClientModule } from "../mcp-client/mcp-client.module";
import { ToolRepo } from "./repositories/tool.repo";

@Module({
  imports: [McpClientModule],
  providers: [ToolRegistryService, ToolRepo],
  controllers: [ToolRegistryController],
  exports: [ToolRegistryService, ToolRepo]
})
export class ToolRegistryModule {}
