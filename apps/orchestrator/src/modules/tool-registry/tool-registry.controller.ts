import { Controller, Get, Query } from "@nestjs/common";
import { ToolRegistryService } from "./tool-registry.service";

@Controller("tool-registry")
export class ToolRegistryController {
  constructor(private svc: ToolRegistryService) {}

  @Get("sync")
  sync(@Query("server") server: string = "hr") {
    return this.svc.sync(server);
  }

  @Get("tools")
  list() {
    return this.svc.list();
  }
}
