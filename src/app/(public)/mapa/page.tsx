import { BirthWizard } from "@/components/birth-form/wizard";
import { ChartLaunchGate } from "@/components/chart/chart-launch-gate";
import { PageShell } from "@/components/site/chrome";

export const metadata = { title: "Gerar mapa" };

export default function MapPage() {
  return (
    <PageShell>
      <div className="mx-auto grid max-w-xl gap-6 px-4 py-12">
        <div>
          <h1 className="font-display text-4xl">Seus dados de nascimento</h1>
          <div className="hairline mt-4" />
          <p className="mt-4 text-muted">
            A hora importa porque as casas e a Roda da Fortuna dependem dela. Se você não souber a hora, o cálculo completo não será feito.
          </p>
        </div>
        <ChartLaunchGate>
          <BirthWizard />
        </ChartLaunchGate>
      </div>
    </PageShell>
  );
}
