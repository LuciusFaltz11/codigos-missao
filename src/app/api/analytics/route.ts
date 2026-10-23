import { tryServiceClient } from "@/server/db/clients";

const ALLOWED = new Set(["visit", "form_start", "preview_view"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: string } | null;
  if (!body?.name || !ALLOWED.has(body.name)) return Response.json({ ok: false }, { status: 400 });
  await tryServiceClient()?.from("analytics_events").insert({ name: body.name, properties: {} });
  return Response.json({ ok: true });
}
