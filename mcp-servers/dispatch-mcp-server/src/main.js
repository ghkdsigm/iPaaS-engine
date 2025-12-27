import express from "express";
import { z } from "zod";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 4021);

const AssignArgs = z.object({
  date: z.string().min(1),
  assignee: z.string().min(1),
  loadValueWon: z.number().optional(),
  memo: z.string().optional()
});

const tools = [
  {
    name: "dispatch.assign",
    description: "Assign a dispatch/job to a driver/staff",
    riskLevel: "LOW",
    requiredRoles: ["DISPATCH"],
    piiFields: [],
    tags: ["primary", "event:dispatch.assign", "domain:dispatch"],
    eventTypes: ["dispatch.assign"],
    argsSchema: {
      type: "object",
      properties: {
        date: { type: "string" },
        assignee: { type: "string" },
        loadValueWon: { type: "number" },
        memo: { type: "string" }
      },
      required: ["date", "assignee"],
      additionalProperties: false
    }
  }
];

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "dispatch-mcp-server", time: new Date().toISOString() });
});

app.get("/tools", (_req, res) => {
  res.json({ tools });
});

app.post(["/execute", "/invoke"], async (req, res) => {
  const tool = typeof req.body?.tool === "string" ? req.body.tool : "";
  const args = req.body?.args ?? {};

  try {
    if (tool === "dispatch.assign") {
      const parsed = AssignArgs.safeParse(args);
      if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

      const result = {
        dispatchId: `disp_${Date.now()}`,
        status: "ASSIGNED",
        assignedAt: new Date().toISOString(),
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
  console.log(`[dispatch-mcp-server] listening on :${PORT}`);
});
