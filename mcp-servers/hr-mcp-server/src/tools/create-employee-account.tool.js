export function createEmployeeAccount(input) {
    const now = new Date().toISOString();
  
    return {
      created: true,
      createdAt: now,
      employee: {
        employeeId: input?.employeeId ?? null,
        name: input?.name ?? null,
        dept: input?.dept ?? null,
        startDate: input?.startDate ?? null,
        salary: input?.salary ?? null,
        bankAccount: input?.bankAccount ?? null,
      },
    };
  }
  