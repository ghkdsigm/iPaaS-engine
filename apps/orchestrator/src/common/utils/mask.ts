export function maskBankAccount(text: string) {
  return text.replace(/\b\d{2,3}-\d{2,4}-\d{5,}\b/g, "***-****-******");
}
