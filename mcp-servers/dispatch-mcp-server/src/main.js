import express from "express";
import { z } from "zod";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 4021);

const tools = [
  {
    name: "dispatch.assign_order",
    description: "Assign an order/dispatch to a specific assignee (simulation).",
    riskLevel: "MEDIUM",
    requiredRoles: ["DISPATCH", "ADMIN"],
    piiFields: ["assignee"],
    tags: ["event:dispatch.assign", "primary"],
    eventTypes: ["dispatch.assign"],
    argsSchema: {
      type: "object",
      additionalProperties: false,
      required: ["assignee", "date", "loadValueWon"],
      properties: {
        assignee: { type: "string", minLength: 1 },
        date: { type: "string", minLength: 1 },
        loadValueWon: { type: "integer", minimum: 1 },
        orderId: { type: "string" },
        notes: { type: "string" }
      }
    }
  }
];

app.get("/health", (_req, res) => res.json({ ok: true, service: "dispatch-mcp-server" }));
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

  if (tool !== "dispatch.assign_order") {
    return res.status(404).json({ ok: false, error: `Unknown tool: ${tool}` });
  }

  const assignee = typeof args.assignee === "string" ? args.assignee.trim() : "";
  const date = typeof args.date === "string" ? args.date.trim() : "";
  const loadValueWon = typeof args.loadValueWon === "number" ? args.loadValueWon : Number(args.loadValueWon);

  if (!assignee) return res.status(400).json({ ok: false, error: "assignee is required" });
  if (!date) return res.status(400).json({ ok: false, error: "date is required" });
  if (!Number.isFinite(loadValueWon) || loadValueWon <= 0) return res.status(400).json({ ok: false, error: "loadValueWon must be a positive number" });

  const dispatchId = `DSP-${Date.now()}`;

  return res.json({
    ok: true,
    result: {
      dispatchId,
      assignee,
      date,
      loadValueWon,
      orderId: typeof args.orderId === "string" ? args.orderId : undefined,
      notes: typeof args.notes === "string" ? args.notes : undefined,
      simulated: true
    }
  });
});

app.listen(PORT, () => {
  console.log(`[dispatch-mcp-server] listening on :${PORT}`);
});
