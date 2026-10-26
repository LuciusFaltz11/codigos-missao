import { redirect } from "next/navigation";
import { startCheckout } from "@/server/services/checkout";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const form = await request.formData().catch(() => null);
  const coupon = String(form?.get("cupom") ?? form?.get("coupon") ?? "");
  const result = await startCheckout(token, coupon);
  if (!result.ok || !result.initPoint) {
    const erro = "code" in result && result.code === "cupom" ? "cupom" : "code" in result && result.code === "minimo" ? "minimo" : "code" in result && result.code === "link" ? "link" : "1";
    const params = new URLSearchParams({ erro });
    if (coupon) params.set("cupom", coupon);
    redirect(`/checkout/${token}?${params.toString()}`);
  }
  redirect(result.initPoint);
}
