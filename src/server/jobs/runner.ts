import "server-only";
import { jobRetryDelayMs } from "@/features/interpretation/llm-request";
import { InterpretationResultSchema } from "@/features/interpretation/validate";
import { tryServiceClient } from "@/server/db/clients";
import { getServerEnv } from "@/server/env";
import { logEvent } from "@/server/logging";
import { createEmailProvider } from "@/server/providers/email";
import { openToken } from "@/server/security/tokens";
import { generateInterpretation } from "@/server/services/interpretation";
import { renderReportPdf } from "@/server/services/pdf";

type JobRow = {
  id: string;
  kind: "interpretation" | "pdf" | "email";
  status: string;
  attempts: number;
  payload: { entitlementId?: string; chartId?: string; readingId?: string; reportId?: string };
};

async function claimJob() {
  const service = tryServiceClient();
  if (!service) return null;
  const next = await service
    .from("jobs")
    .select("id,kind,status,attempts,payload")
    .in("status", ["queued", "retryable_failed"])
    .lte("next_run_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!next.data) return null;
  const claimed = await service
    .from("jobs")
    .update({ status: "processing", attempts: Number(next.data.attempts) + 1, updated_at: new Date().toISOString() })
    .eq("id", next.data.id)
    .eq("status", next.data.status)
    .select("id,kind,status,attempts,payload")
    .maybeSingle();
  return claimed.data ? (claimed.data as JobRow) : null;
}

async function finish(job: JobRow, status: "completed" | "retryable_failed" | "permanent_failed", error?: string) {
  const service = tryServiceClient();
  if (!service) return;
  const attempts = job.attempts;
  await service
    .from("jobs")
    .update({
      status: status === "retryable_failed" && attempts >= 5 ? "permanent_failed" : status,
      last_error: error ?? null,
      next_run_at:
        status === "retryable_failed"
          ? new Date(Date.now() + jobRetryDelayMs(attempts, error)).toISOString()
          : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);
}

async function runInterpretation(job: JobRow) {
  const entitlementId = job.payload.entitlementId;
  if (!entitlementId) return finish(job, "permanent_failed", "missing_entitlement");
  const result = await generateInterpretation(entitlementId);
  if (!result.ok) {
    const permanent = result.error === "editorial_not_published" || result.error === "methodology_not_published" || result.error === "failed_validation";
    return finish(job, permanent ? "permanent_failed" : "retryable_failed", result.error);
  }
  const service = tryServiceClient();
  await service?.from("jobs").insert({
    kind: "pdf",
    idempotency_key: `pdf:${result.readingId}`,
    status: "queued",
    payload: { readingId: result.readingId, entitlementId, chartId: job.payload.chartId },
    next_run_at: new Date().toISOString(),
  });
  return finish(job, "completed");
}

async function runPdf(job: JobRow) {
  const service = tryServiceClient();
  if (!service || !job.payload.readingId || !job.payload.chartId) return finish(job, "permanent_failed", "missing_reading");
  const reading = await service.from("readings").select("id,result,chart_id,status").eq("id", job.payload.readingId).maybeSingle();
  const parsed = InterpretationResultSchema.safeParse(reading.data?.result);
  if (!parsed.success || reading.data?.status !== "completed") return finish(job, "retryable_failed", "reading_not_ready");
  const chart = await service.from("natal_charts").select("access_token_id,methodology_snapshot,calculation_version,birth_record_id").eq("id", job.payload.chartId).maybeSingle();
  const birth = chart.data
    ? await service.from("birth_records").select("city_label,birth_date,birth_time,iana_timezone,lead_id").eq("id", chart.data.birth_record_id).maybeSingle()
    : null;
  const lead = birth?.data ? await service.from("leads").select("name").eq("id", birth.data.lead_id).maybeSingle() : null;
  const activations = await service.from("mission_activations").select("point_id,sign_slug,degree_within_sign,house_number,mission_code_id,methodology_version,longitude,retrograde,code_snapshot,trail").eq("chart_id", job.payload.chartId);
  const birthRow = birth?.data;
  const leadRow = lead?.data;
  if (!chart.data || !birthRow || !leadRow) return finish(job, "permanent_failed", "chart_missing");
  const snapshot = chart.data.methodology_snapshot as { versionLabel: string; notice: string };
  const pdf = await renderReportPdf({
    name: String(leadRow.name),
    cityLabel: String(birthRow.city_label),
    localDate: String(birthRow.birth_date),
    localTime: String(birthRow.birth_time).slice(0, 5),
    timezone: String(birthRow.iana_timezone),
    methodologyVersion: snapshot.versionLabel,
    calculationVersion: String(chart.data.calculation_version ?? ""),
    notice: snapshot.notice,
    activations: (activations.data ?? []).map((row) => ({
      id: `ac-${row.point_id}`,
      natalPointId: String(row.point_id),
      signSlug: String(row.sign_slug),
      signName: String((row.code_snapshot as { signName: string }).signName),
      degreeWithinSign: Number(row.degree_within_sign),
      houseNumber: Number(row.house_number),
      missionCodeId: String(row.mission_code_id),
      methodologyVersion: String(row.methodology_version),
      longitude: Number(row.longitude),
      retrograde: (row.retrograde as boolean | null) ?? null,
      code: row.code_snapshot as never,
      trail: (row.trail as string[]) ?? [],
    })),
    reading: parsed.data,
  });
  const existingReport = await service
    .from("reports")
    .select("id,storage_path,status")
    .eq("reading_id", job.payload.readingId)
    .maybeSingle();
  let report = existingReport;
  if (!report.data) {
    report = await service
      .from("reports")
      .insert({
        chart_id: job.payload.chartId,
        reading_id: job.payload.readingId,
        entitlement_id: job.payload.entitlementId,
        status: "processing",
      })
      .select("id,storage_path,status")
      .single();
  }
  if (report.error || !report.data) return finish(job, "retryable_failed", "report_row_failed");
  if (report.data.status !== "ready") {
    const path = String(report.data.storage_path ?? `${report.data.id}.pdf`);
    if (!report.data.storage_path) {
      const uploaded = await service.storage.from("reports").upload(path, pdf, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (uploaded.error) return finish(job, "retryable_failed", "storage_upload_failed");
    }
    const ready = await service
      .from("reports")
      .update({
        status: "ready",
        storage_path: path,
        snapshot: { methodologyVersion: snapshot.versionLabel, generatedAt: new Date().toISOString() },
      })
      .eq("id", report.data.id)
      .neq("status", "ready");
    if (ready.error) return finish(job, "retryable_failed", "report_finalize_failed");
  }
  await service.from("jobs").insert({
    kind: "email",
    idempotency_key: `email:${report.data.id}`,
    status: "queued",
    payload: { reportId: report.data.id, chartId: job.payload.chartId },
    next_run_at: new Date().toISOString(),
  });
  return finish(job, "completed");
}

async function runEmail(job: JobRow) {
  const service = tryServiceClient();
  if (!service || !job.payload.reportId || !job.payload.chartId) return finish(job, "permanent_failed", "missing_report");
  const email = createEmailProvider();
  if (email.state !== "configured") return finish(job, "retryable_failed", "email_not_configured");
  const chart = await service.from("natal_charts").select("access_token_id,birth_record_id").eq("id", job.payload.chartId).maybeSingle();
  const tokenRow = chart.data
    ? await service.from("access_tokens").select("token_sealed").eq("id", chart.data.access_token_id).maybeSingle()
    : null;
  const birth = chart.data
    ? await service.from("birth_records").select("lead_id").eq("id", chart.data.birth_record_id).maybeSingle()
    : null;
  const lead = birth?.data ? await service.from("leads").select("email,name").eq("id", birth.data.lead_id).maybeSingle() : null;
  const report = await service.from("reports").select("storage_path").eq("id", job.payload.reportId).maybeSingle();
  const sealed = tokenRow?.data?.token_sealed;
  const leadEmail = lead?.data?.email;
  const storagePath = report.data?.storage_path;
  if (!sealed || !leadEmail || !storagePath) {
    return finish(job, "retryable_failed", "email_context_missing");
  }
  const token = openToken(String(sealed));
  const url = `${getServerEnv().appUrl.replace(/\/$/, "")}/mapa/completo/${token}`;
  const file = await service.storage.from("reports").download(String(storagePath));
  const buffer = file.data ? Buffer.from(await file.data.arrayBuffer()) : null;
  const sent = await email.send({
    to: String(leadEmail),
    subject: "Sua leitura Códigos da Missão",
    html: `<p>Olá,</p><p>Sua leitura está disponível em um link seguro. O pagamento confirmado não expira o acesso por este endereço.</p><p><a href="${url}">Abrir leitura</a></p><p>A leitura é simbólica e não descreve um destino fixo.</p>`,
    attachment: buffer && buffer.length < 4_000_000 ? { filename: "codigos-da-missao.pdf", content: buffer } : undefined,
  });
  await service.from("email_deliveries").insert({
    report_id: job.payload.reportId,
    status: "sent",
    provider_id: sent.id,
  });
  await service.from("analytics_events").insert({ name: "report_delivered", chart_id: job.payload.chartId, properties: {} });
  return finish(job, "completed");
}

export async function runDueJobs(limit = 3) {
  let ran = 0;
  for (let index = 0; index < limit; index += 1) {
    const job = await claimJob();
    if (!job) break;
    ran += 1;
    try {
      if (job.kind === "interpretation") await runInterpretation(job);
      else if (job.kind === "pdf") await runPdf(job);
      else await runEmail(job);
    } catch (error) {
      logEvent("error", "job_failed", { code: error instanceof Error ? error.message : "job_failed" });
      await finish(job, "retryable_failed", "job_exception");
    }
  }
  return ran;
}
