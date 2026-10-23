import { redirect } from "next/navigation";
import { startCheckout } from "@/server/services/checkout";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const result = await startCheckout(token);
  if (!result.ok || !result.initPoint) {
    redirect(`/checkout/${token}?erro=1`);
  }
  redirect(result.initPoint);
}
