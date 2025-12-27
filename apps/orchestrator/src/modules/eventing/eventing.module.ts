import { Module } from "@nestjs/common";
import { EventInterpreterService } from "./event-interpreter.service";

@Module({
  providers: [EventInterpreterService],
  exports: [EventInterpreterService]
})
export class EventingModule {}
