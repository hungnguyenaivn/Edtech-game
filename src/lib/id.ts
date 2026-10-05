import { randomBytes } from "crypto";

/** ID ngắn, an toàn cho URL (không cần thư viện ngoài). */
export function createId(): string {
  return randomBytes(12).toString("base64url");
}
