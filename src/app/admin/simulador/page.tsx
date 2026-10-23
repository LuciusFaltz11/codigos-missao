import { AdminPanel } from "@/components/admin/shell";
import { Input } from "@/components/ui/input";
import { astronomyState, getServerEnv } from "@/server/env";
import { simulateManual } from "@/server/actions/admin";

export const dynamic = "force-dynamic";

export default async function SimulatorPage({ searchParams }: { searchParams: Promise<{ resultado?: string; erro?: string }> }) {
  const params = await searchParams;
  const engine = getServerEnv().astrologyEngine;
  const state = astronomyState();
  let parsed: unknown = null;
  if (params.resultado) {
    try {
      parsed = JSON.parse(params.resultado);
    } catch {
      parsed = null;
    }
  }
  return (
    <AdminPanel>
      <h1 className="font-display text-4xl">Simulador</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Motor astronômico: {engine} ({state}). A trilha abaixo só classifica uma longitude informada. Ela não calcula planeta, casa real nem mapa.
      </p>
      <form action={simulateManual} className="mt-6 grid max-w-md gap-3">
        <Input name="pointId" defaultValue="sun" aria-label="Ponto" />
        <Input name="longitude" type="number" step="0.0001" placeholder="Longitude 0 a 360" required />
        <Input name="house" type="number" min={1} max={12} placeholder="Casa informada manualmente" required />
        <button className="min-h-11 rounded-xl bg-wine text-white" type="submit">
          Classificar
        </button>
      </form>
      {parsed ? (
        <section className="mt-6">
          <h2 className="font-display text-2xl">JSON explicativo</h2>
          <pre className="mt-3 overflow-auto rounded-2xl bg-surface p-4 text-xs">{JSON.stringify(parsed, null, 2)}</pre>
        </section>
      ) : null}
    </AdminPanel>
  );
}
