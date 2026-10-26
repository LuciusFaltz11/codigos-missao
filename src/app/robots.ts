import type { MetadataRoute } from "next";
import { getServerEnv } from "@/server/env";

export default function robots(): MetadataRoute.Robots {
  const base = getServerEnv().appUrl.replace(/\/$/, "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/mapa/resultado/", "/mapa/completo/", "/api/"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
