import express from "express";
import { z } from "zod";
import { generateEmployeeId } from "./tools/generate-employee-id.tool.js";
import { createEmployeeAccount } from "./tools/create-employee-account.tool.js";
import { deleteEmployee } from "./tools/compensation/delete-employee.tool.js";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 4001);

const tools = [
  {
    name: "hr.generate_employee_id",
    description: "Generate a unique employee id for a new hire",
    riskLevel: "LOW",
    requiredRoles: ["hr"],
    argsSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string", minLength: 1 }
      },
      required: ["name"]
    }
  },
  {
    name: "hr.create_employee_account",
    description: "Create employee account record (demo)",
    riskLevel: "MEDIUM",
    requiredRoles: ["hr"],
    piiFields: ["bankAccount", "salary"],
    argsSchema: {
      type: "object",
      additionalProperties: true,
      properties: {
        employeeId: { type: "string", minLength: 1 },
        name: { type: "string", minLength: 1 },
        dept: { type: "string", minLength: 1 },
        startDate: { type: "string", minLength: 1 },
        salary: { type: "number" },
        bankAccount: { type: "string" }
      },
      required: ["employeeId", "name", "dept", "startDate"]
    }
  },
  {
    name: "hr.delete_employee",
    description: "Compensation: delete employee (demo)",
    riskLevel: "HIGH",
    requiredRoles: ["hr_admin"],
    argsSchema: {
      type: "object",
      additionalProperties: true,
      properties: {
        employeeId: { type: "string", minLength: 1 },
        reason: { type: "string" }
      },
      required: ["employeeId"]
    }
  }
];

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "hr-mcp-server", time: new Date().toISOString() });
});

app.get("/tools", (_req, res) => {
  res.json({ tools });
});

const ExecuteBodySchema = z
  .object({
    tool: z.string(),
    args: z.record(z.any()).optional()
  })
  .passthrough();

async function handleExecute(req, res) {
  const parsed = ExecuteBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const tool = parsed.data.tool;
  const args = parsed.data.args || {};

  try {
    if (tool === "hr.generate_employee_id") {
      const name = typeof args.name === "string" ? args.name.trim() : "";
      if (!name) return res.status(400).json({ ok: false, error: "name is required" });

      const employeeId = generateEmployeeId({ name });

      // 중요: 문자열이 아니라 객체로 반환해야 "{{step0.employeeId}}"가 동작함
      return res.json({ ok: true, result: { employeeId } });
    }

    if (tool === "hr.create_employee_account") {
      const input = {
        employeeId: args.employeeId,
        name: args.name,
        dept: args.dept,
        startDate: args.startDate,
        salary: args.salary,
        bankAccount: args.bankAccount
      };

      const result = createEmployeeAccount(input);
      return res.json({ ok: true, result });
    }

    if (tool === "hr.delete_employee") {
      const employeeId = typeof args.employeeId === "string" ? args.employeeId.trim() : "";
      if (!employeeId) return res.status(400).json({ ok: false, error: "employeeId is required" });

      const result = deleteEmployee({
        employeeId,
        reason: typeof args.reason === "string" ? args.reason : undefined
      });

      return res.json({ ok: true, result });
    }

    return res.status(404).json({ ok: false, error: `Unknown tool: ${tool}` });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ ok: false, error: message });
  }
}


app.post("/execute", handleExecute);
app.post("/invoke", handleExecute);

app.listen(PORT, () => {
  console.log(`[hr-mcp-server] listening on :${PORT}`);
});
