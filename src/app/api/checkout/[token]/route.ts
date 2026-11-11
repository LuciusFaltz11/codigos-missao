import { after } from "next/server";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { CHECKOUT_REF_COOKIE, isLocalOrderReference } from "@/features/checkout/return-status";
import { runDueJobs } from "@/server/jobs/runner";
import { getServerEnv } from "@/server/env";
import { startCheckout } from "@/server/services/checkout";

export const runtime = "nodejs";
export const maxDuration = 300;

function redirectWithCheckoutRef(url: string, externalReference?: string) {
  const response = NextResponse.redirect(url, 303);
  if (externalReference && isLocalOrderReference(externalReference)) {
    response.cookies.set({
      name: CHECKOUT_REF_COOKIE,
      value: externalReference,
      httpOnly: true,
      sameSite: "lax",
      secure: getServerEnv().appUrl.startsWith("https://"),
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }
  return response;
}

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
  if ("redirectTo" in result) {
    return redirectWithCheckoutRef(new URL(result.redirectTo, request.url).toString());
  }
  return redirectWithCheckoutRef(result.initPoint, result.externalReference);
}
