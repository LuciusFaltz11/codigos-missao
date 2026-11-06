import { describe, expect, it } from "vitest";
import { normalizeEnvValue } from "@/server/env";

describe("variáveis de ambiente", () => {
  it("remove aspas que o painel da Vercel preserva e o Next local descarta", () => {
    expect(normalizeEnvValue('"leitura@valwilges.com.br"')).toBe("leitura@valwilges.com.br");
    expect(normalizeEnvValue("'leitura@valwilges.com.br'")).toBe("leitura@valwilges.com.br");
    expect(normalizeEnvValue("  leitura@valwilges.com.br  ")).toBe("leitura@valwilges.com.br");
    expect(normalizeEnvValue('""')).toBeUndefined();
    expect(normalizeEnvValue(undefined)).toBeUndefined();
  });
});
