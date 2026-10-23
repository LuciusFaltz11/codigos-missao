import { chartRequestSchema } from "@/lib/schemas/forms";
import { consumeMemoryLimit, rateLimitKey } from "@/server/security/rate-limit";
import { createBirthChart } from "@/server/services/charts";
import { tryServiceClient } from "@/server/db/clients";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const limit = consumeMemoryLimit(rateLimitKey(request, "charts"), 8, 15 * 60_000);
  if (!limit.allowed) {
    return Response.json({ ok: false, code: "rate_limited", message: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  }
  const json = await request.json().catch(() => null);
  const parsed = chartRequestSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { ok: false, code: "validation", message: "Revise os campos obrigatórios, inclusive os consentimentos." },
      { status: 400 },
    );
  }
  await tryServiceClient()?.from("analytics_events").insert({ name: "form_start", properties: {} });
  const result = await createBirthChart(parsed.data);
  return Response.json(result, { status: result.ok ? 200 : result.code === "ambiguous_time" ? 409 : 422 });
}
