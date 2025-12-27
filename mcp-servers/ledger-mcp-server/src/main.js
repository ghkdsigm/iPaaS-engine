import express from "express";
import { z } from "zod";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 4031);

const tools = [
  {
    name: "ledger.post_entry",
    description: "Post a ledger entry (simulation). High risk by default.",
    riskLevel: "HIGH",
    requiredRoles: ["LEDGER", "FINANCE", "ADMIN"],
    piiFields: [],
    tags: ["event:ledger.post", "primary"],
    eventTypes: ["ledger.post"],
    argsSchema: {
      type: "object",
      additionalProperties: false,
      required: ["date", "amountWon", "summary", "counterparty"],
      properties: {
        date: { type: "string", minLength: 1 },
        amountWon: { type: "integer", minimum: 1 },
        summary: { type: "string", minLength: 1 },
        counterparty: { type: "string", minLength: 1 },
        ref: { type: "string" }
      }
    }
  }
];

app.get("/health", (_req, res) => res.json({ ok: true, service: "ledger-mcp-server" }));
app.get("/tools", (_req, res) => res.json({ tools }));

const ExecuteBodySchema = z
  .object({
    tool: z.string(),
    args: z.record(z.any()).optional()
  })
  .passthrough();

app.post(["/execute", "/invoke"], (req, res) => {
  const parsed = ExecuteBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const tool = parsed.data.tool;
  const args = parsed.data.args || {};

  if (tool !== "ledger.post_entry") {
    return res.status(404).json({ ok: false, error: `Unknown tool: ${tool}` });
  }

  const date = typeof args.date === "string" ? args.date.trim() : "";
  const summary = typeof args.summary === "string" ? args.summary.trim() : "";
  const counterparty = typeof args.counterparty === "string" ? args.counterparty.trim() : "";
  const amountWon = typeof args.amountWon === "number" ? args.amountWon : Number(args.amountWon);

  if (!date) return res.status(400).json({ ok: false, error: "date is required" });
  if (!summary) return res.status(400).json({ ok: false, error: "summary is required" });
  if (!counterparty) return res.status(400).json({ ok: false, error: "counterparty is required" });
  if (!Number.isFinite(amountWon) || amountWon <= 0) return res.status(400).json({ ok: false, error: "amountWon must be a positive number" });

  const entryId = `LED-${Date.now()}`;

  return res.json({
    ok: true,
    result: {
      entryId,
      date,
      amountWon,
      summary,
      counterparty,
      ref: typeof args.ref === "string" ? args.ref : undefined,
      simulated: true
    }
  });
});

app.listen(PORT, () => {
  console.log(`[ledger-mcp-server] listening on :${PORT}`);
});
