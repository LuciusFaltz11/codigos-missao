import { describe, expect, it } from "vitest";
import { INDIVIDUAL_SYSTEM_PROMPT, PROMPT_VERSION, SYNTHESIS_SYSTEM_PROMPT } from "@/features/interpretation/prompts";
import { pickLivePrompts } from "@/features/interpretation/prompt-store";
import { interpretationPromptSchema } from "@/lib/schemas/forms";

describe("prompts da leitura", () => {
  it("usa o texto padrão quando o banco está vazio", () => {
    expect(pickLivePrompts([])).toEqual({
      individual: INDIVIDUAL_SYSTEM_PROMPT,
      synthesis: SYNTHESIS_SYSTEM_PROMPT,
      version: PROMPT_VERSION,
    });
  });

  it("ignora rascunho e texto em branco", () => {
    const live = pickLivePrompts([
      { kind: "individual", version: "9.9.9", body: "rascunho longo o bastante para parecer válido", status: "draft" },
      { kind: "individual", version: "1.1.0", body: "   ", status: "published" },
      { kind: "synthesis", version: "1.1.0", body: "   ", status: "published" },
    ]);
    expect(live.individual).toBe(INDIVIDUAL_SYSTEM_PROMPT);
    expect(live.synthesis).toBe(SYNTHESIS_SYSTEM_PROMPT);
  });

  it("escolhe o prompt publicado mais recente de cada tipo", () => {
    const live = pickLivePrompts([
      {
        kind: "individual",
        version: "1.0.0",
        body: "prompt individual antigo ".repeat(8),
        status: "published",
        created_at: "2026-01-01T00:00:00.000Z",
      },
      {
        kind: "individual",
        version: "1.1.0",
        body: "prompt individual vigente ".repeat(8),
        status: "published",
        created_at: "2026-10-01T00:00:00.000Z",
      },
      {
        kind: "synthesis",
        version: "1.1.0",
        body: "prompt de sintese vigente ".repeat(8),
        status: "published",
        created_at: "2026-10-01T00:00:00.000Z",
      },
    ]);
    expect(live.individual).toContain("prompt individual vigente");
    expect(live.synthesis).toContain("prompt de sintese vigente");
    expect(live.version).toBe("1.1.0");
  });

  it("recusa prompt curto demais no formulário", () => {
    expect(interpretationPromptSchema.safeParse({ kind: "individual", body: "curto" }).success).toBe(false);
    expect(interpretationPromptSchema.safeParse({ kind: "individual", body: "a".repeat(80) }).success).toBe(true);
    expect(interpretationPromptSchema.safeParse({ kind: "other", body: "a".repeat(80) }).success).toBe(false);
  });
});
