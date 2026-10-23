import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadLocalEnv() {
  const file = resolve(process.cwd(), ".env");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

async function main() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 22) {
    console.error(`Use Node 22 (nvm use). Esta sessão está em ${process.versions.node}.`);
    process.exit(1);
  }
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!url || !key || !email || !password) {
    console.error("Defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL e ADMIN_PASSWORD.");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const created = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) {
    console.error("Não foi possível criar o usuário.");
    process.exit(1);
  }

  const profile = await supabase.from("admin_profiles").insert({
    id: created.data.user.id,
    email,
    role: "super_admin",
  });
  if (profile.error) {
    console.error("Usuário criado, mas o perfil não foi gravado.");
    process.exit(1);
  }

  console.log("Super admin criado.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Não foi possível criar o super admin.");
  process.exit(1);
});
