import { Module } from "@nestjs/common";
import { ApprovalsController } from "./approvals.controller";
import { ApprovalsService } from "./approvals.service";
import { WorkflowEngineModule } from "../workflow-engine/workflow-engine.module";
import { ToolRegistryModule } from "../tool-registry/tool-registry.module";
import { InterpreterModule } from "../interpreter/interpreter.module";
import { LoggerModule } from "../../common/logging/logger.module";

@Module({
  imports: [WorkflowEngineModule, ToolRegistryModule, InterpreterModule, LoggerModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService],
  exports: [ApprovalsService]
})
export class ApprovalsModule {}
