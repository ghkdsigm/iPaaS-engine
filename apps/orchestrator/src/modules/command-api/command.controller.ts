import { Body, Controller, Post } from "@nestjs/common";
import { z } from "zod";
import { CommandService } from "./command.service";

const Schema = z.object({ command: z.string().min(1) });

@Controller("commands")
export class CommandController {
  constructor(private svc: CommandService) {}
  @Post()
  create(@Body() body: any) {
    const parsed = Schema.parse(body);
    return this.svc.create(parsed.command);
  }
}
