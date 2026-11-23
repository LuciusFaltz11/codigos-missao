import Link from "next/link";
import { PageShell } from "@/components/site/chrome";
import { confirmEmailUnsubscribe } from "@/server/services/broadcast";

export const dynamic = "force-dynamic";
export const metadata = { title: "Descadastro", robots: { index: false, follow: false } };

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await confirmEmailUnsubscribe(decodeURIComponent(token));
  const title =
    result.status === "ok"
      ? "Descadastramento confirmado"
      : result.status === "config"
        ? "Não foi possível concluir agora"
        : "Este link não é válido";
  const body =
    result.status === "ok"
      ? `O e-mail ${result.email} não receberá mais avisos desta lista.`
      : result.status === "config"
        ? "Tente abrir este link de novo em alguns minutos. Se o aviso continuar, use o contato publicado no site."
        : "O descadastro não pôde ser confirmado. Peça um novo link no próximo e-mail, ou fale pelo contato do site.";

  return (
    <PageShell>
      <article className="mx-auto grid max-w-2xl gap-4 px-4 py-12 leading-8">
        <p className="text-sm font-semibold text-wine">Lista de avisos</p>
        <h1 className="font-display text-4xl">{title}</h1>
        <div className="hairline" />
        <p className="text-lead text-muted">{body}</p>
        {result.status === "ok" ? (
          <p>Você pode voltar a receber estes avisos só se pedir isso de novo, no cadastro ou pelo contato.</p>
        ) : null}
        <p>
          <Link className="font-semibold text-wine hover:text-wine-deep" href="/">
            Voltar à página inicial
          </Link>
        </p>
      </article>
    </PageShell>
  );
}
