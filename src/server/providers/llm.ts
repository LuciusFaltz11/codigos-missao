import "server-only";
import {
  isGeminiProvider,
  llmApiBase,
  llmErrorFields,
  llmFailureCode,
  openAiCompatiblePayload,
  withLlmRetries,
} from "@/features/interpretation/llm-request";
import { logEvent } from "@/server/logging";
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

export class LlmHttpError extends Error {
  readonly code: ReturnType<typeof llmFailureCode>;
  constructor(
    readonly status: number,
    readonly llmStatus: string | null,
    readonly provider: string,
    readonly model: string,
  ) {
    super(llmFailureCode(status));
    this.name = "LlmHttpError";
    this.code = llmFailureCode(status);
  }
}

function extractJson(text: string) {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  return JSON.parse(trimmed) as unknown;
}

function isTimeout(error: unknown) {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

async function rejectIfHttpError(response: Response, provider: string, model: string) {
  if (response.ok) return;
  let llmStatus: string | null = null;
  try {
    llmStatus = llmErrorFields(await response.json()).llmStatus;
  } catch {
    llmStatus = null;
  }
  throw new LlmHttpError(response.status, llmStatus, provider, model);
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
    try {
      return await withLlmRetries(
        () =>
          this.provider.trim().toLowerCase() === "anthropic" ? this.anthropic(input) : this.openAiCompatible(input),
        {
          onRetry: ({ attempt, status }) => {
            logEvent("info", "llm_retry", { attempt, status, provider: this.provider, model: this.model });
          },
        },
      );
    } catch (error) {
      if (isTimeout(error)) throw new Error("llm_timeout");
      throw error;
    }
  }

  private async openAiCompatible(input: { system: string; user: string }): Promise<LlmCompletion> {
    const base = llmApiBase(this.provider, this.apiBase);
    const response = await this.fetchImpl(`${base}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify(
        openAiCompatiblePayload({
          provider: this.provider,
          model: this.model,
          apiBase: this.apiBase ?? base,
          system: input.system,
          user: input.user,
        }),
      ),
      signal: AbortSignal.timeout(isGeminiProvider(this.provider, this.apiBase) ? 90_000 : 60_000),
    });
    await rejectIfHttpError(response, this.provider, this.model);
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
    await rejectIfHttpError(response, this.provider, this.model);
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
