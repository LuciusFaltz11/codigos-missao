import { AdminPanel, Empty } from "@/components/admin/shell";
import { ImmediateFlash } from "@/components/ui/flash-toast";
import { TextArea } from "@/components/ui/input";
import { PROMPT_VERSION } from "@/features/interpretation/prompts";
import { pickLivePrompts } from "@/features/interpretation/prompt-store";
import { resolveFlash } from "@/lib/flash";
import { saveInterpretationPrompt } from "@/server/actions/admin";
import { roleHas } from "@/server/auth/rbac";
import { getAdminSession } from "@/server/auth/session";
import { tryServiceClient } from "@/server/db/clients";

export const dynamic = "force-dynamic";

export default async function InterpretationPromptsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; salvo?: string }>;
}) {
  const query = await searchParams;
  const flashParams = new URLSearchParams();
  if (query.erro) flashParams.set("erro", query.erro);
  if (query.salvo) flashParams.set("salvo", query.salvo);
  const flash = resolveFlash("/admin/prompts", flashParams);
  const session = await getAdminSession();
  const canWrite = session ? roleHas(session.role, "content.write") : false;
  const service = tryServiceClient();
  const stored = service
    ? await service.from("interpretation_prompts").select("kind,version,body,status,created_at").order("created_at", { ascending: false })
    : null;
  const live = pickLivePrompts(
    (stored?.data ?? []).map((row) => ({
      kind: String(row.kind),
      version: String(row.version),
      body: String(row.body ?? ""),
      status: String(row.status),
      created_at: row.created_at ? String(row.created_at) : undefined,
    })),
  );
  const fromDatabase = (stored?.data ?? []).some(
    (row) => row.status === "published" && String(row.body ?? "").trim(),
  );
  return (
    <AdminPanel>
      <ImmediateFlash flash={flash} />
      <h1 className="font-display text-4xl">Prompts da leitura</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Estes textos são o system prompt enviado ao modelo na leitura paga: um para cada lote de Códigos e outro para a síntese.
        O JSON de saída e os IDs das ativações continuam validados no servidor. Não peça diagnóstico, destino ou eventos.
        Versão atual: {live.version || PROMPT_VERSION}.
      </p>
      {!service ? <div className="mt-6"><Empty>Configure o banco para editar os prompts.</Empty></div> : null}
      {service && !fromDatabase ? (
        <p className="mt-4 max-w-3xl text-sm text-muted">
          Ainda não há prompt no banco. O texto abaixo é o padrão do sistema; ao salvar, ele passa a valer nas próximas leituras.
        </p>
      ) : null}
      <div className="mt-8 grid gap-8">
        <form action={saveInterpretationPrompt} className="grid gap-3 rounded-2xl bg-surface p-4">
          <input type="hidden" name="kind" value="individual" />
          <h2 className="font-display text-2xl">Prompt das ativações</h2>
          <p className="text-sm text-muted">
            Enviado para cada lote de pontos. Precisa pedir JSON com headline, interpretation, light_expression, shadow_expression e reflective_question.
          </p>
          <TextArea
            name="body"
            className="min-h-[28rem] font-mono text-sm leading-6"
            defaultValue={live.individual}
            required
          />
          <button className="justify-self-start rounded-xl bg-wine px-4 py-2 text-sm text-white" type="submit" disabled={!canWrite || !service}>
            Salvar prompt das ativações
          </button>
        </form>
        <form action={saveInterpretationPrompt} className="grid gap-3 rounded-2xl bg-surface p-4">
          <input type="hidden" name="kind" value="synthesis" />
          <h2 className="font-display text-2xl">Prompt da síntese</h2>
          <p className="text-sm text-muted">
            Enviado depois das leituras individuais. Precisa pedir JSON com patterns, overall_synthesis, closing_reflection e reflective_questions.
          </p>
          <TextArea
            name="body"
            className="min-h-[22rem] font-mono text-sm leading-6"
            defaultValue={live.synthesis}
            required
          />
          <button className="justify-self-start rounded-xl bg-wine px-4 py-2 text-sm text-white" type="submit" disabled={!canWrite || !service}>
            Salvar prompt da síntese
          </button>
        </form>
      </div>
    </AdminPanel>
  );
}
