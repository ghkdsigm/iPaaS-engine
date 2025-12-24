import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class RunsService {
  constructor(private prisma: PrismaClient) {}

  list() {
    return this.prisma.run.findMany({ orderBy: { createdAt: "desc" }, include: { steps: { orderBy: { index: "asc" } }, command: true } })
      .then(runs => ({ runs }));
  }
}
