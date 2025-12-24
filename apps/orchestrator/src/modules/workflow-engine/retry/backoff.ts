export function backoffMs(attempt: number) { return Math.min(2000 * attempt, 15000); }
