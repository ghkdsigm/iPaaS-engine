import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class ToolRepo {
  constructor(private prisma: PrismaClient) {}

  findToolByName(name: string) {
    return this.prisma.tool.findFirst({ where: { name }, include: { server: true } });
  }

  upsertToolServer(name: string, baseUrl: string) {
    return this.prisma.toolServer.upsert({
      where: { name },
      create: { name, baseUrl },
      update: { baseUrl }
    });
  }
}
