import type { MetadataRoute } from "next";
import { getServerEnv } from "@/server/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getServerEnv().appUrl.replace(/\/$/, "");
  return ["", "/mapa", "/como-funciona", "/metodologia", "/perguntas", "/privacidade", "/termos", "/contato"].map(
    (path) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.6 }),
  );
}
