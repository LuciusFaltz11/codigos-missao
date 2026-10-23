import "server-only";
import { buildInterpretationContext } from "@/features/interpretation/context";
import {
  INDIVIDUAL_SYSTEM_PROMPT,
  PROMPT_VERSION,
  SYNTHESIS_SYSTEM_PROMPT,
} from "@/features/interpretation/prompts";
import {
  IndividualBatchSchema,
  InterpretationResultSchema,
  SynthesisSchema,
  validateAgainstEvidence,
  type IndividualReading,
  type InterpretationResult,
} from "@/features/interpretation/validate";
import { derivePatterns } from "@/features/missions/patterns";
import { tryServiceClient } from "@/server/db/clients";
import { logEvent } from "@/server/logging";
import { createInterpretationProvider } from "@/server/providers/llm";
import { loadChartByToken } from "@/server/services/charts";
import { openToken } from "@/server/security/tokens";

async function chartForEntitlement(entitlementId: string) {
  const service = tryServiceClient();
  if (!service) return null;
  const entitlement = await service
    .from("entitlements")
    .select("id,chart_id,revoked_at")
    .eq("id", entitlementId)
    .maybeSingle();
  if (!entitlement.data || entitlement.data.revoked_at) return null;
  const access = await service
    .from("natal_charts")
    .select("access_token_id,calculation_version")
    .eq("id", entitlement.data.chart_id)
    .maybeSingle();
  if (!access.data) return null;
  const tokenRow = await service
    .from("access_tokens")
    .select("token_sealed")
    .eq("id", access.data.access_token_id)
    .maybeSingle();
  if (!tokenRow.data?.token_sealed) return null;
  const loaded = await loadChartByToken(openToken(String(tokenRow.data.token_sealed)));
  if (!loaded) return null;
  return { ...loaded, calculationVersion: String(access.data.calculation_version ?? "") };
}

function chunk<T>(items: T[], size: number) {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) batches.push(items.slice(index, index + size));
  return batches;
}

export async function generateInterpretation(entitlementId: string) {
  const service = tryServiceClient();
  const loaded = await chartForEntitlement(entitlementId);
  if (!service || !loaded) return { ok: false as const, error: "chart_not_found" };

  const patterns = derivePatterns(loaded.activations);
  const built = buildInterpretationContext({
    snapshot: loaded.snapshot,
    activations: loaded.activations,
    patterns,
    calculationVersion: loaded.calculationVersion,
  });
  const existing = await service
    .from("readings")
    .select("id,status")
    .eq("entitlement_id", entitlementId)
    .eq("prompt_version", PROMPT_VERSION)
    .maybeSingle();

  if (!built.ok) {
    await service.from("readings").upsert(
      {
        id: existing.data?.id,
        chart_id: loaded.chartId,
        entitlement_id: entitlementId,
        status: "editorial_blocked",
        prompt_version: PROMPT_VERSION,
        model: null,
        context_snapshot: null,
        result: null,
        last_error: built.reason,
      },
      { onConflict: "entitlement_id,prompt_version" },
    );
    return { ok: false as const, error: built.reason };
  }

  const provider = createInterpretationProvider();
  if (provider.state !== "configured" || !provider.model) return { ok: false as const, error: "llm_not_configured" };

  const readingId = existing.data?.id ?? crypto.randomUUID();
  await service.from("readings").upsert({
    id: readingId,
    chart_id: loaded.chartId,
    entitlement_id: entitlementId,
    status: "processing",
    prompt_version: PROMPT_VERSION,
    model: provider.model,
    context_snapshot: built.context,
    last_error: null,
  });

  try {
    const readings: IndividualReading[] = [];
    let inputTokens = 0;
    let outputTokens = 0;
    for (const batch of chunk(built.context.activations, 4)) {
      const batchContext = { ...built.context, activations: batch };
      const expected = batch.map((item) => item.activation_id);
      const user = `Interprete a seguinte lista de ativações estritamente com base nos fatos e textos editoriais fornecidos no objeto JSON. Retorne individual_readings cobrindo exatamente os activation_ids informados e não inclua ativações inventadas.\n\n<CONTEXT_JSON>\n${JSON.stringify(batchContext)}\n</CONTEXT_JSON>`;
      let completion = await provider.completeJson({ system: INDIVIDUAL_SYSTEM_PROMPT, user });
      inputTokens += completion.usage?.inputTokens ?? 0;
      outputTokens += completion.usage?.outputTokens ?? 0;
      let parsed = IndividualBatchSchema.safeParse(completion.json);
      let idsOk = parsed.success && parsed.data.individual_readings.map((item) => item.activation_id).sort().join() === [...expected].sort().join();
      if (!parsed.success || !idsOk) {
        completion = await provider.completeJson({
          system: INDIVIDUAL_SYSTEM_PROMPT,
          user: `${user}\n\nA resposta anterior foi rejeitada pelo validador. Devolva somente o JSON corrigido, com exatamente estes activation_ids: ${expected.join(", ")}.`,
        });
        inputTokens += completion.usage?.inputTokens ?? 0;
        outputTokens += completion.usage?.outputTokens ?? 0;
        parsed = IndividualBatchSchema.safeParse(completion.json);
        idsOk = parsed.success && parsed.data.individual_readings.map((item) => item.activation_id).sort().join() === [...expected].sort().join();
      }
      if (!parsed.success || !idsOk) throw new Error("failed_validation");
      readings.push(...parsed.data.individual_readings);
    }

    const synthesisUser = `Escreva uma síntese autoral e integrada a partir de:\n- interpretation_context validado;\n- leituras individuais revisadas;\n- verified_patterns pré-calculados.\n\nRetorne APENAS JSON com os IDs e evidências existentes. Se não houver repetição literal, não afirme que há. Use somente pattern_id presentes em verified_patterns.\n\n<INPUT_JSON>\n${JSON.stringify({ context: built.context, individual_readings: readings })}\n</INPUT_JSON>`;
    let synthesis = await provider.completeJson({ system: SYNTHESIS_SYSTEM_PROMPT, user: synthesisUser });
    inputTokens += synthesis.usage?.inputTokens ?? 0;
    outputTokens += synthesis.usage?.outputTokens ?? 0;
    let synthesisParsed = SynthesisSchema.safeParse(synthesis.json);
    let result: InterpretationResult | null = synthesisParsed.success
      ? { ...synthesisParsed.data, individual_readings: readings }
      : null;
    let evidenceErrors = result
      ? validateAgainstEvidence({
          result,
          activationIds: built.context.activations.map((item) => item.activation_id),
          verifiedPatternIds: built.context.verified_patterns.map((item) => item.pattern_id),
        })
      : ["schema"];
    if (!result || evidenceErrors.length > 0) {
      synthesis = await provider.completeJson({
        system: SYNTHESIS_SYSTEM_PROMPT,
        user: `${synthesisUser}\n\nA resposta anterior falhou na validação (${evidenceErrors.join(" ")}). Corrija o JSON sem inventar ids.`,
      });
      inputTokens += synthesis.usage?.inputTokens ?? 0;
      outputTokens += synthesis.usage?.outputTokens ?? 0;
      synthesisParsed = SynthesisSchema.safeParse(synthesis.json);
      result = synthesisParsed.success ? { ...synthesisParsed.data, individual_readings: readings } : null;
      evidenceErrors = result
        ? validateAgainstEvidence({
            result,
            activationIds: built.context.activations.map((item) => item.activation_id),
            verifiedPatternIds: built.context.verified_patterns.map((item) => item.pattern_id),
          })
        : ["schema"];
    }
    if (!result || evidenceErrors.length > 0) throw new Error("failed_validation");
    const stored = InterpretationResultSchema.parse(result);
    await service
      .from("readings")
      .update({
        status: "completed",
        result: stored,
        token_usage: { inputTokens, outputTokens },
        last_error: null,
      })
      .eq("id", readingId);
    logEvent("info", "reading_completed", { model: provider.model });
    return { ok: true as const, readingId };
  } catch (error) {
    const code = error instanceof Error ? error.message : "reading_failed";
    await service.from("readings").update({ status: code === "failed_validation" ? "failed_validation" : "retryable_failed", last_error: code }).eq("id", readingId);
    logEvent("error", "reading_failed", { code });
    return { ok: false as const, error: code };
  }
}
