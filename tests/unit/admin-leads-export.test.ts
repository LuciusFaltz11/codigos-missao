import { describe, expect, it } from "vitest";
import {
  csvCell,
  emailsForExport,
  filterAdminLeads,
  leadsEmailsCsv,
  leadsSpreadsheetCsv,
  parseLeadFilter,
  uniqueLeadsByEmail,
  type AdminLead,
} from "@/features/admin/leads";

function lead(partial: Partial<AdminLead> & Pick<AdminLead, "id" | "email">): AdminLead {
  return {
    name: "Lead",
    marketingOptIn: false,
    converted: false,
    createdAt: "2026-11-19T12:00:00.000Z",
    privacyAccepted: true,
    policyVersion: "1",
    birth: null,
    charts: [],
    ...partial,
  };
}

describe("leads do admin", () => {
  it("lê o filtro da URL em português", () => {
    expect(parseLeadFilter("sem-conversao")).toBe("unconverted");
    expect(parseLeadFilter("sem-repeticao")).toBe("unique");
    expect(parseLeadFilter("todos")).toBe("all");
  });

  it("filtra quem não comprou e remove e-mails repetidos pelo cadastro mais recente", () => {
    const rows = [
      lead({ id: "1", email: "ana@example.com", converted: true, createdAt: "2026-11-19T12:00:00.000Z" }),
      lead({ id: "2", email: "ANA@example.com", converted: false, createdAt: "2026-11-18T12:00:00.000Z" }),
      lead({ id: "3", email: "bia@example.com", converted: false, createdAt: "2026-11-17T12:00:00.000Z" }),
    ];
    expect(filterAdminLeads(rows, "unconverted").map((item) => item.id)).toEqual(["2", "3"]);
    expect(uniqueLeadsByEmail(rows).map((item) => item.id)).toEqual(["1", "3"]);
  });

  it("exporta e-mails de todos, sem conversão e sem repetição", () => {
    const rows = [
      lead({ id: "1", email: " ana@example.com ", converted: true }),
      lead({ id: "2", email: "ANA@example.com", converted: false }),
      lead({ id: "3", email: "bia@example.com", converted: false }),
    ];
    expect(emailsForExport(rows, "all")).toEqual(["ana@example.com", "ANA@example.com", "bia@example.com"]);
    expect(emailsForExport(rows, "unconverted")).toEqual(["ANA@example.com", "bia@example.com"]);
    expect(emailsForExport(rows, "unique")).toEqual(["ana@example.com", "bia@example.com"]);
  });

  it("monta CSV com aspas e BOM para a planilha", () => {
    expect(csvCell('Ana, "a"')).toBe('"Ana, ""a"""');
    const csv = leadsSpreadsheetCsv([
      lead({
        id: "1",
        name: "Ana Silva",
        email: "ana@example.com",
        converted: true,
        birth: { date: "1990-01-02", time: "10:15", city: "Porto Alegre", country: "BR", timezone: "America/Sao_Paulo" },
      }),
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Nome,E-mail,Cadastro,Comprou");
    expect(csv).toContain("Ana Silva,ana@example.com");
    expect(csv).toContain("sim");
    expect(leadsEmailsCsv(["ana@example.com"])).toContain("E-mail");
    expect(leadsEmailsCsv(["ana@example.com"])).toContain("ana@example.com");
  });
});
