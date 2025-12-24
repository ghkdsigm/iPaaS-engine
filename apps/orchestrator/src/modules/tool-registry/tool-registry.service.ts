import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { McpClientService } from "../mcp-client/mcp-client.service";
import { DomainError } from "../../common/errors/domain.error";

@Injectable()
export class ToolRegistryService {
  constructor(private prisma: PrismaClient, private mcp: McpClientService) {}

  async ensureServer(name: string) {
    const baseUrl = name === "hr" ? (process.env.HR_MCP_BASE_URL || "http://localhost:4001") : "";
    if (!baseUrl) throw new DomainError("BAD_SERVER", "Unknown server", 400);

    const existing = await this.prisma.toolServer.findUnique({ where: { name } });
    if (existing) return existing;
    return await this.prisma.toolServer.create({ data: { name, baseUrl } });
  }

  async sync(serverName: string) {
    const server = await this.ensureServer(serverName);
    const remote = await this.mcp.discovery.listTools(server.baseUrl);
    const tools: any[] = remote.tools || [];
    const tx = tools.map(t =>
      this.prisma.tool.upsert({
        where: { serverId_name: { serverId: server.id, name: t.name } },
        create: {
          serverId: server.id,
          name: t.name,
          description: t.description || null,
          riskLevel: t.riskLevel || "LOW",
          requiredRoles: Array.isArray(t.requiredRoles) ? t.requiredRoles : [],
          piiFields: Array.isArray(t.piiFields) ? t.piiFields : [],
          argsSchema: t.argsSchema ?? null
        },
        update: {
          description: t.description || null,
          riskLevel: t.riskLevel || "LOW",
          requiredRoles: Array.isArray(t.requiredRoles) ? t.requiredRoles : [],
          piiFields: Array.isArray(t.piiFields) ? t.piiFields : [],
          argsSchema: t.argsSchema ?? null
        }
      })
    );
    await this.prisma.$transaction(tx);
    return { ok: true, server: server.name, toolCount: tools.length };
  }

  async list() {
    const tools = await this.prisma.tool.findMany({ include: { server: true }, orderBy: { name: "asc" } });
    return { tools };
  }

  async getToolByName(name: string) {
    const tool = await this.prisma.tool.findFirst({ where: { name }, include: { server: true } });
    if (!tool) throw new DomainError("TOOL_NOT_FOUND", `Tool not found: ${name}`, 404);
    return tool;
  }
}
