import { describe, expect, it } from "vitest";
import { decidePaymentTransition } from "@/features/checkout/transition";
import { checkoutBlockers, glossaryReady, provisionalSnapshot } from "@/features/methodology/snapshot";
import { toFreePreview, type PreparedChart } from "@/features/preview/redact";
import { validateAgainstEvidence, type InterpretationResult } from "@/features/interpretation/validate";
import { roleHas } from "@/server/auth/rbac";
import { officialCatalog } from "@/features/missions/catalog";
import type { MissionActivation } from "@/features/missions/activate";

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
    expect(glossaryReady(provisionalSnapshot())).toBe(false);
  });
});

describe("validador da leitura", () => {
  it("rejeita ativação inventada e padrão sem evidência", () => {
    const result: InterpretationResult = {
      individual_readings: [
        {
          activation_id: "ac-inventada",
          headline: "Um título válido",
          interpretation: "x".repeat(60),
          light_expression: "uma expressão de luz suficiente",
          shadow_expression: "uma expressão de sombra suficiente",
          reflective_question: "O que você observa?",
        },
      ],
      patterns: [],
      overall_synthesis: "y".repeat(420),
      closing_reflection: "z".repeat(90),
      reflective_questions: ["O que permanece em observação nesta leitura?"],
    };
    const errors = validateAgainstEvidence({ result, activationIds: ["ac-sol"], verifiedPatternIds: [] });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe("RBAC", () => {
  it("restringe convite ao super admin e publicação a admin e super admin", () => {
    expect(roleHas("super_admin", "methodology.publish")).toBe(true);
    expect(roleHas("admin", "methodology.publish")).toBe(true);
    expect(roleHas("editor", "methodology.publish")).toBe(false);
    expect(roleHas("editor", "content.write")).toBe(true);
    expect(roleHas("editor", "leads.read")).toBe(false);
    expect(roleHas("support", "orders.read")).toBe(true);
    expect(roleHas("support", "content.write")).toBe(false);
  });
});

describe("usuários do painel", () => {
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
