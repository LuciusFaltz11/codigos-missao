import { astronomyState, integrationStatus } from "@/server/env";

export function GET() {
  return Response.json({
    app: "ok",
    integrations: integrationStatus(),
    astronomy: astronomyState(),
  });
}
