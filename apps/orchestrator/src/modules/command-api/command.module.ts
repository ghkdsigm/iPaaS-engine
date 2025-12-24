import { Module } from "@nestjs/common";
import { CommandController } from "./command.controller";
import { CommandService } from "./command.service";
import { ToolRegistryModule } from "../tool-registry/tool-registry.module";
import { InterpreterModule } from "../interpreter/interpreter.module";
import { PlannerModule } from "../planner/planner.module";
import { PolicyModule } from "../policy/policy.module";
import { WorkflowEngineModule } from "../workflow-engine/workflow-engine.module";

@Module({
  imports: [ToolRegistryModule, InterpreterModule, PlannerModule, PolicyModule, WorkflowEngineModule],
  controllers: [CommandController],
  providers: [CommandService]
})
export class CommandModule {}
