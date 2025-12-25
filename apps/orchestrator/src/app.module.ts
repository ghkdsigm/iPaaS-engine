import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { config } from "./common/config/config";
import { AuthModule } from "./modules/auth/auth.module";
import { ToolRegistryModule } from "./modules/tool-registry/tool-registry.module";
import { InterpreterModule } from "./modules/interpreter/interpreter.module";
import { PlannerModule } from "./modules/planner/planner.module";
import { PolicyModule } from "./modules/policy/policy.module";
import { ApprovalsModule } from "./modules/approvals/approvals.module";
import { RunsModule } from "./modules/runs/runs.module";
import { CommandModule } from "./modules/command-api/command.module";
import { McpClientModule } from "./modules/mcp-client/mcp-client.module";
import { WorkflowEngineModule } from "./modules/workflow-engine/workflow-engine.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    PrismaModule,
    AuthModule,
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
