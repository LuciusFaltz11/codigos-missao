const currentYear = new Date().getFullYear();

export const birthYears = Array.from({ length: currentYear - 1900 + 1 }, (_, index) => String(currentYear - index));
export const birthHours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
export const birthMinutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

export const birthMonths = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function daysInMonth(year: string, month: string) {
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  if (!year || !month || monthNumber < 1 || monthNumber > 12) return 31;
  return new Date(Date.UTC(yearNumber, monthNumber, 0)).getUTCDate();
}

export function composeBirthDate(year: string, month: string, day: string, today = new Date()) {
  if (!year || !month || !day) return { ok: false as const, reason: "incomplete" as const };
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const dayNumber = Number(day);
  const chosen = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));
  const exists =
    chosen.getUTCFullYear() === yearNumber &&
    chosen.getUTCMonth() + 1 === monthNumber &&
    chosen.getUTCDate() === dayNumber;
  if (!exists) return { ok: false as const, reason: "invalid" as const };
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  if (chosen.getTime() > todayUtc) return { ok: false as const, reason: "future" as const };
  return { ok: true as const, value: `${year}-${month}-${String(dayNumber).padStart(2, "0")}` };
}

export function composeBirthTime(hour: string, minute: string) {
  if (!/^\d{2}$/.test(hour) || !/^\d{2}$/.test(minute)) return null;
  if (Number(hour) > 23 || Number(minute) > 59) return null;
  return `${hour}:${minute}`;
}
