import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import { z } from "zod";
import { CommandService } from "./command.service";

const Schema = z.object({ command: z.string().min(1), idempotencyKey: z.string().min(8).optional() });

@Controller("commands")
export class CommandController {
  constructor(private svc: CommandService) {}

  @Post()
  async create(@Body() body: any) {
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        message: "Validation failed",
        errors: parsed.error.errors
      });
    }
    return await this.svc.create(parsed.data.command, parsed.data.idempotencyKey);
  }
}
