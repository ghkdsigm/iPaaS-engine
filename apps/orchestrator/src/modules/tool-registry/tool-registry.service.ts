import { Injectable } from "@nestjs/common";
import { PrismaClient, type Tool } from "@prisma/client";
import { McpClientService } from "../mcp-client/mcp-client.service";
import { DomainError } from "../../common/errors/domain.error";

type ServerEnvMap = Record<string, { env: string; fallback: string }>;

const SERVER_ENV: ServerEnvMap = {
  hr: { env: "HR_MCP_BASE_URL", fallback: "http://localhost:4001" },
  finance: { env: "FINANCE_MCP_BASE_URL", fallback: "http://localhost:4011" },
  dispatch: { env: "DISPATCH_MCP_BASE_URL", fallback: "http://localhost:4021" },
  ledger: { env: "LEDGER_MCP_BASE_URL", fallback: "http://localhost:4031" }
};

function getServerBaseUrl(name: string) {
  const cfg = SERVER_ENV[name];
  if (!cfg) return "";
  return (process.env[cfg.env] || cfg.fallback).trim();
}

function normalizeToolRow(raw: any): {
  name: string;
  description?: string;
  riskLevel?: string;
  requiredRoles?: string[];
  piiFields?: string[];
  argsSchema?: any;
  tags?: string[];
  eventTypes?: string[];
} {
  return {
    name: String(raw?.name || "").trim(),
    description: raw?.description ? String(raw.description) : undefined,
    riskLevel: raw?.riskLevel ? String(raw.riskLevel) : undefined,
    requiredRoles: Array.isArray(raw?.requiredRoles) ? raw.requiredRoles.map(String) : undefined,
    piiFields: Array.isArray(raw?.piiFields) ? raw.piiFields.map(String) : undefined,
    argsSchema: raw?.argsSchema ?? undefined,
    tags: Array.isArray(raw?.tags) ? raw.tags.map(String) : undefined,
    eventTypes: Array.isArray(raw?.eventTypes) ? raw.eventTypes.map(String) : undefined
  };
}

@Injectable()
export class ToolRegistryService {
  constructor(private prisma: PrismaClient, private mcp: McpClientService) {}

  async ensureServer(name: string) {
    const baseUrl = getServerBaseUrl(name);
    if (!baseUrl) throw new DomainError("BAD_SERVER", `Unknown server: ${name}`, 400);

    const existing = await this.prisma.toolServer.findUnique({ where: { name } });
    if (existing) {
      if (existing.baseUrl !== baseUrl) {
        return await this.prisma.toolServer.update({ where: { id: existing.id }, data: { baseUrl } });
      }
      return existing;
    }

    return await this.prisma.toolServer.create({ data: { name, baseUrl } });
  }

  async sync(name: string) {
    const server = await this.ensureServer(name);
    const remote = await this.mcp.listTools(server.baseUrl);

    const tools = Array.isArray(remote?.tools) ? remote.tools : [];
    let upserted = 0;

    for (const t of tools) {
      const row = normalizeToolRow(t);
      if (!row.name) continue;

      await this.prisma.tool.upsert({
        where: { serverId_name: { serverId: server.id, name: row.name } },
        create: {
          serverId: server.id,
          name: row.name,
          description: row.description,
          riskLevel: row.riskLevel || "LOW",
          requiredRoles: row.requiredRoles || [],
          piiFields: row.piiFields || [],
          argsSchema: row.argsSchema ?? null,
          tags: row.tags || [],
          eventTypes: row.eventTypes || []
        },
        update: {
          description: row.description,
          riskLevel: row.riskLevel || "LOW",
          requiredRoles: row.requiredRoles || [],
          piiFields: row.piiFields || [],
          argsSchema: row.argsSchema ?? null,
          tags: row.tags || [],
          eventTypes: row.eventTypes || []
        }
      });

      upserted += 1;
    }

    return { ok: true, server: server.name, toolCount: upserted };
  }

  async list() {
    const tools = await this.prisma.tool.findMany({
      include: { server: true },
      orderBy: [{ name: "asc" }]
    });
    return { tools };
  }

  async getToolByName(name: string) {
    const tool = await this.prisma.tool.findFirst({ where: { name }, include: { server: true } });
    if (!tool) throw new DomainError("TOOL_NOT_FOUND", `Tool not found: ${name}`, 404);
    return tool;
  }

  async findCandidatesForEvent(eventType: string) {
    // Primary: explicit mapping via eventTypes[] (array contains)
    const explicit = await this.prisma.tool.findMany({
      where: { eventTypes: { has: eventType } },
      include: { server: true }
    });

    // Secondary: tags[] contains event:<eventType>
    const tagKey = `event:${eventType}`;
    const tagged = await this.prisma.tool.findMany({
      where: { tags: { has: tagKey } },
      include: { server: true }
    });

    // Tertiary: name prefix match (payroll.pay -> payroll.*)
    const prefix = eventType.split(".")[0];
    const prefixed = await this.prisma.tool.findMany({
      where: { name: { startsWith: prefix + "." } },
      include: { server: true }
    });

    const merged = new Map<string, Tool & any>();
    for (const t of [...explicit, ...tagged, ...prefixed]) merged.set(`${t.serverId}:${t.name}`, t);

    const arr = [...merged.values()];

    arr.sort((a: any, b: any) => {
      // prefer exact name match
      const ae = a.name === eventType ? 1 : 0;
      const be = b.name === eventType ? 1 : 0;
      if (ae !== be) return be - ae;

      // prefer tagged primary
      const ap = Array.isArray(a.tags) && a.tags.includes("primary") ? 1 : 0;
      const bp = Array.isArray(b.tags) && b.tags.includes("primary") ? 1 : 0;
      if (ap !== bp) return bp - ap;

      // prefer lower risk
      const riskOrder = { LOW: 0, MEDIUM: 1, HIGH: 2 };
      const ar = riskOrder[a.riskLevel as keyof typeof riskOrder] ?? 99;
      const br = riskOrder[b.riskLevel as keyof typeof riskOrder] ?? 99;
      if (ar !== br) return ar - br;

      return a.name.localeCompare(b.name);
    });

    return arr;
  }
}
