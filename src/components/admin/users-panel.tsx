"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Plus, X } from "lucide-react";
import { PANEL_ROLES, ROLE_LABEL, type AdminUserRow } from "@/features/admin/users";
import { formatDateTimePt } from "@/lib/formatters";
import { Input, Select } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import { createAdminUser, resendAdminAccess, updateAdminUser } from "@/server/actions/admin";

const STATUS_LABEL: Record<AdminUserRow["status"], string> = {
  active: "Ativo",
  pending: "Primeiro acesso",
  blocked: "Bloqueado",
};

export function UsersPanel({
  rows,
  canManage,
  canAssignSuper,
  currentUserId,
  initialId,
  creating,
}: {
  rows: AdminUserRow[];
  canManage: boolean;
  canAssignSuper: boolean;
  currentUserId: string | null;
  initialId?: string;
  creating?: boolean;
}) {
  const [openId, setOpenId] = useState(initialId ?? null);
  const [createOpen, setCreateOpen] = useState(Boolean(creating));
  const selected = rows.find((row) => row.id === openId) ?? null;

  useEffect(() => {
    setOpenId(initialId ?? null);
    setCreateOpen(Boolean(creating));
  }, [initialId, creating]);

  function syncUrl(next: { id?: string | null; novo?: boolean }) {
    const params = new URLSearchParams();
    if (next.novo) params.set("novo", "1");
    else if (next.id) params.set("editar", next.id);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/admin/usuarios?${qs}` : "/admin/usuarios");
  }

  function openUser(id: string) {
    setCreateOpen(false);
    setOpenId(id);
    syncUrl({ id });
  }

  function openCreate() {
    setOpenId(null);
    setCreateOpen(true);
    syncUrl({ novo: true });
  }

  function closeDrawer() {
    setOpenId(null);
    setCreateOpen(false);
    syncUrl({});
  }

  return (
    <>
      {canManage ? (
        <div className="mt-4">
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-wine px-4 text-sm text-white"
            onClick={openCreate}
          >
            <Plus className="size-4" strokeWidth={1.75} aria-hidden="true" />
            Novo usuário
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">Somente admin ou super admin cadastra usuários neste painel.</p>
      )}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-160 border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-12 py-2">
                <span className="sr-only">Abrir</span>
              </th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Status</th>
              <th>Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-border hover:bg-gold-soft/70"
                tabIndex={0}
                aria-label={`Abrir ${row.email}`}
                data-open={row.id === openId ? "true" : undefined}
                onClick={() => openUser(row.id)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openUser(row.id);
                  }
                }}
              >
                <td className="py-2">
                  <button
                    type="button"
                    className="grid size-10 place-items-center rounded-lg text-wine hover:bg-gold-soft"
                    aria-label={`Abrir ${row.email}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      openUser(row.id);
                    }}
                  >
                    <Pencil className="size-4" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </td>
                <td>{row.email}</td>
                <td>{ROLE_LABEL[row.role]}</td>
                <td>{STATUS_LABEL[row.status]}</td>
                <td>{row.createdAt ? formatDateTimePt(row.createdAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog.Root
        open={Boolean(selected) || createOpen}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
          {createOpen ? (
            <Dialog.Content className="admin-drawer fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-lg flex-col bg-surface shadow-[-16px_0_40px_rgba(36,29,34,0.08)]">
              <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
                <div>
                  <Dialog.Title className="font-display text-3xl">Novo usuário</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-muted">
                    A pessoa entra no painel com o e-mail e a senha definidos aqui.
                  </Dialog.Description>
                </div>
                <Dialog.Close className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-gold-soft hover:text-ink" aria-label="Fechar cadastro">
                  <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </Dialog.Close>
              </div>
              <form action={createAdminUser} className="grid gap-3 overflow-y-auto px-6 py-5">
                <label className="grid gap-1 text-sm">
                  E-mail
                  <Input type="email" name="email" required autoComplete="off" />
                </label>
                <label className="grid gap-1 text-sm">
                  Papel
                  <Select name="role" defaultValue="editor">
                    <RoleOptions allowSuper={canAssignSuper} />
                  </Select>
                </label>
                <label className="grid gap-1 text-sm">
                  Senha
                  <PasswordField name="password" placeholder="Mínimo de 8 caracteres" autoComplete="new-password" minLength={8} />
                </label>
                <label className="grid gap-1 text-sm">
                  Confirmar senha
                  <PasswordField name="confirm" placeholder="Repita a senha" autoComplete="new-password" minLength={8} />
                </label>
                <button className="min-h-11 rounded-xl bg-wine text-white" type="submit" disabled={!canManage}>
                  Cadastrar usuário
                </button>
              </form>
            </Dialog.Content>
          ) : selected ? (
            <Dialog.Content className="admin-drawer fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-lg flex-col bg-surface shadow-[-16px_0_40px_rgba(36,29,34,0.08)]">
              <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
                <div>
                  <Dialog.Title className="font-display text-3xl">{selected.email}</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm text-muted">
                    {STATUS_LABEL[selected.status]}
                    {selected.lastSignInAt ? ` · último acesso ${formatDateTimePt(selected.lastSignInAt)}` : " · ainda sem senha definida"}
                  </Dialog.Description>
                </div>
                <Dialog.Close className="grid size-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-gold-soft hover:text-ink" aria-label="Fechar usuário">
                  <X className="size-5" strokeWidth={1.75} aria-hidden="true" />
                </Dialog.Close>
              </div>
              <div className="grid gap-6 overflow-y-auto px-6 py-5">
                <dl className="grid gap-3 text-sm">
                  <div>
                    <dt className="text-muted">Cadastro</dt>
                    <dd className="mt-1">{selected.createdAt ? formatDateTimePt(selected.createdAt) : "—"}</dd>
                  </div>
                </dl>
                <form action={updateAdminUser.bind(null, selected.id)} className="grid gap-3">
                  <label className="grid gap-1 text-sm">
                    Papel
                    <Select name="role" defaultValue={selected.role} disabled={!canManage}>
                      <RoleOptions allowSuper={canAssignSuper || selected.role === "super_admin"} />
                    </Select>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input name="blocked" type="checkbox" defaultChecked={selected.status === "blocked"} disabled={!canManage || selected.id === currentUserId} />
                    Bloquear acesso ao painel
                  </label>
                  <button className="min-h-11 rounded-xl bg-wine text-white" type="submit" disabled={!canManage}>
                    Salvar
                  </button>
                </form>
                {canManage ? (
                  <form action={resendAdminAccess.bind(null, selected.id)}>
                    <button className="min-h-11 w-full rounded-xl border border-border" type="submit">
                      {selected.status === "pending" ? "Reenviar e-mail de primeiro acesso" : "Enviar e-mail para criar nova senha"}
                    </button>
                  </form>
                ) : null}
              </div>
            </Dialog.Content>
          ) : null}
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function RoleOptions({ allowSuper = true }: { allowSuper?: boolean }) {
  const roles = allowSuper ? PANEL_ROLES : PANEL_ROLES.filter((role) => role !== "super_admin");
  return (
    <>
      {roles.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABEL[role]}
        </option>
      ))}
    </>
  );
}
