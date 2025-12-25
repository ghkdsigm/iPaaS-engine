import { randomBytes } from "node:crypto";

export function generateEmployeeId({ name }) {
  const base = (name || "EMP").toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 3) || "EMP";
  const rand = randomBytes(2).toString("hex").toUpperCase();
  const y = new Date().getFullYear();
  return `${base}-${y}-${rand}`;
}
