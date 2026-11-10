import { corsHeadersForOrigin } from "@/features/integrations/wix-origins";
import { isSafePreviewRedirect, previewRedirectUrl } from "@/features/integrations/wix-messages";
import { wixChartRequestSchema } from "@/features/integrations/wix-chart-request";
import { consumeMemoryLimit, clientAddress, rateLimitKey } from "@/server/security/rate-limit";
import { verifyTurnstileToken } from "@/server/security/turnstile";
import { findRememberedWixChart, rememberWixChart, wixChartFingerprint } from "@/server/security/wix-chart-repeat";
import { createBirthChart } from "@/server/services/charts";
import { tryServiceClient } from "@/server/db/clients";
import { getServerEnv } from "@/server/env";

export const runtime = "nodejs";
export const maxDuration = 60;

function json(body: unknown, status: number, origin: string | null, allowed: string[]) {
  return Response.json(body, { status, headers: corsHeadersForOrigin(origin, allowed) });
}

export async function OPTIONS(request: Request) {
  const env = getServerEnv();
  const origin = request.headers.get("origin");
  const headers = corsHeadersForOrigin(origin, env.wixEmbedOrigins);
  if (!("Access-Control-Allow-Origin" in headers)) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers });
}

export async function POST(request: Request) {
  const env = getServerEnv();
  const origin = request.headers.get("origin");
  const allowed = env.wixEmbedOrigins;
  const limit = consumeMemoryLimit(rateLimitKey(request, "wix-charts"), 8, 15 * 60_000);
  if (!limit.allowed) {
    return json(
      { ok: false, code: "rate_limited", message: "Muitas tentativas. Aguarde alguns minutos." },
      429,
      origin,
      allowed,
    );
  }

  const jsonBody = await request.json().catch(() => null);
  const parsed = wixChartRequestSchema.safeParse(jsonBody);
  if (!parsed.success) {
    return json(
      { ok: false, code: "validation", message: "Revise os campos obrigatórios, inclusive os consentimentos." },
      400,
      origin,
      allowed,
    );
  }
  if (parsed.data.acceptPrivacy !== true) {
    return json(
      { ok: false, code: "validation", message: "O aceite da política de privacidade é necessário." },
      400,
      origin,
      allowed,
    );
  }
  if (env.turnstileSecret) {
    const token = parsed.data.turnstileToken?.trim() ?? "";
    const captchaOk = token.length >= 10 && (await verifyTurnstileToken({
      token,
      secret: env.turnstileSecret,
      ip: clientAddress(request),
    }));
    if (!captchaOk) {
      return json(
        { ok: false, code: "captcha", message: "Não foi possível validar a verificação. Atualize a página e tente de novo." },
        400,
        origin,
        allowed,
      );
    }
  }

  const chartInput = {
    name: parsed.data.name,
    email: parsed.data.email,
    birthDate: parsed.data.birthDate,
    birthTime: parsed.data.birthTime,
    cityQuery: parsed.data.cityQuery,
    cityLabel: parsed.data.cityLabel,
    offsetChoice: parsed.data.offsetChoice,
    acceptPrivacy: true as const,
    marketingOptIn: false,
  };
  const fingerprint = wixChartFingerprint(chartInput);
  const remembered = findRememberedWixChart(fingerprint);
  if (remembered && isSafePreviewRedirect(remembered.redirectUrl, env.appUrl)) {
    return json({ ok: true, redirectUrl: remembered.redirectUrl, token: remembered.token }, 200, origin, allowed);
  }

  await tryServiceClient()?.from("analytics_events").insert({
    name: "form_start",
    properties: { source: "wix" },
  });
  const result = await createBirthChart(chartInput);
  if (!result.ok) {
    return json(result, result.code === "ambiguous_time" ? 409 : 422, origin, allowed);
  }
  const redirectUrl = previewRedirectUrl(env.appUrl, result.token);
  if (!isSafePreviewRedirect(redirectUrl, env.appUrl)) {
    return json(
      { ok: false, code: "validation", message: "Não foi possível montar o endereço da prévia." },
      422,
      origin,
      allowed,
    );
  }
  rememberWixChart(fingerprint, result.token, redirectUrl);
  return json({ ok: true, redirectUrl, token: result.token }, 200, origin, allowed);
}
