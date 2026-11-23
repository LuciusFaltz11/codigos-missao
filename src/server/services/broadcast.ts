import "server-only";
import {
  broadcastAssetBase,
  broadcastUnsubscribeUrl,
  htmlToBroadcastText,
  prepareBroadcastHtml,
  prepareBroadcastText,
} from "@/features/admin/broadcast";
import { tryServiceClient, type ServiceClient } from "@/server/db/clients";
import { getServerEnv } from "@/server/env";
import { createEmailProvider } from "@/server/providers/email";
import { createUnsubscribeToken, readUnsubscribeToken } from "@/server/security/unsubscribe";

export type BroadcastSendResult = {
  sent: string[];
  skipped: string[];
  failed: Array<{ email: string; reason: string }>;
};

export type UnsubscribeConfirmResult =
  | { status: "ok"; email: string; already: boolean }
  | { status: "invalid" }
  | { status: "config" };

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadUnsubscribedSet(service: ServiceClient, emails: string[]) {
  const skipped = new Set<string>();
  if (emails.length === 0) return skipped;
  const listed = await service.from("email_unsubscribes").select("email").in("email", emails);
  if (listed.error || !listed.data) return skipped;
  for (const row of listed.data) {
    const email = String(row.email ?? "").trim().toLowerCase();
    if (email) skipped.add(email);
  }
  return skipped;
}

async function matchingLeadIds(service: ServiceClient, email: string) {
  const leads = await service.from("leads").select("id").eq("email", email);
  if (leads.error || !leads.data) return [];
  return leads.data.map((row) => String(row.id)).filter(Boolean);
}

export async function recordEmailUnsubscribe(email: string): Promise<UnsubscribeConfirmResult> {
  const service = tryServiceClient();
  const env = getServerEnv();
  if (!service) return { status: "config" };

  const existing = await service.from("email_unsubscribes").select("email").eq("email", email).maybeSingle();
  if (!existing.error && existing.data) return { status: "ok", email, already: true };

  const inserted = await service.from("email_unsubscribes").upsert({ email, source: "link" }, { onConflict: "email" });
  if (inserted.error) return { status: "config" };

  const leadIds = await matchingLeadIds(service, email);
  if (leadIds.length > 0) {
    await service.from("leads").update({ marketing_opt_in: false }).eq("email", email);
    await service.from("consent_records").insert(
      leadIds.map((leadId) => ({
        lead_id: leadId,
        kind: "marketing",
        accepted: false,
        policy_version: env.policyVersion,
      })),
    );
  }

  return { status: "ok", email, already: false };
}

export async function confirmEmailUnsubscribe(token: string): Promise<UnsubscribeConfirmResult> {
  const email = readUnsubscribeToken(token);
  if (!email) return { status: "invalid" };
  return recordEmailUnsubscribe(email);
}

export async function sendManualBroadcast(input: {
  recipients: string[];
  subject: string;
  html: string;
  text?: string;
  actorId: string;
}): Promise<BroadcastSendResult> {
  const service = tryServiceClient();
  if (!service) throw new Error("config");
  const env = getServerEnv();
  const provider = createEmailProvider();
  if (provider.state !== "configured") throw new Error("email_not_configured");

  const unsubscribed = await loadUnsubscribedSet(service, input.recipients);
  const sent: string[] = [];
  const skipped: string[] = [];
  const failed: Array<{ email: string; reason: string }> = [];
  const assetBase = broadcastAssetBase(env.appUrl);

  for (const [index, email] of input.recipients.entries()) {
    if (unsubscribed.has(email)) {
      skipped.push(email);
      continue;
    }
    try {
      const unsubscribeUrl = broadcastUnsubscribeUrl(env.appUrl, createUnsubscribeToken(email));
      const html = prepareBroadcastHtml(input.html, { unsubscribeUrl, assetBase });
      const text = input.text
        ? prepareBroadcastText(input.text, unsubscribeUrl)
        : htmlToBroadcastText(input.html, unsubscribeUrl);
      await provider.send({ to: email, subject: input.subject, html, text });
      sent.push(email);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "falha no envio";
      failed.push({ email, reason: reason.slice(0, 180) });
    }
    if (index < input.recipients.length - 1) await delay(120);
  }

  await service.from("audit_logs").insert({
    actor_id: input.actorId,
    action: "broadcast_send",
    entity: "emails",
    entity_id: "manual",
    metadata: {
      subject: input.subject,
      sent: sent.length,
      skipped: skipped.length,
      failed: failed.length,
    },
  });

  return { sent, skipped, failed };
}
