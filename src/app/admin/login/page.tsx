import { PasswordField } from "@/components/ui/password-field";
import { Input } from "@/components/ui/input";
import { signIn } from "@/server/actions/admin";
import { integrationStatus } from "@/server/env";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; email?: string }>;
}) {
  const params = await searchParams;
  const configured = integrationStatus().supabase === "configured";
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-content-center gap-4 px-4">
      <h1 className="font-display text-4xl">Entrar no admin</h1>
      {!configured ? <p className="text-sm">Supabase Auth não está configurado. Nenhuma sessão administrativa foi criada.</p> : null}
      <form action={signIn} className="grid gap-3">
        <Input
          name="email"
          type="email"
          required
          placeholder="E-mail"
          defaultValue={params.email ?? ""}
          autoComplete="username"
        />
        <PasswordField name="password" placeholder="Senha" autoComplete="current-password" />
        <button className="min-h-11 rounded-xl bg-wine text-white" type="submit" disabled={!configured}>
          Entrar
        </button>
      </form>
      <p className="text-sm text-muted">
        <a className="underline" href="/admin/primeiro-acesso">
          Primeiro acesso
        </a>
        : use o link do e-mail de convite para criar sua senha.
      </p>
    </main>
  );
}
