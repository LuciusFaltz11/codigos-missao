import { redirect } from "next/navigation";

export default async function CodeEditRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/codigos?editar=${encodeURIComponent(id)}`);
}
