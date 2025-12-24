import { Module } from "@nestjs/common";
import { InterpreterService } from "./interpreter.service";

@Module({
  providers: [InterpreterService],
  exports: [InterpreterService]
})
export class InterpreterModule {}
