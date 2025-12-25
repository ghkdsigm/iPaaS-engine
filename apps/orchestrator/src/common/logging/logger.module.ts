import { Global, Module } from "@nestjs/common";
import { PinoLogger } from "./pino.logger";
import { AuditService } from "./audit.service";

@Global()
@Module({
  providers: [PinoLogger, AuditService],
  exports: [PinoLogger, AuditService]
})
export class LoggerModule {}
