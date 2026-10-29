import { describe, expect, it } from "vitest";
import { decidePaymentTransition } from "@/features/checkout/transition";
import {
  adoptPublishedSnapshot,
  calculationCompatible,
  checkoutBlockers,
  glossaryReady,
  methodologySellable,
  provisionalSnapshot,
} from "@/features/methodology/snapshot";
import { toFreePreview, type PreparedChart } from "@/features/preview/redact";
import { IndividualReadingSchema, validateAgainstEvidence, type InterpretationResult } from "@/features/interpretation/validate";
import { orderStatusLabel, paymentProviderLabel } from "@/features/admin/orders";
import { roleHas } from "@/server/auth/rbac";
import { officialCatalog } from "@/features/missions/catalog";
import type { MissionActivation } from "@/features/missions/activate";
import { INDIVIDUAL_SYSTEM_PROMPT, PROMPT_VERSION, SYNTHESIS_SYSTEM_PROMPT } from "@/features/interpretation/prompts";
import { composeFreePreviewSummary } from "@/features/preview/teaser";
import { DEFAULT_ACTIVATION_POINTS, resolvedActivationPoints } from "@/lib/constants/astrology";

const activation = (point: string, codeId: string, house: number): MissionActivation => {
  const code = officialCatalog.find((item) => item.id === codeId)!;
  return {
    id: `ac-${point}`,
    natalPointId: point,
    signSlug: code.signSlug,
    signName: code.signName,
    degreeWithinSign: 14,
    houseNumber: house,
    missionCodeId: code.id,
    methodologyVersion: "teste",
    longitude: 14,
    retrograde: null,
    code,
    trail: [],
  };
};

describe("prévia gratuita", () => {
  it("não inclui o conteúdo das outras ativações", () => {
    const chart: PreparedChart = {
      status: "complete",
      errorCode: null,
      cityLabel: "Cidade",
      localDate: "1990-01-01",
      localTime: "10:00",
      timezone: "America/Sao_Paulo",
      rulesValidated: false,
      freePointId: "sun",
      ascendant: null,
      midheaven: null,
      activations: [activation("sun", "aries-2", 1), activation("mars", "touro-1", 7)],
      chart: null,
      entitlement: "none",
      priceCents: null,
      currency: "BRL",
      productName: null,
    };
    const preview = toFreePreview(chart);
    const serialized = JSON.stringify(preview);
    expect(serialized).toContain("Navegante do fogo");
    expect(serialized).not.toContain("Filha da terra");
    expect(serialized).not.toContain("touro-1");
    expect(preview.otherActivationCount).toBe(1);
    expect(serialized).not.toContain(officialCatalog.find((item) => item.id === "touro-1")!.keyword);
    expect(preview.interpretationSummary?.kicker).toMatch(/Sol encontra Navegante do fogo/);
    expect(preview.interpretationSummary?.body).toMatch(/casa 1/);
    expect(preview.interpretationSummary?.invitation).toMatch(/outro Código/);
    expect(JSON.stringify(preview.interpretationSummary)).not.toContain("Filha da terra");
    expect(JSON.stringify(preview.interpretationSummary)).not.toContain("touro-1");
    expect(preview.activationPoints).toEqual([
      {
        pointId: "sun",
        pointLabel: "Sol",
        signName: "Áries",
        degreeLabel: "14°00′00″",
        houseNumber: 1,
        unlocked: true,
      },
      {
        pointId: "mars",
        pointLabel: "Marte",
        signName: "Touro",
        degreeLabel: "14°00′00″",
        houseNumber: 7,
        unlocked: false,
      },
    ]);
  });

  it("monta um resumo só do ponto livre para convidar à leitura completa", () => {
    const summary = composeFreePreviewSummary({
      pointId: "sun",
      signName: "Áries",
      houseNumber: 11,
      archetype: "Soberana do horizonte",
      keyword: "Iniciar",
      otherCount: 14,
    });
    expect(summary.kicker).toBe("O Sol encontra Soberana do horizonte");
    expect(summary.body).toMatch(/casa 11/);
    expect(summary.body).toMatch(/Iniciar/);
    expect(summary.invitation).toMatch(/outros 14 Códigos/);
    expect(summary.body).not.toMatch(/Filha da terra|touro-1/);
  });
});

describe("pagamento", () => {
  const order = {
    externalReference: "ord_1",
    amountCents: 15000,
    currency: "BRL",
    status: "pending" as const,
    hasEntitlement: false,
  };

  it("libera uma vez e ignora repetição e valor divergente", () => {
    const approved = decidePaymentTransition(order, {
      id: "1",
      paid: true,
      amountCents: 15000,
      currencyId: "BRL",
      externalReference: "ord_1",
      event: "paid",
    });
    expect(approved).toMatchObject({ action: "update", grantEntitlement: true });
    const again = decidePaymentTransition({ ...order, status: "approved", hasEntitlement: true }, {
      id: "1",
      paid: true,
      amountCents: 15000,
      currencyId: "BRL",
      externalReference: "ord_1",
      event: "paid",
    });
    expect(again).toMatchObject({ grantEntitlement: false });
    const mismatch = decidePaymentTransition(order, {
      id: "1",
      paid: true,
      amountCents: 1000,
      currencyId: "BRL",
      externalReference: "ord_1",
      event: "paid",
    });
    expect(mismatch).toMatchObject({ action: "reject_mismatch", reason: "amount" });
  });

  it("não libera a venda sem metodologia, preço e integrações", () => {
    const blockers = checkoutBlockers({
      chartStatus: "not_configured",
      snapshot: provisionalSnapshot(),
      priceCents: null,
      integrations: { infinitepay: "not_configured", llm: "not_configured", email: "not_configured" },
      alreadyEntitled: false,
    });
    expect(blockers.length).toBeGreaterThan(0);
    expect(blockers.some((item) => item.includes("InfinitePay"))).toBe(true);
    expect(glossaryReady(provisionalSnapshot())).toBe(false);
  });

  it("não exige InfinitePay quando o cupom zera o pedido", () => {
    const blockers = checkoutBlockers({
      chartStatus: "complete",
      snapshot: provisionalSnapshot(),
      priceCents: 35000,
      integrations: { infinitepay: "not_configured", llm: "configured", email: "configured" },
      alreadyEntitled: false,
      requirePaymentProvider: false,
    });
    expect(blockers.some((item) => item.includes("InfinitePay"))).toBe(false);
    expect(blockers.some((item) => item.includes("metodologia") || item.includes("textos"))).toBe(true);
  });

  it("associa a metodologia publicada a mapa não pago com o mesmo cálculo", () => {
    const frozen = provisionalSnapshot();
    const published = {
      ...frozen,
      versionLabel: "1.0.0",
      status: "published" as const,
      rulesValidated: true,
      notice: "",
      houses: frozen.houses.map((house) => ({ ...house, published: true })),
      points: frozen.points.map((point) => ({ ...point, published: true })),
    };
    expect(calculationCompatible(frozen, published)).toBe(true);
    expect(methodologySellable(published)).toBe(true);
    expect(
      adoptPublishedSnapshot(frozen, published, { chartComplete: true, hasEntitlement: false }).versionLabel,
    ).toBe("1.0.0");
    expect(adoptPublishedSnapshot(frozen, published, { chartComplete: true, hasEntitlement: true })).toBe(frozen);
    expect(
      adoptPublishedSnapshot(frozen, { ...published, houseSystem: "whole_sign" }, { chartComplete: true, hasEntitlement: false }),
    ).toBe(frozen);
  });
});

describe("validador da leitura", () => {
  const validReading = {
    activation_id: "ac-sol",
    headline: "Um título válido",
    interpretation: "x".repeat(60),
    light_expression: "uma expressão de luz suficiente",
    shadow_expression: "uma expressão de sombra suficiente",
    reflective_question: "O que você observa?",
  };

  it("rejeita ativação inventada e padrão sem evidência", () => {
    const result: InterpretationResult = {
      individual_readings: [{ ...validReading, activation_id: "ac-inventada" }],
      patterns: [],
      overall_synthesis: "y".repeat(420),
      closing_reflection: "z".repeat(90),
      reflective_questions: ["O que permanece em observação nesta leitura?"],
    };
    const errors = validateAgainstEvidence({ result, activationIds: ["ac-sol"], verifiedPatternIds: [] });
    expect(errors.length).toBeGreaterThan(0);
  });

  it("aceita disclaimer editorial e rejeita afirmação clínica sobre a pessoa", () => {
    const disclaimer: InterpretationResult = {
      individual_readings: [validReading],
      patterns: [],
      overall_synthesis: `${"y".repeat(400)} Esta leitura não é um diagnóstico e não descreve um destino fixo.`,
      closing_reflection: `${"z".repeat(80)} Sem vidas passadas concretas nesta narrativa.`,
      reflective_questions: ["O que permanece em observação nesta leitura?"],
    };
    expect(validateAgainstEvidence({ result: disclaimer, activationIds: ["ac-sol"], verifiedPatternIds: [] })).toEqual([]);

    const claimed: InterpretationResult = {
      ...disclaimer,
      overall_synthesis: `${"y".repeat(400)} Você tem um trauma e você vai casar neste ano.`,
    };
    expect(validateAgainstEvidence({ result: claimed, activationIds: ["ac-sol"], verifiedPatternIds: [] }).join(" ")).toMatch(
      /trauma_doenca|previsao_absoluta/,
    );
  });
});

describe("RBAC", () => {
  it("restringe convite ao super admin e publicação a admin e super admin", () => {
    expect(roleHas("super_admin", "methodology.publish")).toBe(true);
    expect(roleHas("admin", "methodology.publish")).toBe(true);
    expect(roleHas("admin", "users.invite")).toBe(true);
    expect(roleHas("editor", "users.invite")).toBe(false);
    expect(roleHas("editor", "methodology.publish")).toBe(false);
    expect(roleHas("editor", "content.write")).toBe(true);
    expect(roleHas("editor", "leads.read")).toBe(false);
    expect(roleHas("support", "orders.read")).toBe(true);
    expect(roleHas("support", "content.write")).toBe(false);
    expect(roleHas("editor", "orders.read")).toBe(false);
  });

  it("rotula status e provedor do pedido", () => {
    expect(orderStatusLabel("approved")).toBe("Aprovado");
    expect(orderStatusLabel("pending")).toBe("Pendente");
    expect(paymentProviderLabel("coupon")).toBe("Cupom");
    expect(paymentProviderLabel("infinitepay")).toBe("InfinitePay");
  });
});

describe("usuários do painel", () => {
  it("exige senha coincidente para cadastro direto", async () => {
    const { adminUserCreateSchema } = await import("@/lib/schemas/forms");
    expect(
      adminUserCreateSchema.safeParse({
        email: "nova@example.com",
        role: "editor",
        password: "senhaforte",
        confirm: "senhaforte",
      }).success,
    ).toBe(true);
    expect(
      adminUserCreateSchema.safeParse({
        email: "nova@example.com",
        role: "editor",
        password: "senhaforte",
        confirm: "outra",
      }).success,
    ).toBe(false);
  });

  it("monta o link de primeiro acesso e classifica o status", async () => {
    const { adminUserStatus, firstAccessUrl } = await import("@/features/admin/users");
    expect(firstAccessUrl("http://localhost:3000/", "abcToken", "invite")).toBe(
      "http://localhost:3000/admin/primeiro-acesso?token_hash=abcToken&type=invite",
    );
    expect(adminUserStatus("2026-10-23T12:00:00.000Z", null, "2026-10-23T12:00:00.000Z")).toBe("blocked");
    expect(adminUserStatus(null, null, null)).toBe("pending");
    expect(adminUserStatus(null, null, "2026-10-23T12:00:00.000Z")).toBe("active");
  });

  it("explica e-mail ausente, senha errada e primeiro acesso", async () => {
    const { loginErrorMessage } = await import("@/features/admin/users");
    expect(loginErrorMessage("nao_cadastrado")).toMatch(/não está cadastrado/i);
    expect(loginErrorMessage("senha")).toMatch(/senha está incorreta/i);
    expect(loginErrorMessage("primeiro")).toMatch(/primeiro acesso/i);
    expect(loginErrorMessage("bloqueado")).toMatch(/bloqueado/i);
  });
});

describe("ativações novas", () => {
  it("inclui o Ascendente nas versões novas e não o inventa em mapas antigos", () => {
    expect(DEFAULT_ACTIVATION_POINTS).toContain("ascendant");
    expect(provisionalSnapshot().activateAscendant).toBe(true);
    expect(resolvedActivationPoints({ activationPoints: ["sun", "moon"], activateAscendant: false })).toEqual([
      "sun",
      "moon",
    ]);
    expect(resolvedActivationPoints({ activationPoints: ["sun", "ascendant"], activateAscendant: false })).toEqual([
      "sun",
    ]);
    expect(resolvedActivationPoints({ activationPoints: ["sun"], activateAscendant: true })).toEqual(["sun", "ascendant"]);
  });
});

describe("prompt híbrido", () => {
  it("sobe a versão e pede narrativa única sem blocos extras de Luz e Sombra", () => {
    expect(PROMPT_VERSION).toBe("1.1.0");
    expect(INDIVIDUAL_SYSTEM_PROMPT).toMatch(/2–3 parágrafos/);
    expect(INDIVIDUAL_SYSTEM_PROMPT).toMatch(/ecos mínimos/);
    expect(INDIVIDUAL_SYSTEM_PROMPT).not.toMatch(/light_expression \(40–80/);
    expect(SYNTHESIS_SYSTEM_PROMPT).toMatch(/relações/);
    expect(SYNTHESIS_SYSTEM_PROMPT).toMatch(/frase de impacto/);
    expect(IndividualReadingSchema.shape.interpretation).toBeDefined();
    expect(IndividualReadingSchema.shape.light_expression).toBeDefined();
    expect(IndividualReadingSchema.shape.shadow_expression).toBeDefined();
  });
});
