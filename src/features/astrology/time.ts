import { DateTime, IANAZone } from "luxon";

export type TimeOption = {
  offsetMinutes: number;
  utcIso: string;
  label: string;
};

export type TimeResolution =
  | { status: "unique"; utcIso: string; offsetMinutes: number; label: string }
  | { status: "ambiguous"; message: string; options: TimeOption[] }
  | { status: "nonexistent"; message: string }
  | { status: "invalid_zone"; message: string }
  | { status: "invalid_date"; message: string };

function offsetLabel(offsetMinutes: number) {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");
  return `UTC${sign}${hours}:${minutes}`;
}

function parseParts(date: string, time: string) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour > 23 || minute > 59) return null;
  const probe = DateTime.fromObject({ year, month, day }, { zone: "utc" });
  if (!probe.isValid || probe.year !== year || probe.month !== month || probe.day !== day) {
    return null;
  }
  return { year, month, day, hour, minute };
}

/**
 * Converte data e hora locais para UTC usando as regras históricas do identificador IANA.
 * Horários ambíguos (fim do horário de verão) exigem escolha explícita.
 * Horários inexistentes (início do horário de verão) não são deslocados em silêncio.
 */
export function resolveLocalDateTime(input: {
  date: string;
  time: string;
  iana: string;
  offsetChoice?: number;
}): TimeResolution {
  const zone = IANAZone.create(input.iana);
  if (!zone.isValid) {
    return { status: "invalid_zone", message: "O fuso informado não é um identificador IANA válido." };
  }
  const parts = parseParts(input.date, input.time);
  if (!parts) {
    return { status: "invalid_date", message: "Data ou hora inválida." };
  }

  const wallAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
  const found = new Map<number, number>();
  for (let deltaMinutes = -16 * 60; deltaMinutes <= 16 * 60; deltaMinutes += 15) {
    const probe = wallAsUtc + deltaMinutes * 60_000;
    const offset = zone.offset(probe);
    const utc = wallAsUtc - offset * 60_000;
    if (zone.offset(utc) === offset) found.set(utc, offset);
  }

  const options = [...found.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([utc, offsetMinutes]) => ({
      offsetMinutes,
      utcIso: new Date(utc).toISOString(),
      label: offsetLabel(offsetMinutes),
    }));

  if (options.length === 0) {
    return {
      status: "nonexistent",
      message:
        "Esse horário local não existiu nesse fuso, em geral porque os relógios avançaram no início do horário de verão. Informe outro horário.",
    };
  }

  if (options.length === 1) {
    const only = options[0]!;
    return { status: "unique", utcIso: only.utcIso, offsetMinutes: only.offsetMinutes, label: only.label };
  }

  if (input.offsetChoice !== undefined) {
    const chosen = options.find((option) => option.offsetMinutes === input.offsetChoice);
    if (!chosen) {
      return {
        status: "ambiguous",
        message: "A escolha de fuso não corresponde a uma das ocorrências desse horário.",
        options,
      };
    }
    return {
      status: "unique",
      utcIso: chosen.utcIso,
      offsetMinutes: chosen.offsetMinutes,
      label: chosen.label,
    };
  }

  return {
    status: "ambiguous",
    message:
      "Esse horário local ocorreu mais de uma vez por causa da mudança de horário de verão. Escolha qual ocorrência usar.",
    options,
  };
}
