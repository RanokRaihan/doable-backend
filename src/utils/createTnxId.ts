import crypto from "crypto";

type TnxIdPrefix = "TNX" | "WTNX";
export function createTnxId(prefix: TnxIdPrefix): string {
  const random = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `${prefix}-${Date.now()}-${random}`;
}
