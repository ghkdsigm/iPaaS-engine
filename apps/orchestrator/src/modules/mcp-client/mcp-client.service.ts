import { Injectable } from "@nestjs/common";
import { HttpTransport } from "./transport/http.transport";
import { ServerDiscovery } from "./discovery/server.discovery";

@Injectable()
export class McpClientService {
  readonly http = new HttpTransport();
  readonly discovery = new ServerDiscovery(this.http);

  async listTools(baseUrl: string) {
    return this.http.getJson(new URL("/tools", baseUrl).toString(), 15000);
  }

  async execute(baseUrl: string, tool: string, args: any, timeoutMs?: number) {
    return this.http.postJson(new URL("/execute", baseUrl).toString(), { tool, args }, timeoutMs || 15000);
  }
}
