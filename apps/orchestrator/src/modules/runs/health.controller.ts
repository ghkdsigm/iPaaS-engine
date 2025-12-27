import { Controller, Get } from "@nestjs/common";

const ENGINE = "event-slot-v1";
const BUILD = process.env.BUILD_SHA || process.env.GIT_SHA || "dev";

@Controller("health")
export class HealthController {
  @Get()
  health() {
    return {
      ok: true,
      service: "orchestrator",
      engine: ENGINE,
      build: BUILD,
      time: new Date().toISOString()
    };
  }
}
