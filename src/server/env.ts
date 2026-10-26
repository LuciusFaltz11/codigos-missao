export type IntegrationName =
  | "supabase"
  | "infinitepay"
  | "email"
  | "llm"
  | "geocoding"
  | "astronomy";

export type IntegrationState = "configured" | "not_configured" | "license_unconfirmed";

function read(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getServerEnv() {
  return {
    appUrl: read("NEXT_APP_URL") ?? "http://localhost:3000",
    supabaseUrl: read("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),
    databaseUrl: read("SUPABASE_DB_URL"),
    infinitePayHandle: read("INFINITEPAY_HANDLE"),
    infinitePayApiKey: read("INFINITEPAY_API_KEY"),
    resendApiKey: read("RESEND_API_KEY"),
    emailFrom: read("EMAIL_FROM"),
    llmProvider: read("LLM_PROVIDER"),
    llmApiKey: read("LLM_API_KEY"),
    llmModel: read("LLM_MODEL"),
    llmApiBase: read("LLM_API_BASE"),
    astrologyEngine: read("ASTROLOGY_ENGINE") ?? "caelus",
    astrologyLicenseConfirmed: read("ASTROLOGY_LICENSE_CONFIRMED") === "true",
    astrologyWorkerUrl: read("ASTROLOGY_WORKER_URL"),
    astrologyWorkerSecret: read("ASTROLOGY_WORKER_SECRET"),
    geocodingProvider: read("GEOCODING_PROVIDER"),
    geocodingApiKey: read("GEOCODING_API_KEY"),
    cronSecret: read("CRON_SECRET"),
    policyVersion: read("POLICY_VERSION") ?? "0.1.0-minuta",
  };
}

export type ServerEnv = ReturnType<typeof getServerEnv>;

export function astronomyState(env: ServerEnv = getServerEnv()): IntegrationState {
  if (env.astrologyEngine === "caelus") return "configured";
  if (env.astrologyEngine === "none" || env.astrologyEngine === "") return "not_configured";
  if (env.astrologyEngine !== "swiss_worker") return "not_configured";
  if (!env.astrologyLicenseConfirmed) return "license_unconfirmed";
  if (!env.astrologyWorkerUrl || !env.astrologyWorkerSecret) return "not_configured";
  return "configured";
}

export function integrationStatus(env: ServerEnv = getServerEnv()): Record<IntegrationName, IntegrationState> {
  return {
    supabase: env.supabaseUrl && env.supabaseAnonKey && env.serviceRoleKey ? "configured" : "not_configured",
    infinitepay: env.infinitePayHandle && env.infinitePayApiKey ? "configured" : "not_configured",
    email: env.resendApiKey && env.emailFrom ? "configured" : "not_configured",
    llm: env.llmProvider && env.llmApiKey && env.llmModel ? "configured" : "not_configured",
    geocoding: env.geocodingProvider && env.geocodingApiKey ? "configured" : "not_configured",
    astronomy: astronomyState(env),
  };
}
