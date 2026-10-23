import { getServerEnv } from "@/server/env";
import { safeEqual } from "@/server/security/tokens";
import { runDueJobs } from "@/server/jobs/runner";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  const env = getServerEnv();
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!env.cronSecret || !token || !safeEqual(token, env.cronSecret)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const ran = await runDueJobs(5);
  return Response.json({ ok: true, ran });
}
