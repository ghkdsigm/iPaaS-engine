import { Injectable } from "@nestjs/common";

type ToolCatalogItem = {
  name: string;
  description?: string | null;
  riskLevel?: string | null;
  requiredRoles?: string[];
  piiFields?: string[];
  argsSchema?: any;
};

@Injectable()
export class AnthropicService {
  private apiKey = process.env.ANTHROPIC_API_KEY || "";
  private model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";

  async planJSON(input: { spec: any; toolCatalog: ToolCatalogItem[] }): Promise<any | null> {
    if (!this.apiKey) return null;

    const prompt = this.buildPrompt(input.spec, input.toolCatalog);

    const body = {
      model: this.model,
      max_tokens: 800,
      temperature: 0,
      messages: [{ role: "user", content: prompt }]
    };

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) return null;
    const json: any = await res.json();
    const text = Array.isArray(json.content) ? json.content.map((c: any) => c.text).join("\n")
 : "";

    const extracted = this.extractJson(text);
    return extracted;
  }

  private buildPrompt(spec: any, tools: ToolCatalogItem[]) {
    const toolLines = tools
      .map(t => `- ${t.name}: ${t.description || ""} (risk=${t.riskLevel || "LOW"})`)
      .join("\n")
;

    return [
      "You are a workflow planner for a company automation platform.",
      "Return ONLY valid JSON that matches this shape:",
      '{ "steps": [ { "tool": "server.tool", "args": { ... }, "timeoutMs": 15000 } ] }',
      "",
      "Rules:",
      "- Use only tools from the catalog.",
      "- Do not invent tools.",
      "- If required information is missing, keep args as placeholders or omit optional fields.",
      "- Prefer safer tools and minimize PII.",
      "",
      "Tool catalog:",
      toolLines,
      "",
      "CommandSpec:",
      JSON.stringify(spec)
    ].join("\n")
;
  }

  private extractJson(text: string): any | null {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    const slice = text.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {
      return null;
    }
  }
}