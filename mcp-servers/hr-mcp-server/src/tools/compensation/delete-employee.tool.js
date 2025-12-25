export function deleteEmployee({ employeeId, reason }) {
  if (!employeeId) throw new Error("employeeId is required");

  return {
    employeeId,
    deleted: true,
    reason: reason || "N/A",
    deletedAt: new Date().toISOString(),
  };
}
