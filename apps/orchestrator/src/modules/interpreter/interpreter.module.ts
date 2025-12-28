import { Module } from "@nestjs/common";
import { ToolRegistryModule } from "../tool-registry/tool-registry.module";
import { InterpreterService } from "./interpreter.service";

@Module({
  imports: [ToolRegistryModule],
  providers: [InterpreterService],
  exports: [InterpreterService]
})
export class InterpreterModule {}
