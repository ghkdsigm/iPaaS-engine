import { Module } from "@nestjs/common";
import { CommandController } from "./command.controller";
import { CommandService } from "./command.service";
import { ToolRegistryModule } from "../tool-registry/tool-registry.module";
import { EventingModule } from "../eventing/eventing.module";
import { EventPlannerModule } from "../event-planner/event-planner.module";
import { PolicyModule } from "../policy/policy.module";
import { WorkflowEngineModule } from "../workflow-engine/workflow-engine.module";
import { InterpreterModule } from "../interpreter/interpreter.module";

@Module({
  imports: [ToolRegistryModule, InterpreterModule, EventingModule, EventPlannerModule, PolicyModule, WorkflowEngineModule],
  controllers: [CommandController],
  providers: [CommandService]
})
export class CommandModule {}
