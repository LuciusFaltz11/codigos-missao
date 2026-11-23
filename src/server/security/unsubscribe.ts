import "server-only";
import { normalizeBroadcastEmail } from "@/features/admin/broadcast";
import { openToken, sealToken } from "@/server/security/tokens";

const PREFIX = "unsub:v1:";

export function createUnsubscribeToken(email: string) {
  return sealToken(`${PREFIX}${normalizeBroadcastEmail(email)}`);
}

export function readUnsubscribeToken(token: string) {
  try {
    const value = openToken(token);
    if (!value.startsWith(PREFIX)) return null;
    const email = normalizeBroadcastEmail(value.slice(PREFIX.length));
    return email.includes("@") ? email : null;
  } catch {
    return null;
  }
}
