import { after } from "next/server";
import { redirect } from "next/navigation";
import { runDueJobs } from "@/server/jobs/runner";
import { startCheckout } from "@/server/services/checkout";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const form = await request.formData().catch(() => null);
  const coupon = String(form?.get("cupom") ?? form?.get("coupon") ?? "");
  const result = await startCheckout(token, coupon);
  if (!result.ok) {
    const erro =
      "code" in result && result.code === "cupom"
        ? "cupom"
        : "code" in result && result.code === "minimo"
          ? "minimo"
          : "code" in result && result.code === "link"
            ? "link"
            : "1";
    const params = new URLSearchParams({ erro });
    if (coupon) params.set("cupom", coupon);
    redirect(`/checkout/${token}?${params.toString()}`);
  }
  if ("runJobs" in result && result.runJobs) {
    after(async () => {
      await runDueJobs(3);
    });
  }
  redirect("redirectTo" in result ? result.redirectTo : result.initPoint);
}
