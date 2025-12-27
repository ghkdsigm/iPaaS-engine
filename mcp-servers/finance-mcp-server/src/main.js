import express from "express";
import { z } from "zod";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 4011);

const PaySalaryArgs = z.object({
  date: z.string().min(1),
  employeeName: z.string().min(1),
  amountWon: z.number().positive()
});

const tools = [
  {
    name: "finance.pay_salary",
    description: "Pay salary to an employee (requires approval)",
    riskLevel: "HIGH",
    requiredRoles: ["FINANCE_ADMIN"],
    piiFields: [],
    tags: ["primary", "event:payroll.pay", "domain:finance"],
    eventTypes: ["payroll.pay"],
    argsSchema: {
      type: "object",
      properties: {
        date: { type: "string" },
        employeeName: { type: "string" },
        amountWon: { type: "number" }
      },
      required: ["date", "employeeName", "amountWon"],
      additionalProperties: false
    }
  }
];

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "finance-mcp-server", time: new Date().toISOString() });
});

app.get("/tools", (_req, res) => {
  res.json({ tools });
});

app.post(["/execute", "/invoke"], async (req, res) => {
  const tool = typeof req.body?.tool === "string" ? req.body.tool : "";
  const args = req.body?.args ?? {};

  try {
    if (tool === "finance.pay_salary") {
      const parsed = PaySalaryArgs.safeParse(args);
      if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

      const result = {
        transactionId: `tx_${Date.now()}`,
        status: "SENT",
        paidAt: new Date().toISOString(),
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
  console.log(`[finance-mcp-server] listening on :${PORT}`);
});
