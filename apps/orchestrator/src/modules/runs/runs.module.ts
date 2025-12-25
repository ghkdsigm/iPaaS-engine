import { Module } from "@nestjs/common";
import { RunsController } from "./runs.controller";
import { RunsService } from "./runs.service";
import { HealthController } from "./health.controller";

@Module({
  controllers: [RunsController, HealthController],
  providers: [RunsService]
})
export class RunsModule {}
