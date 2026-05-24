export const PATRO_SCRIPT = /script/i;

export const PATRO_SQL =
  /\b(union\s+select|select\s+.+\s+from|drop\s+table|insert\s+into|delete\s+from|update\s+.+\s+set)\b|'\s*(or|and)\s+.*=.*|--|\/\*/i;

export function contieneEntradaPeligrosa(value: string): boolean {
  return PATRO_SCRIPT.test(value) || PATRO_SQL.test(value);
}
