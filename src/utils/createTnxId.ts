type TnxIdPrefix = "TNX" | "WTNX";
export function createTnxId(prefix: TnxIdPrefix): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}
