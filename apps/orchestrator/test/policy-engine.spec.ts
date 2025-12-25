import { PolicyEngineService } from "../src/modules/policy/policy-engine.service";

describe("PolicyEngineService", () => {
  it("needs approval when PII token exists", () => {
    const svc = new PolicyEngineService();
    const r = svc.evaluate({
      spec: { piiTokens: { bankAccount: "pii_x" } },
      planSteps: [{ tool: "hr.create_employee_account", riskLevel: "HIGH" }],
      user: { roles: ["admin"] }
    });
    expect(r.decision).toBe("NEEDS_APPROVAL");
  });

  it("denies external send tools", () => {
    const svc = new PolicyEngineService();
    const r = svc.evaluate({
      spec: { piiTokens: {} },
      planSteps: [{ tool: "mail.send", riskLevel: "LOW" }],
      user: { roles: ["admin"] }
    });
    expect(r.decision).toBe("DENIED");
  });
});
