import { Module } from "@nestjs/common";
import { ApprovalsController } from "./approvals.controller";
import { ApprovalsService } from "./approvals.service";
import { WorkflowEngineModule } from "../workflow-engine/workflow-engine.module";
import { ToolRegistryModule } from "../tool-registry/tool-registry.module";
import { InterpreterModule } from "../interpreter/interpreter.module";

@Module({
  imports: [WorkflowEngineModule, ToolRegistryModule, InterpreterModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
})
export class ApprovalsModule {}
