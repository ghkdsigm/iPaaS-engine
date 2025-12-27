import { Module } from "@nestjs/common";
import { InterpreterModule } from "../interpreter/interpreter.module";
import { EventInterpreterService } from "./event-interpreter.service";

@Module({
  imports: [InterpreterModule],
  providers: [EventInterpreterService],
  exports: [EventInterpreterService]
})
export class EventingModule {}
