import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/site/chrome";
import { DISCLAIMER, pointLabel } from "@/lib/constants/astrology";
import { InterpretationResultSchema } from "@/features/interpretation/validate";
import { loadChartByToken } from "@/server/services/charts";

export const dynamic = "force-dynamic";

export default async function CompleteReadingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const loaded = await loadChartByToken(token);
  if (!loaded) notFound();
  if (loaded.entitlement !== "active" || !loaded.entitlementId) redirect(`/mapa/resultado/${token}`);

  const reading = await loaded.service
    .from("readings")
    .select("status,result,last_error")
    .eq("entitlement_id", loaded.entitlementId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const parsed = InterpretationResultSchema.safeParse(reading.data?.result);

  return (
    <PageShell>
      <div className="mx-auto grid max-w-3xl gap-8 px-4 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-4xl">Leitura completa</h1>
          <div className="flex gap-3 text-sm">
            <a className="ui-button rounded-xl bg-wine px-4 py-2 font-semibold text-white" href={`/api/charts/${token}/report`}>
              Baixar PDF
            </a>
            <form action={`/api/charts/${token}/email`} method="post">
              <button className="rounded-xl border border-border px-4 py-2" type="submit">
                Reenviar e-mail
              </button>
            </form>
          </div>
        </div>
        <p className="text-sm text-muted">{DISCLAIMER}</p>
        {!parsed.success ? (
          <p className="rounded-2xl bg-gold-soft p-4 text-sm">
            A leitura ainda não está pronta. Estado: {reading.data?.status ?? "na fila"}.
            {reading.data?.last_error ? ` Motivo técnico: ${reading.data.last_error}.` : ""} O pagamento permanece registrado.
          </p>
        ) : (
          <>
            <nav aria-label="Capítulos" className="grid gap-2 text-sm">
              {parsed.data.individual_readings.map((item) => (
                <a key={item.activation_id} href={`#${item.activation_id}`}>
                  {item.headline}
                </a>
              ))}
              <a href="#sintese">Síntese</a>
            </nav>
            {parsed.data.individual_readings.map((item) => {
              const activation = loaded.activations.find((entry) => entry.id === item.activation_id);
              return (
                <article id={item.activation_id} key={item.activation_id} className="grid gap-3 border-t border-border pt-6">
                  <p className="text-xs tracking-widest text-muted uppercase">{activation ? pointLabel(activation.natalPointId) : item.activation_id}</p>
                  <h2 className="font-display text-3xl">{item.headline}</h2>
                  {activation ? (
                    <p className="text-sm">
                      {activation.code.archetype} · {activation.signName} · casa {activation.houseNumber}
                    </p>
                  ) : null}
                  <p className="leading-7">{item.interpretation}</p>
                  <p className="leading-7">{item.light_expression}</p>
                  <p className="leading-7">{item.shadow_expression}</p>
                  <p className="font-medium">{item.reflective_question}</p>
                </article>
              );
            })}
            <section id="sintese" className="grid gap-4">
              <h2 className="font-display text-3xl">Síntese</h2>
              {parsed.data.patterns.map((pattern) => (
                <article key={pattern.pattern_id}>
                  <h3 className="font-semibold">{pattern.theme}</h3>
                  <p className="mt-2 leading-7">{pattern.insight}</p>
                </article>
              ))}
              <p className="leading-7">{parsed.data.overall_synthesis}</p>
              <p className="leading-7">{parsed.data.closing_reflection}</p>
            </section>
          </>
        )}
        <Link href={`/mapa/resultado/${token}`} className="text-sm text-wine">
          Voltar à prévia
        </Link>
      </div>
    </PageShell>
  );
}
