"use client";

import { useFormStatus } from "react-dom";
import { DEFAULT_BROADCAST_SUBJECT, MAX_BROADCAST_RECIPIENTS } from "@/features/admin/broadcast";
import { Field, Input, TextArea } from "@/components/ui/input";
import { sendBroadcast } from "@/server/actions/admin";

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      className="min-h-11 rounded-xl bg-wine px-5 text-sm font-semibold text-white disabled:opacity-50"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "Enviando…" : "Enviar agora"}
    </button>
  );
}

export function BroadcastPanel({
  canSend,
  emailReady,
  defaultHtml,
}: {
  canSend: boolean;
  emailReady: boolean;
  defaultHtml: string;
}) {
  const blocked = !canSend || !emailReady;
  return (
    <form action={sendBroadcast} className="mt-8 grid max-w-4xl gap-5 rounded-3xl border border-border bg-surface p-6">
      <Field
        label="Destinatários"
        hint={`Um e-mail por linha, ou separados por vírgula. No máximo ${MAX_BROADCAST_RECIPIENTS} por envio. Quem já se descadastrou é ignorado.`}
      >
        <TextArea
          name="recipients"
          required
          rows={8}
          spellCheck={false}
          autoComplete="off"
          placeholder={"nome@email.com\noutra@email.com"}
          className="min-h-40 font-mono text-sm"
        />
      </Field>
      <Field label="Assunto">
        <Input name="subject" required maxLength={200} defaultValue={DEFAULT_BROADCAST_SUBJECT} />
      </Field>
      <Field
        label="Corpo em HTML"
        hint="O modelo da campanha já vem preenchido. O rodapé de descadastro é acrescentado em cada envio, com um link exclusivo por destinatário."
      >
        <TextArea
          name="html"
          required
          rows={22}
          spellCheck={false}
          defaultValue={defaultHtml}
          className="min-h-[28rem] font-mono text-xs leading-5"
        />
      </Field>
      {!canSend ? <p className="text-sm text-danger">Seu papel não envia esta campanha.</p> : null}
      {canSend && !emailReady ? (
        <p className="text-sm text-danger">Configure RESEND_API_KEY e EMAIL_FROM para enviar por aqui.</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Submit disabled={blocked} />
        <button
          className="min-h-11 rounded-xl border border-border px-4 text-sm text-ink"
          type="reset"
        >
          Restaurar campos
        </button>
      </div>
    </form>
  );
}
