import { describe, expect, it } from "vitest";
import {
  isGeminiProvider,
  isRetryableLlmHttpStatus,
  jobRetryDelayMs,
  llmApiBase,
  llmErrorFields,
  llmFailureCode,
  openAiCompatiblePayload,
  withLlmRetries,
} from "@/features/interpretation/llm-request";

describe("pedido ao modelo de interpretação", () => {
  it("não manda Gemini para a OpenAI quando LLM_API_BASE está vazio", () => {
    expect(llmApiBase("gemini")).toBe("https://generativelanguage.googleapis.com/v1beta/openai");
    expect(llmApiBase("google", "")).toBe("https://generativelanguage.googleapis.com/v1beta/openai");
    expect(isGeminiProvider("gemini")).toBe(true);
  });

  it("preserva uma base explícita e o endpoint da OpenAI", () => {
    expect(llmApiBase("gemini", "https://generativelanguage.googleapis.com/v1beta/openai/")).toBe(
      "https://generativelanguage.googleapis.com/v1beta/openai",
    );
    expect(llmApiBase("openai")).toBe("https://api.openai.com/v1");
  });

  it("usa raciocínio baixo no Gemini 3.8, sem json_object nem thinking minimal", () => {
    const payload = openAiCompatiblePayload({
      provider: "gemini",
      model: "gemini-3.8-flash",
      system: "sys",
      user: "user",
    });
    expect(payload).toMatchObject({
      model: "gemini-3.8-flash",
      max_tokens: 8192,
      reasoning_effort: "low",
    });
    expect(payload).not.toHaveProperty("response_format");
  });

  it("mantém json_object na OpenAI", () => {
    expect(
      openAiCompatiblePayload({
        provider: "openai",
        model: "gpt-4.1-mini",
        system: "sys",
        user: "user",
      }),
    ).toMatchObject({ response_format: { type: "json_object" } });
  });

  it("extrai o status da API sem guardar o corpo inteiro", () => {
    expect(llmErrorFields({ error: { status: "INVALID_ARGUMENT", message: "thinking_level" } })).toEqual({
      llmStatus: "INVALID_ARGUMENT",
    });
  });

  it("trata 503 da Gemini como indisponibilidade temporária e tenta de novo", async () => {
    expect(llmFailureCode(503)).toBe("llm_unavailable");
    expect(isRetryableLlmHttpStatus(503)).toBe(true);
    expect(isRetryableLlmHttpStatus(400)).toBe(false);
    expect(jobRetryDelayMs(1, "llm_unavailable")).toBeGreaterThanOrEqual(120_000);

    let calls = 0;
    const value = await withLlmRetries(
      async () => {
        calls += 1;
        if (calls < 3) {
          const error = Object.assign(new Error("llm_unavailable"), { status: 503 });
          throw error;
        }
        return "ok";
      },
      { sleep: async () => undefined },
    );
    expect(value).toBe("ok");
    expect(calls).toBe(3);
  });
});
