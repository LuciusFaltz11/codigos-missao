import { describe, expect, it } from "vitest";
import { wixChartRequestSchema } from "@/features/integrations/wix-chart-request";
import {
  embedPreviewUrl,
  isSafePreviewRedirect,
  previewRedirectUrl,
  redirectFromParentMessage,
  wixChartReadyMessage,
} from "@/features/integrations/wix-messages";
import { corsHeadersForOrigin, parseOriginList, frameAncestorsDirective } from "@/features/integrations/wix-origins";
import { twelveHourToBirthTime } from "@/features/integrations/wix-time";
import { verifyTurnstileToken } from "@/server/security/turnstile";
import { findRememberedWixChart, rememberWixChart, wixChartFingerprint } from "@/server/security/wix-chart-repeat";
import {
  iframeSrc,
  isWixBirthChartFormMeta,
  resolveWixFormMount,
  WIX_FORM_MOUNT_ID,
} from "@/features/integrations/wix-parent-mount";

const validRequest = {
  name: "Ana Silva",
  email: "ana@example.com",
  birthDate: "1991-04-12",
  birthTime: "09:30",
  cityQuery: "São Paulo, Brasil",
  cityLabel: "São Paulo, Brasil",
  acceptPrivacy: true,
  marketingOptIn: false,
  turnstileToken: "turnstile-token-ok",
};

describe("tokens e origens do embed Wix", () => {
  it("aceita origens https e ignora lixo", () => {
    expect(parseOriginList("https://valwilges.com.br, https://www.valwilges.com.br/, ftp://x, not-a-url")).toEqual([
      "https://valwilges.com.br",
      "https://www.valwilges.com.br",
    ]);
    expect(frameAncestorsDirective([])).toBe("'none'");
    expect(corsHeadersForOrigin("https://evil.example", ["https://valwilges.com.br"])).toEqual({});
    expect(corsHeadersForOrigin("https://valwilges.com.br", ["https://valwilges.com.br"])["Access-Control-Allow-Origin"]).toBe(
      "https://valwilges.com.br",
    );
  });
});

describe("horário 12h do formulário Harmony", () => {
  it("converte AM/PM para HH:MM 24h", () => {
    expect(twelveHourToBirthTime("12", "00", "AM")).toBe("00:00");
    expect(twelveHourToBirthTime("12", "15", "PM")).toBe("12:15");
    expect(twelveHourToBirthTime("1", "05", "PM")).toBe("13:05");
    expect(twelveHourToBirthTime("09", "30", "AM")).toBe("09:30");
    expect(twelveHourToBirthTime("00", "00", "AM")).toBeNull();
    expect(twelveHourToBirthTime("13", "00", "PM")).toBeNull();
  });
});

describe("schema do POST Wix", () => {
  it("exige privacidade e aceita o POST sem Turnstile", () => {
    expect(wixChartRequestSchema.safeParse(validRequest).success).toBe(true);
    expect(wixChartRequestSchema.safeParse({ ...validRequest, acceptPrivacy: false }).success).toBe(false);
    expect(wixChartRequestSchema.safeParse({ ...validRequest, turnstileToken: "" }).success).toBe(true);
    expect(wixChartRequestSchema.safeParse({ ...validRequest, turnstileToken: undefined }).success).toBe(true);
    expect(wixChartRequestSchema.safeParse({ ...validRequest, cityLabel: "" }).success).toBe(false);
    expect(wixChartRequestSchema.safeParse({ ...validRequest, marketingOptIn: undefined }).success).toBe(true);
  });
});

describe("redirectUrl da prévia", () => {
  const app = "https://codigos.example";
  it("só aceita o host da app e /mapa/resultado/", () => {
    const url = previewRedirectUrl(app, "token-seguro-123456");
    expect(url).toBe("https://codigos.example/mapa/resultado/token-seguro-123456");
    expect(isSafePreviewRedirect(url, app)).toBe(true);
    expect(isSafePreviewRedirect("https://evil.example/mapa/resultado/token-seguro-123456", app)).toBe(false);
    expect(isSafePreviewRedirect("https://codigos.example/mapa/completo/token-seguro-123456", app)).toBe(false);
    expect(isSafePreviewRedirect("https://codigos.example/mapa/resultado/token-seguro-123456?x=1", app)).toBe(false);
    expect(isSafePreviewRedirect("http://codigos.example/mapa/resultado/token-seguro-123456", app)).toBe(false);
    expect(embedPreviewUrl(url, "https://app.live")).toBe("https://app.live/mapa/resultado/token-seguro-123456");
    expect(embedPreviewUrl("https://evil.example/mapa/completo/token-seguro-123456", "https://app.live")).toBeNull();
  });
});

describe("postMessage iframe → Wix", () => {
  it("só redireciona com origem da app e URL segura", () => {
    const appUrl = "https://codigos.example";
    const data = wixChartReadyMessage("https://codigos.example/mapa/resultado/token-seguro-123456");
    expect(
      redirectFromParentMessage({
        eventOrigin: "https://codigos.example",
        appOrigin: "https://codigos.example",
        data,
        appUrl,
      }),
    ).toBe(data.redirectUrl);
    expect(
      redirectFromParentMessage({
        eventOrigin: "https://evil.example",
        appOrigin: "https://codigos.example",
        data,
        appUrl,
      }),
    ).toBeNull();
    expect(
      redirectFromParentMessage({
        eventOrigin: "https://codigos.example",
        appOrigin: "https://codigos.example",
        data: wixChartReadyMessage("https://evil.example/mapa/resultado/token-seguro-123456"),
        appUrl,
      }),
    ).toBeNull();
  });
});

describe("Turnstile", () => {
  it("recusa token quando o provedor não confirma", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ success: false }), { status: 200, headers: { "content-type": "application/json" } });
    await expect(verifyTurnstileToken({ token: "x", secret: "secret", fetchImpl })).resolves.toBe(false);
  });

  it("aceita token confirmado", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ success: true }), { status: 200, headers: { "content-type": "application/json" } });
    await expect(verifyTurnstileToken({ token: "ok-token", secret: "secret", fetchImpl })).resolves.toBe(true);
  });
});

describe("duplicidade do POST Wix", () => {
  it("devolve o mesmo token na janela curta", () => {
    const fingerprint = wixChartFingerprint({
      email: "ana@example.com",
      birthDate: "1991-04-12",
      birthTime: "09:30",
      cityLabel: "São Paulo, Brasil",
    });
    rememberWixChart(fingerprint, "token-a", "https://codigos.example/mapa/resultado/token-a");
    expect(findRememberedWixChart(fingerprint)?.token).toBe("token-a");
    expect(
      wixChartFingerprint({
        email: "ANA@example.com",
        birthDate: "1991-04-12",
        birthTime: "09:30",
        cityLabel: "São Paulo, Brasil",
      }),
    ).toBe(fingerprint);
  });
});

describe("container do iframe no Wix", () => {
  const chartMeta = {
    ariaLabel: "Cálculo Códigos da Missão Página",
    fieldTypes: ["CONTACTS_FIRST_NAME", "CONTACTS_BIRTHDATE", "TIME_INPUT", "CONTACTS_ADDRESS", "CONTACTS_EMAIL"],
    dataHooks: ["form-field-nome_de3c", "form-field-data_de_nascimento", "form-field-horario_de_nascimento"],
  };

  it("reconhece o formulário pela estrutura Wix Forms", () => {
    expect(isWixBirthChartFormMeta(chartMeta)).toBe(true);
    expect(isWixBirthChartFormMeta({ ariaLabel: "Newsletter", fieldTypes: ["CONTACTS_EMAIL"], dataHooks: [] })).toBe(false);
  });

  it("usa #comp-mw2gfm71 quando existe", () => {
    expect(
      resolveWixFormMount({
        preferred: { id: WIX_FORM_MOUNT_ID },
        forms: [{ meta: chartMeta, closestComp: { id: "comp-outro" } }],
      }),
    ).toEqual({ id: WIX_FORM_MOUNT_ID });
  });

  it("cai no wrapping comp-* do único formulário se o id mudar", () => {
    expect(
      resolveWixFormMount({
        preferred: null,
        forms: [{ meta: chartMeta, closestComp: { id: "comp-novo123" }, formWrapper: { id: "wrap" } }],
      }),
    ).toEqual({ id: "comp-novo123" });
    expect(
      resolveWixFormMount({
        preferred: null,
        forms: [
          {
            meta: { ariaLabel: "Contato", fieldTypes: ["CONTACTS_EMAIL"], dataHooks: [] },
            closestComp: { id: "comp-contato" },
          },
        ],
      }),
    ).toEqual({ id: "comp-contato" });
    expect(resolveWixFormMount({ preferred: null, forms: [] })).toBeNull();
    expect(
      resolveWixFormMount({
        preferred: null,
        forms: [
          { meta: { ariaLabel: "Newsletter", fieldTypes: ["CONTACTS_EMAIL"], dataHooks: [] }, closestComp: { id: "comp-news" } },
          { meta: chartMeta, closestComp: { id: "comp-mapa" } },
        ],
      }),
    ).toEqual({ id: "comp-mapa" });
    expect(iframeSrc("https://app.example/")).toBe("https://app.example/integracoes/wix/formulario-mapa");
  });
});
