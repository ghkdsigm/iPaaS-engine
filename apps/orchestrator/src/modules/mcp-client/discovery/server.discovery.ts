import { HttpTransport } from "../transport/http.transport";

export class ServerDiscovery {
  constructor(private http: HttpTransport) {}

  async listTools(baseUrl: string) {
    return this.http.getJson(new URL("/tools", baseUrl).toString());
  }
}
