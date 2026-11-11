import { describe, expect, it } from "vitest";
import { isAdminNavActive } from "@/components/admin/admin-nav";

describe("menu do admin", () => {
  it("marca só a home em /admin", () => {
    expect(isAdminNavActive("/admin", "/admin")).toBe(true);
    expect(isAdminNavActive("/admin/leads", "/admin")).toBe(false);
  });

  it("marca a seção e as rotas internas", () => {
    expect(isAdminNavActive("/admin/codigos", "/admin/codigos")).toBe(true);
    expect(isAdminNavActive("/admin/codigos/sol-1", "/admin/codigos")).toBe(true);
    expect(isAdminNavActive("/admin/pedidos", "/admin/codigos")).toBe(false);
  });
});
