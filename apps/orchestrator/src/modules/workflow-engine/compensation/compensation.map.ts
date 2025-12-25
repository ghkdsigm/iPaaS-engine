export type CompensationSpec = {
  tool: string;
  args: Record<string, any>;
};

export const compensationMap: Record<string, CompensationSpec> = {
  "hr.create_employee_account": {
    tool: "hr.delete_employee",
    args: { employeeId: "{{step0.employeeId}}" }
  }
};
