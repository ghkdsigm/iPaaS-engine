import express from "express";
import { z } from "zod";
import { generateEmployeeId } from "./tools/generate-employee-id.tool.ts";
import { createEmployeeAccount } from "./tools/create-employee-account.tool.ts";
import { deleteEmployee } from "./tools/compensation/delete-employee.tool.ts";

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 4001);

const tools = [
  {
    name: "hr.generate_employee_id",
    description: "Generate a unique employee id for a new hire",
    riskLevel: "LOW",
    requiredRoles: ["hr"],
    argsSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] }
  },
  {
    name: "hr.create_employee_account",
    description: "Create employee account record (demo)",
    riskLevel: "MEDIUM",
    requiredRoles: ["hr"],
    piiFields: ["bankAccount", "salary"],
    argsSchema: {
      type: "object",
      properties: {
        employeeId: { type: "string" },
        name: { type: "string" },
        dept: { type: "string" },
        startDate: { type: "string" },
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
    argsSchema: { type: "object", properties: { employeeId: { type: "string" } }, required: ["employeeId"] }
  }
];

app.get("/health", (_req, res) => res.json({ ok: true, service: "hr-mcp", time: new Date().toISOString() }));
app.get("/tools", (_req, res) => res.json({ tools }));

const Exec = z.object({ tool: z.string(), args: z.record(z.any()).default({}) });

app.post("/execute", (req, res) => {
  const parsed = Exec.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.flatten() });

  const { tool, args } = parsed.data;

  if (tool === "hr.generate_employee_id") {
    const name = String(args.name || "").trim();
    if (!name) return res.status(400).json({ ok: false, error: "name is required" });
    return res.json({ ok: true, result: generateEmployeeId(name) });
  }

  if (tool === "hr.create_employee_account") {
    const input = {
      employeeId: String(args.employeeId || ""),
      name: String(args.name || ""),
      dept: String(args.dept || ""),
      startDate: String(args.startDate || ""),
      salary: typeof args.salary === "number" ? args.salary : null,
      bankAccount: typeof args.bankAccount === "string" ? args.bankAccount : null
    };
    return res.json({ ok: true, result: createEmployeeAccount(input) });
  }

  if (tool === "hr.delete_employee") {
    const employeeId = String(args.employeeId || "").trim();
    if (!employeeId) return res.status(400).json({ ok: false, error: "employeeId is required" });
    return res.json({ ok: true, result: deleteEmployee(employeeId) });
  }

  return res.status(404).json({ ok: false, error: `Unknown tool: ${tool}` });
});

app.listen(PORT, () => console.log(`[hr-mcp] listening on :${PORT}`));
