export async function verifyTurnstileToken(input: {
  token: string;
  secret: string;
  ip?: string;
  fetchImpl?: typeof fetch;
}) {
  const body = new URLSearchParams({ secret: input.secret, response: input.token });
  if (input.ip && input.ip !== "unknown") body.set("remoteip", input.ip);
  const request = input.fetchImpl ?? fetch;
  const response = await request("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) return false;
  const payload = (await response.json().catch(() => null)) as { success?: boolean } | null;
  return payload?.success === true;
}
