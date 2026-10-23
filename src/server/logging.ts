const SENSITIVE_KEY = /email|name|token|secret|password|authorization|birth|latitude|longitude|phone/i;

export function logEvent(
  level: "info" | "error",
  event: string,
  fields: Record<string, string | number | boolean | null> = {},
) {
  const safe: Record<string, string | number | boolean | null> = { level, event };
  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE_KEY.test(key)) continue;
    safe[key] = value;
  }
  const line = JSON.stringify(safe);
  if (level === "error") console.error(line);
  else console.info(line);
}
