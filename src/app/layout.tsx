import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import { getServerEnv } from "@/server/env";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const appUrl = getServerEnv().appUrl;

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Códigos da Missão",
    template: "%s · Códigos da Missão",
  },
  description:
    "Leitura simbólica do mapa natal a partir dos 36 arquétipos de Val Wilges. O código vem do signo e do decanato; a interpretação não escolhe a posição astral.",
  openGraph: {
    title: "Códigos da Missão",
    description: "Uma leitura simbólica dos 36 códigos a partir do seu mapa natal.",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen bg-background text-ink antialiased">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
