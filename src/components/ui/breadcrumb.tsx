"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const labels: Record<string, string> = {
  admin: "Visão",
  codigos: "Códigos",
  astrologia: "Astrologia",
  metodologia: "Metodologia",
  simulador: "Simulador",
  leads: "Leads",
  mapas: "Mapas",
  pedidos: "Pedidos",
  relatorios: "Relatórios",
  usuarios: "Usuários",
  auditoria: "Auditoria",
  configuracoes: "Configurações",
  login: "Entrada",
};

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "admin") return null;
  const crumbs = parts.map((part, index) => {
    const href = `/${parts.slice(0, index + 1).join("/")}`;
    const label = labels[part] ?? "Registro";
    const current = index === parts.length - 1;
    return { href, label, current };
  });
  return (
    <nav aria-label="Trilha" className="mb-4 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-2">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {crumb.current ? (
              <span aria-current="page" className="text-ink">
                {crumb.label}
              </span>
            ) : (
              <Link href={crumb.href} className="hover:text-ink">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
