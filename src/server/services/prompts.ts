import "server-only";
import { pickLivePrompts, type LiveInterpretationPrompts } from "@/features/interpretation/prompt-store";
import type { ServiceClient } from "@/server/db/clients";

export async function loadLiveInterpretationPrompts(service: ServiceClient): Promise<LiveInterpretationPrompts> {
  const rows = await service
    .from("interpretation_prompts")
    .select("kind,version,body,status,created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  return pickLivePrompts(
    (rows.data ?? []).map((row) => ({
      kind: String(row.kind),
      version: String(row.version),
      body: String(row.body ?? ""),
      status: String(row.status),
      created_at: row.created_at ? String(row.created_at) : undefined,
    })),
  );
}
