import { Module } from "@nestjs/common";
import { InterpreterService } from "./interpreter.service";
import { PiiVault } from "./pii.vault";

@Module({
  providers: [InterpreterService, PiiVault],
  exports: [InterpreterService, PiiVault]
})
export class InterpreterModule {}
