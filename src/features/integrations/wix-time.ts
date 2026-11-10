export type DayPeriod = "AM" | "PM";

export function twelveHourToBirthTime(hour: string, minute: string, period: string) {
  if (!/^\d{1,2}$/.test(hour) || !/^\d{2}$/.test(minute)) return null;
  if (period !== "AM" && period !== "PM") return null;
  const hourNumber = Number(hour);
  const minuteNumber = Number(minute);
  if (hourNumber < 1 || hourNumber > 12 || minuteNumber > 59) return null;
  const hour24 = period === "AM" ? (hourNumber === 12 ? 0 : hourNumber) : hourNumber === 12 ? 12 : hourNumber + 12;
  return `${String(hour24).padStart(2, "0")}:${String(minuteNumber).padStart(2, "0")}`;
}

export const twelveHourHours = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
