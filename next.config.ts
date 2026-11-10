import type { NextConfig } from "next";
import { frameAncestorsDirective, parseOriginList } from "./src/features/integrations/wix-origins";

const WIX_FORM_PATH = "/integracoes/wix/formulario-mapa";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["geo-tz", "@react-pdf/renderer"],
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  async headers() {
    const ancestors = frameAncestorsDirective(parseOriginList(process.env.WIX_EMBED_ORIGINS));
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/((?!integracoes/wix/formulario-mapa).*)",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
      {
        source: WIX_FORM_PATH,
        headers: [{ key: "Content-Security-Policy", value: `frame-ancestors ${ancestors}` }],
      },
    ];
  },
};

export default nextConfig;
