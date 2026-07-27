export function normalizeTaxCode(value: string): string {
  return value.replace(/[\s.-]/g, '');
}
