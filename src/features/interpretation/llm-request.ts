export function llmApiBase(provider: string, apiBase?: string | null) {
  const configured = apiBase?.trim().replace(/\/$/, "");
  if (configured) return configured;
  const name = provider.trim().toLowerCase();
  if (name === "gemini" || name === "google" || name === "google-ai") {
    return "https://generativelanguage.googleapis.com/v1beta/openai";
  }
  if (name === "anthropic") return "https://api.anthropic.com";
  return "https://api.openai.com/v1";
}

export function isGeminiProvider(provider: string, apiBase?: string | null) {
  const name = provider.trim().toLowerCase();
  if (name === "gemini" || name === "google" || name === "google-ai") return true;
  return Boolean(apiBase?.includes("generativelanguage.googleapis.com"));
}

export function openAiCompatiblePayload(input: {
  provider: string;
  model: string;
  apiBase?: string | null;
  system: string;
  user: string;
}) {
  const gemini = isGeminiProvider(input.provider, input.apiBase);
  return {
    model: input.model,
    temperature: 0.4,
    ...(gemini ? { max_tokens: 8192, reasoning_effort: "low" as const } : { response_format: { type: "json_object" as const } }),
    messages: [
      { role: "system" as const, content: input.system },
      { role: "user" as const, content: input.user },
    ],
  };
}

export function llmErrorFields(body: unknown) {
  if (!body || typeof body !== "object") return { llmStatus: null as string | null };
  const error = "error" in body && body.error && typeof body.error === "object" ? body.error : body;
  const record = error as Record<string, unknown>;
  const llmStatus =
    (typeof record.status === "string" && record.status) ||
    (typeof record.code === "string" && record.code) ||
    (typeof record.type === "string" && record.type) ||
    null;
  return { llmStatus };
}

export function llmFailureCode(status: number) {
  if (status === 429) return "llm_rate_limited";
  if (status === 502 || status === 503 || status === 504) return "llm_unavailable";
  return "llm_http_error";
}

export function isRetryableLlmHttpStatus(status: number) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

export function llmRetryDelayMs(attempt: number) {
  return Math.min(15_000, 1000 * 2 ** attempt);
}

export function jobRetryDelayMs(attempts: number, error?: string) {
  if (error === "llm_unavailable" || error === "llm_rate_limited") {
    return Math.min(10 * 60_000, 2 ** Math.max(1, attempts) * 60_000);
  }
  return attempts * 60_000;
}

export async function withLlmRetries<T>(
  run: () => Promise<T>,
  options?: {
    attempts?: number;
    sleep?: (ms: number) => Promise<void>;
    onRetry?: (input: { attempt: number; status: number }) => void;
  },
) {
  const attempts = options?.attempts ?? 3;
  const sleep = options?.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const status = error && typeof error === "object" && "status" in error ? Number(error.status) : Number.NaN;
      if (!isRetryableLlmHttpStatus(status) || attempt === attempts) throw error;
      options?.onRetry?.({ attempt, status });
      await sleep(llmRetryDelayMs(attempt));
    }
  }
  throw lastError;
}
