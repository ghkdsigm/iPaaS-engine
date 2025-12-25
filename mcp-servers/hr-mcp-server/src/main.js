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
    argsSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
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
        bankAccount: { type: "string" },
      },
      required: ["employeeId", "name", "dept", "startDate"],
    },
  },
  {
    name: "hr.delete_employee",
    description: "Compensation: delete employee (demo)",
    riskLevel: "HIGH",
    requiredRoles: ["hr_admin"],
    argsSchema: {
      type: "object",
      properties: { employeeId: { type: "string" } },
      required: ["employeeId"],
    },
  },
];

app.get("/health", (_req, res) => res.json({ ok: true, service: "hr-mcp-server" }));

app.get("/tools", (_req, res) => {
  res.json({ ok: true, tools });
});

app.post("/invoke", (req, res) => {
  const tool = String(req.body?.tool || "").trim();
  const args = req.body?.args || {};
  const user = req.body?.user || { roles: [] };

  const found = tools.find((t) => t.name === tool);
  if (!found) return res.status(404).json({ ok: false, error: `Unknown tool: ${tool}` });

  const roles = Array.isArray(user.roles) ? user.roles : [];
  const required = Array.isArray(found.requiredRoles) ? found.requiredRoles : [];
  const allowed = required.every((r) => roles.includes(r));
  if (!allowed) return res.status(403).json({ ok: false, error: "Forbidden" });

  if (tool === "hr.generate_employee_id") {
    const name = String(args.name || "").trim();
    if (!name) return res.status(400).json({ ok: false, error: "name is required" });
    return res.json({ ok: true, result: generateEmployeeId(name) });
  }

  if (tool === "hr.create_employee_account") {
    const schema = z
      .object({
        employeeId: z.string().min(1),
        name: z.string().min(1),
        dept: z.string().min(1),
        startDate: z.string().min(1),
        salary: z.number().optional(),
        bankAccount: z.string().optional(),
      })
      .strict();

    const parsed = schema.safeParse(args);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.flatten() });
    }

    const input = parsed.data;
    return res.json({ ok: true, result: createEmployeeAccount(input) });
  }

  if (tool === "hr.delete_employee") {
    const employeeId = String(args.employeeId || "").trim();
    if (!employeeId) return res.status(400).json({ ok: false, error: "employeeId is required" });
    return res.json({ ok: true, result: deleteEmployee({ employeeId }) });
  }

  return res.status(404).json({ ok: false, error: `Unknown tool: ${tool}` });
});

app.listen(PORT, () => console.log(`[hr-mcp] listening on :${PORT}`));
