import express from "express";
import { z } from "zod";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 4011);

const tools = [
  {
    name: "finance.pay_salary",
    description: "Execute a salary payment (simulation). Requires approval in most orgs.",
    riskLevel: "HIGH",
    requiredRoles: ["FINANCE", "ADMIN"],
    piiFields: ["name", "bankAccount"],
    tags: ["event:payroll.pay", "primary"],
    eventTypes: ["payroll.pay"],
    argsSchema: {
      type: "object",
      additionalProperties: false,
      required: ["name", "amountWon", "date"],
      properties: {
        name: { type: "string", minLength: 1 },
        amountWon: { type: "integer", minimum: 1 },
        date: { type: "string", minLength: 1 },
        memo: { type: "string" }
      }
    }
  }
];

app.get("/health", (_req, res) => res.json({ ok: true, service: "finance-mcp-server" }));
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

  if (tool !== "finance.pay_salary") {
    return res.status(404).json({ ok: false, error: `Unknown tool: ${tool}` });
  }

  const name = typeof args.name === "string" ? args.name.trim() : "";
  const date = typeof args.date === "string" ? args.date.trim() : "";
  const amountWon = typeof args.amountWon === "number" ? args.amountWon : Number(args.amountWon);

  if (!name) return res.status(400).json({ ok: false, error: "name is required" });
  if (!date) return res.status(400).json({ ok: false, error: "date is required" });
  if (!Number.isFinite(amountWon) || amountWon <= 0) return res.status(400).json({ ok: false, error: "amountWon must be a positive number" });

  const paymentId = `PAY-${Date.now()}`;

  return res.json({
    ok: true,
    result: {
      paymentId,
      name,
      date,
      amountWon,
      memo: typeof args.memo === "string" ? args.memo : undefined,
      simulated: true
    }
  });
});

app.listen(PORT, () => {
  console.log(`[finance-mcp-server] listening on :${PORT}`);
});
