import { Module } from "@nestjs/common";
import { ToolRegistryService } from "./tool-registry.service";
import { ToolRegistryController } from "./tool-registry.controller";
import { McpClientModule } from "../mcp-client/mcp-client.module";

@Module({
  imports: [McpClientModule],
  providers: [ToolRegistryService],
  controllers: [ToolRegistryController],
  exports: [ToolRegistryService]
})
export class ToolRegistryModule {}
