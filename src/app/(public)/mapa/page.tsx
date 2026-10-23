import { PageShell } from "@/components/site/chrome";
import { BirthWizard } from "@/components/birth-form/wizard";

export const metadata = { title: "Gerar mapa" };

export default function MapPage() {
  return (
    <PageShell>
      <div className="mx-auto grid max-w-xl gap-6 px-4 py-12">
        <div>
          <h1 className="font-display text-4xl">Seus dados de nascimento</h1>
          <p className="mt-3 text-muted">
            A hora importa porque as casas e a Roda da Fortuna dependem dela. Se você não souber a hora, o cálculo completo não será feito.
          </p>
        </div>
        <BirthWizard />
      </div>
    </PageShell>
  );
}
