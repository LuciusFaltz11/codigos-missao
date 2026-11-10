import { WixChartForm } from "@/components/integrations/wix-chart-form";
import { getServerEnv } from "@/server/env";

export const metadata = {
  title: "Gerar mapa",
  robots: { index: false, follow: false },
};

export default function WixMapFormPage() {
  const env = getServerEnv();
  const appUrl = env.appUrl.replace(/\/$/, "");
  return (
    <WixChartForm
      privacyUrl={`${appUrl}/privacidade`}
      turnstileSiteKey={env.turnstileSiteKey ?? ""}
      wixOrigins={env.wixEmbedOrigins}
    />
  );
}
