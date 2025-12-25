import { Module } from "@nestjs/common";
import { CommandController } from "./command.controller";
import { CommandService } from "./command.service";
import { InterpreterModule } from "../interpreter/interpreter.module";
import { PlannerModule } from "../planner/planner.module";
import { PolicyModule } from "../policy/policy.module";
import { ToolRegistryModule } from "../tool-registry/tool-registry.module";
import { WorkflowEngineModule } from "../workflow-engine/workflow-engine.module";
import { LoggerModule } from "../../common/logging/logger.module";

@Module({
  imports: [InterpreterModule, PlannerModule, PolicyModule, ToolRegistryModule, WorkflowEngineModule, LoggerModule],
  controllers: [CommandController],
  providers: [CommandService],
  exports: [CommandService]
})
export class CommandModule {}
