import "server-only";
import { getServerEnv } from "@/server/env";

export type LlmCompletion = {
  json: unknown;
  model: string;
  usage: { inputTokens: number | null; outputTokens: number | null } | null;
};

export interface InterpretationProvider {
  state: "configured" | "not_configured";
  model: string | null;
  completeJson(input: { system: string; user: string }): Promise<LlmCompletion>;
}

function extractJson(text: string) {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  return JSON.parse(trimmed) as unknown;
}

export class NotConfiguredLlm implements InterpretationProvider {
  state = "not_configured" as const;
  model = null;
  async completeJson(): Promise<LlmCompletion> {
    throw new Error("llm_not_configured");
  }
}

export class HttpLlmProvider implements InterpretationProvider {
  state = "configured" as const;
  constructor(
    readonly model: string,
    private readonly provider: string,
    private readonly apiKey: string,
    private readonly apiBase: string | undefined,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async completeJson(input: { system: string; user: string }): Promise<LlmCompletion> {
    if (this.provider === "anthropic") return this.anthropic(input);
    return this.openAiCompatible(input);
  }

  private async openAiCompatible(input: { system: string; user: string }): Promise<LlmCompletion> {
    const base = this.apiBase ?? "https://api.openai.com/v1";
    const response = await this.fetchImpl(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error("llm_http_error");
    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error("llm_empty");
    return {
      json: extractJson(content),
      model: this.model,
      usage: {
        inputTokens: body.usage?.prompt_tokens ?? null,
        outputTokens: body.usage?.completion_tokens ?? null,
      },
    };
  }

  private async anthropic(input: { system: string; user: string }): Promise<LlmCompletion> {
    const response = await this.fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        temperature: 0.4,
        system: input.system,
        messages: [{ role: "user", content: input.user }],
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error("llm_http_error");
    const body = (await response.json()) as {
      content?: Array<{ text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const content = body.content?.map((part) => part.text ?? "").join("\n");
    if (!content) throw new Error("llm_empty");
    return {
      json: extractJson(content),
      model: this.model,
      usage: {
        inputTokens: body.usage?.input_tokens ?? null,
        outputTokens: body.usage?.output_tokens ?? null,
      },
    };
  }
}

export function createInterpretationProvider(): InterpretationProvider {
  const env = getServerEnv();
  if (!env.llmProvider || !env.llmApiKey || !env.llmModel) return new NotConfiguredLlm();
  return new HttpLlmProvider(env.llmModel, env.llmProvider, env.llmApiKey, env.llmApiBase);
}
