/**
 * Generates a unique transaction ID.
 * Format: tnx<timestamp><random>
 */
export function createTnxId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}
