"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  ["Visão", "/admin"],
  ["Códigos", "/admin/codigos"],
  ["Astrologia", "/admin/astrologia"],
  ["Metodologia", "/admin/metodologia"],
  ["Prompts", "/admin/prompts"],
  ["Simulador", "/admin/simulador"],
  ["Leads", "/admin/leads"],
  ["Mapas", "/admin/mapas"],
  ["Pedidos", "/admin/pedidos"],
  ["Cupons", "/admin/cupons"],
  ["Relatórios", "/admin/relatorios"],
  ["Usuários", "/admin/usuarios"],
  ["Auditoria", "/admin/auditoria"],
  ["Configurações", "/admin/configuracoes"],
] as const;

export function isAdminNavActive(pathname: string, href: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  if (href === "/admin") return path === "/admin";
  return path === href || path.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mt-6 grid gap-1 text-sm" aria-label="Administração">
      {links.map(([label, href]) => {
        const active = isAdminNavActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded px-2 py-2",
              active ? "bg-wine text-white" : "hover:bg-white",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
