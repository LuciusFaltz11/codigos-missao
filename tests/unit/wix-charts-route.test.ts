import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyTurnstileToken, createBirthChart, env } = vi.hoisted(() => ({
  verifyTurnstileToken: vi.fn(async (_input?: unknown) => true),
  createBirthChart: vi.fn(),
  env: {
    appUrl: "https://codigos.example",
    turnstileSecret: "secret" as string | undefined,
    wixEmbedOrigins: ["https://valwilges.com.br"],
  },
}));

vi.mock("@/server/env", () => ({
  getServerEnv: () => env,
}));

vi.mock("@/server/security/turnstile", () => ({
  verifyTurnstileToken,
}));

vi.mock("@/server/services/charts", () => ({
  createBirthChart,
}));

vi.mock("@/server/db/clients", () => ({
  tryServiceClient: () => null,
}));

vi.mock("@/features/launch/chart-gate", () => ({
  chartGenerationLocked: () => false,
  CHART_LOCKED_MESSAGE: "O mapa será liberado às 20:00 de 11/11.",
}));

const payload = {
  name: "Ana Silva",
  email: "rota@example.com",
  birthDate: "1991-04-12",
  birthTime: "09:30",
  cityQuery: "São Paulo, Brasil",
  cityLabel: "São Paulo, Brasil",
  acceptPrivacy: true,
  marketingOptIn: false,
  turnstileToken: "turnstile-token-ok",
};

async function post(body: unknown, headers: Record<string, string> = {}) {
  const { POST } = await import("@/app/api/integrations/wix/charts/route");
  return POST(
    new Request("https://codigos.example/api/integrations/wix/charts", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/integrations/wix/charts", () => {
  beforeEach(() => {
    env.turnstileSecret = "secret";
    verifyTurnstileToken.mockReset();
    verifyTurnstileToken.mockResolvedValue(true);
    createBirthChart.mockReset();
  });

  it("pula o Turnstile quando o secret não está configurado", async () => {
    env.turnstileSecret = undefined;
    createBirthChart.mockResolvedValue({ ok: true, token: "token-sem-captcha-123", calculation: "complete" });
    const response = await post({ ...payload, email: "sem-captcha@example.com", turnstileToken: "" });
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.token).toBe("token-sem-captcha-123");
    expect(verifyTurnstileToken).not.toHaveBeenCalled();
  });

  it("recusa CAPTCHA inválido sem calcular o mapa", async () => {
    verifyTurnstileToken.mockResolvedValue(false);
    const response = await post(payload);
    const json = await response.json();
    expect(response.status).toBe(400);
    expect(json.code).toBe("captcha");
    expect(createBirthChart).not.toHaveBeenCalled();
  });

  it("recusa consentimento ausente", async () => {
    const response = await post({ ...payload, acceptPrivacy: false });
    expect(response.status).toBe(400);
    expect(createBirthChart).not.toHaveBeenCalled();
  });

  it("devolve redirectUrl da prévia e não inventa outro token na repetição", async () => {
    createBirthChart.mockResolvedValue({ ok: true, token: "token-seguro-123456", calculation: "complete" });
    const first = await post(payload);
    const firstBody = await first.json();
    expect(first.status).toBe(200);
    expect(firstBody.redirectUrl).toBe("https://codigos.example/mapa/resultado/token-seguro-123456");
    expect(createBirthChart).toHaveBeenCalledTimes(1);

    const second = await post(payload);
    const secondBody = await second.json();
    expect(second.status).toBe(200);
    expect(secondBody.token).toBe("token-seguro-123456");
    expect(createBirthChart).toHaveBeenCalledTimes(1);
  });

  it("não gera token quando o horário é ambíguo", async () => {
    createBirthChart.mockResolvedValue({
      ok: false,
      code: "ambiguous_time",
      message: "Este horário ocorre duas vezes.",
      options: [{ offsetMinutes: -180, utcIso: "1991-04-12T12:30:00Z", label: "UTC-03:00" }],
    });
    const response = await post({ ...payload, email: "dst@example.com" });
    const json = await response.json();
    expect(response.status).toBe(409);
    expect(json.code).toBe("ambiguous_time");
    expect(json.redirectUrl).toBeUndefined();
  });
});
