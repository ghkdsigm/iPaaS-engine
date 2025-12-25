import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { config } from "./common/config/config";
import { AuthModule } from "./modules/auth/auth.module";
import { LoggerModule } from "./common/logging/logger.module";
import { ToolRegistryModule } from "./modules/tool-registry/tool-registry.module";
import { InterpreterModule } from "./modules/interpreter/interpreter.module";
import { PlannerModule } from "./modules/planner/planner.module";
import { PolicyModule } from "./modules/policy/policy.module";
import { ApprovalsModule } from "./modules/approvals/approvals.module";
import { RunsModule } from "./modules/runs/runs.module";
import { CommandModule } from "./modules/command-api/command.module";
import { McpClientModule } from "./modules/mcp-client/mcp-client.module";
import { WorkflowEngineModule } from "./modules/workflow-engine/workflow-engine.module";
import { PrismaModule } from "./modules/tool-registry/repositories/tool.repo"; // re-exported module

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    AuthModule,
    LoggerModule,
    McpClientModule,
    ToolRegistryModule,
    InterpreterModule,
    PlannerModule,
    PolicyModule,
    WorkflowEngineModule,
    ApprovalsModule,
    RunsModule,
    CommandModule
  ]
})
export class AppModule {}
