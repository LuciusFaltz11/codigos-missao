import { PasswordField } from "@/components/ui/password-field";
import { completeFirstAccess } from "@/server/actions/admin";
import { integrationStatus } from "@/server/env";

export const dynamic = "force-dynamic";

export default async function FirstAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const configured = integrationStatus().supabase === "configured";
  const tokenHash = params.token_hash?.trim() ?? "";
  const type = params.type === "recovery" ? "recovery" : "invite";
  const ready = configured && tokenHash.length > 0;
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-content-center gap-4 px-4">
      <h1 className="font-display text-4xl">Primeiro acesso</h1>
      {!configured ? <p className="text-sm">O acesso administrativo ainda não está configurado.</p> : null}
      {configured && !tokenHash ? (
        <p className="text-sm text-muted">
          Abra o link enviado ao seu e-mail para criar a senha. A tela de entrada continua em{" "}
          <a className="underline" href="/admin/login">
            Entrar no admin
          </a>
          .
        </p>
      ) : null}
      {ready ? (
        <form action={completeFirstAccess} className="grid gap-3">
          <input type="hidden" name="tokenHash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <PasswordField name="password" placeholder="Nova senha" autoComplete="new-password" minLength={8} />
          <PasswordField name="confirm" placeholder="Confirmar senha" autoComplete="new-password" minLength={8} />
          <button className="min-h-11 rounded-xl bg-wine text-white" type="submit">
            Criar senha e entrar
          </button>
        </form>
      ) : null}
    </main>
  );
}
