import express from "express";
import { z } from "zod";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 4031);

const PostArgs = z.object({
  date: z.string().min(1),
  amountWon: z.number().positive(),
  summary: z.string().min(1),
  counterparty: z.string().optional()
});

const tools = [
  {
    name: "ledger.post",
    description: "Post a ledger entry",
    riskLevel: "MEDIUM",
    requiredRoles: ["FINANCE", "ACCOUNTING"],
    piiFields: [],
    tags: ["primary", "event:ledger.post", "domain:ledger"],
    eventTypes: ["ledger.post"],
    argsSchema: {
      type: "object",
      properties: {
        date: { type: "string" },
        amountWon: { type: "number" },
        summary: { type: "string" },
        counterparty: { type: "string" }
      },
      required: ["date", "amountWon", "summary"],
      additionalProperties: false
    }
  }
];

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "ledger-mcp-server", time: new Date().toISOString() });
});

app.get("/tools", (_req, res) => {
  res.json({ tools });
});

app.post(["/execute", "/invoke"], async (req, res) => {
  const tool = typeof req.body?.tool === "string" ? req.body.tool : "";
  const args = req.body?.args ?? {};

  try {
    if (tool === "ledger.post") {
      const parsed = PostArgs.safeParse(args);
      if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

      const result = {
        entryId: `led_${Date.now()}`,
        status: "POSTED",
        postedAt: new Date().toISOString(),
        ...parsed.data
      };

      return res.json({ ok: true, result });
    }

    return res.status(404).json({ ok: false, error: `Unknown tool: ${tool}` });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ ok: false, error: message });
  }
});

app.listen(PORT, () => {
  console.log(`[ledger-mcp-server] listening on :${PORT}`);
});
