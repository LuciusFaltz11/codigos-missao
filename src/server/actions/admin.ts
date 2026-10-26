"use server";

import { redirect } from "next/navigation";
import { DEFAULT_ACTIVATION_POINTS, PROVISIONAL_ASTROLOGY_NOTICE } from "@/lib/constants/astrology";
import { adminUserCreateSchema, adminUserUpdateSchema, codeUpdate, couponSchema, firstAccessSchema, glossaryUpdateSchema, methodologyDraftSchema, priceUpdateSchema } from "@/lib/schemas/forms";
import { normalizeCouponCode } from "@/features/checkout/coupons";
import { isAdminRole } from "@/server/auth/rbac";
import { getAdminSession, requirePermission } from "@/server/auth/session";
import { tryServiceClient, trySessionClient } from "@/server/db/clients";
import { countActiveSuperAdmins, sendAdminAccessEmail } from "@/server/services/admin-users";
import { CARD_ART_BUCKET, isStoredCardArtPath, readCardArtUpload } from "@/features/missions/card-art";
import { officialCatalog, type MissionCode } from "@/features/missions/catalog";
import { inspectCatalog } from "@/features/missions/integrity";
import { activatePositions } from "@/features/missions/activate";
import type { MethodologySnapshot } from "@/features/interpretation/context";
import { adoptPublishedSnapshot } from "@/features/methodology/snapshot";

function loginRedirect(code: string, email?: string): never {
  const params = new URLSearchParams({ erro: code });
  if (email) params.set("email", email);
  redirect(`/admin/login?${params.toString()}`);
}

export async function signIn(formData: FormData) {
  const client = await trySessionClient();
  if (!client) loginRedirect("config");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email.includes("@")) loginRedirect("email_invalido", email);
  const service = tryServiceClient();
  if (!service) loginRedirect("config", email);
  const profile = await service.from("admin_profiles").select("id,role").eq("email", email).maybeSingle();
  if (!profile.data?.id || !isAdminRole(String(profile.data.role))) loginRedirect("nao_cadastrado", email);
  const authUser = await service.auth.admin.getUserById(String(profile.data.id));
  const bannedUntil = authUser.data.user?.banned_until;
  if (bannedUntil && Date.parse(String(bannedUntil)) > Date.now()) loginRedirect("bloqueado", email);
  if (!authUser.data.user?.last_sign_in_at) loginRedirect("primeiro", email);
  const { error, data } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) loginRedirect("senha", email);
  redirect("/admin");
}

export async function signOut() {
  const client = await trySessionClient();
  await client?.auth.signOut();
  redirect("/admin/login");
}

async function audit(actorId: string, action: string, entity: string, entityId: string) {
  const service = tryServiceClient();
  await service?.from("audit_logs").insert({ actor_id: actorId, action, entity, entity_id: entityId, metadata: {} });
}

export async function updateCode(id: string, formData: FormData) {
  const auth = await requirePermission("content.write");
  if (!auth.ok) redirect("/admin/login");
  const service = tryServiceClient();
  if (!service) redirect("/admin/codigos?erro=config");
  const parsed = codeUpdate.safeParse({
    archetype: formData.get("archetype"),
    keyword: formData.get("keyword"),
    decanRuler: formData.get("decanRuler"),
    light: formData.get("light"),
    shadow: formData.get("shadow"),
    essentialOil: String(formData.get("essentialOil") ?? "").trim() || null,
    tarotMirrorCard: String(formData.get("tarotMirrorCard") ?? "").trim() || null,
  });
  if (!parsed.success) redirect(`/admin/codigos?editar=${id}&erro=1`);
  const current = await service.from("mission_codes").select("image_url").eq("id", id).maybeSingle();
  if (!current.data) redirect(`/admin/codigos?editar=${id}&erro=1`);
  const previous = typeof current.data.image_url === "string" ? current.data.image_url : null;
  const uploaded = await readCardArtUpload(formData.get("image"));
  if (!uploaded.ok) redirect(`/admin/codigos?editar=${id}&erro=imagem`);
  let imageUrl = previous;
  const remove = formData.get("removeImage") === "on" && uploaded.empty;
  if (remove) {
    if (previous && isStoredCardArtPath(previous)) {
      await service.storage.from(CARD_ART_BUCKET).remove([previous]);
    }
    imageUrl = null;
  } else if (!uploaded.empty) {
    const path = `${id}.${uploaded.ext}`;
    const stored = await service.storage.from(CARD_ART_BUCKET).upload(path, uploaded.bytes, {
      contentType: uploaded.contentType,
      upsert: true,
    });
    if (stored.error) redirect(`/admin/codigos?editar=${id}&erro=upload`);
    if (previous && previous !== path && isStoredCardArtPath(previous)) {
      await service.storage.from(CARD_ART_BUCKET).remove([previous]);
    }
    imageUrl = path;
  }
  const { error } = await service
    .from("mission_codes")
    .update({
      archetype: parsed.data.archetype,
      keyword: parsed.data.keyword,
      decan_ruler: parsed.data.decanRuler,
      light: parsed.data.light,
      shadow: parsed.data.shadow,
      essential_oil: parsed.data.essentialOil,
      tarot_mirror_card: parsed.data.tarotMirrorCard,
      image_url: imageUrl,
    })
    .eq("id", id);
  if (error) redirect(`/admin/codigos?editar=${id}&erro=1`);
  await audit(auth.admin.userId, "code_updated", "mission_codes", id);
  redirect(`/admin/codigos?editar=${id}&salvo=1`);
}

export async function updateGlossary(kind: "house" | "point", id: string, formData: FormData) {
  const auth = await requirePermission("content.write");
  if (!auth.ok) redirect("/admin/login");
  const service = tryServiceClient();
  if (!service) redirect("/admin/astrologia?erro=config");
  const parsed = glossaryUpdateSchema.safeParse({ title: formData.get("title"), summary: formData.get("summary") });
  if (!parsed.success) redirect("/admin/astrologia?erro=1");
  if (kind === "house") {
    await service.from("house_meanings").update({ title: parsed.data.title, summary: parsed.data.summary }).eq("house_number", Number(id));
  } else {
    await service.from("point_meanings").update({ name: parsed.data.title, summary: parsed.data.summary }).eq("id", id);
  }
  await audit(auth.admin.userId, "glossary_updated", kind, id);
  redirect("/admin/astrologia?salvo=1");
}

export async function saveMethodologyDraft(formData: FormData) {
  const auth = await requirePermission("content.write");
  if (!auth.ok) redirect(auth.status === 401 ? "/admin/login" : "/admin/metodologia?erro=permissao");
  const service = tryServiceClient();
  if (!service) redirect("/admin/metodologia?erro=config");
  const parsed = methodologyDraftSchema.safeParse({
    zodiac: formData.get("zodiac"),
    houseSystem: formData.get("houseSystem"),
    nodeMode: formData.get("nodeMode"),
    fortunaRule: formData.get("fortunaRule"),
    activateAscendant: formData.get("activateAscendant") === "on",
    freePreviewPoint: formData.get("freePreviewPoint"),
    rulesValidated: formData.get("rulesValidated") === "on",
  });
  if (!parsed.success) redirect("/admin/metodologia?erro=salvar");
  const fields = {
    zodiac: parsed.data.zodiac,
    house_system: parsed.data.houseSystem,
    node_mode: parsed.data.nodeMode,
    fortuna_rule: parsed.data.fortunaRule,
    activate_ascendant: parsed.data.activateAscendant,
    free_preview_point: parsed.data.freePreviewPoint,
    rules_validated: parsed.data.rulesValidated,
  };
  const draft = await service.from("methodology_versions").select("id").eq("status", "draft").maybeSingle();
  if (draft.data) {
    const updated = await service.from("methodology_versions").update(fields).eq("id", draft.data.id);
    if (updated.error) redirect("/admin/metodologia?erro=salvar");
  } else {
    const inserted = await service.from("methodology_versions").insert({
      ...fields,
      label: "rascunho",
      status: "draft",
      activation_points: [...DEFAULT_ACTIVATION_POINTS],
      rules_note: PROVISIONAL_ASTROLOGY_NOTICE,
    });
    if (inserted.error) redirect("/admin/metodologia?erro=salvar");
  }
  await audit(auth.admin.userId, "methodology_draft_saved", "methodology_versions", "draft");
  redirect("/admin/metodologia?salvo=1");
}

export async function publishMethodology(formData: FormData) {
  const auth = await requirePermission("methodology.publish");
  if (!auth.ok) redirect("/admin/metodologia?erro=permissao");
  const service = tryServiceClient();
  if (!service) redirect("/admin/metodologia?erro=config");
  const publishGlossary = formData.get("publishGlossary") === "on";
  const draft = await service.from("methodology_versions").select("*").eq("status", "draft").maybeSingle();
  const codes = await service.from("mission_codes").select("*").order("number");
  const houses = await service.from("house_meanings").select("*").order("house_number");
  const points = await service.from("point_meanings").select("*");
  if (!draft.data) redirect("/admin/metodologia?erro=rascunho");
  if ((codes.data ?? []).length !== 36) redirect("/admin/metodologia?erro=catalogo");
  const mapped: MissionCode[] = (codes.data ?? []).map((row) => ({
    id: String(row.id),
    number: Number(row.number),
    signName: String(row.sign_name),
    signSlug: String(row.sign_slug),
    decan: Number(row.decan) as 1 | 2 | 3,
    startDegreeInclusive: Number(row.start_degree),
    endDegreeExclusive: Number(row.end_degree),
    archetype: String(row.archetype),
    keyword: String(row.keyword),
    decanRuler: String(row.decan_ruler),
    light: String(row.light),
    shadow: String(row.shadow),
    essentialOil: (row.essential_oil as string | null) ?? null,
    tarotMirrorCard: (row.tarot_mirror_card as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    sourcePage: Number(row.source_page),
  }));
  if (inspectCatalog(mapped).length > 0) redirect("/admin/metodologia?erro=catalogo");
  if (publishGlossary) {
    await service.from("house_meanings").update({ published: true }).not("summary", "eq", "");
    await service.from("point_meanings").update({ published: true }).not("summary", "eq", "");
  }
  const snapshot: MethodologySnapshot = {
    versionLabel: String(formData.get("label") || `published-${Date.now()}`),
    status: "published",
    rulesValidated: Boolean(draft.data.rules_validated),
    zodiac: draft.data.zodiac,
    houseSystem: draft.data.house_system,
    nodeMode: draft.data.node_mode,
    fortunaRule: draft.data.fortuna_rule,
    activateAscendant: Boolean(draft.data.activate_ascendant),
    freePreviewPoint: String(draft.data.free_preview_point),
    activationPoints: (draft.data.activation_points as string[]) ?? [...DEFAULT_ACTIVATION_POINTS],
    codes: mapped,
    houses: (houses.data ?? []).map((house) => ({
      id: String(house.house_number),
      title: String(house.title),
      summary: String(house.summary),
      published: publishGlossary,
    })),
    points: (points.data ?? []).map((point) => ({
      id: String(point.id),
      title: String(point.name),
      summary: String(point.summary),
      published: publishGlossary,
    })),
    notice: draft.data.rules_validated ? "" : PROVISIONAL_ASTROLOGY_NOTICE,
  };
  const inserted = await service.from("methodology_versions").insert({
    label: snapshot.versionLabel,
    status: "published",
    zodiac: snapshot.zodiac,
    house_system: snapshot.houseSystem,
    node_mode: snapshot.nodeMode,
    fortuna_rule: snapshot.fortunaRule,
    activate_ascendant: snapshot.activateAscendant,
    free_preview_point: snapshot.freePreviewPoint,
    activation_points: snapshot.activationPoints,
    rules_validated: snapshot.rulesValidated,
    rules_note: snapshot.notice || "Regras marcadas como homologadas nesta publicação.",
    snapshot,
    published_at: new Date().toISOString(),
    published_by: auth.admin.userId,
  });
  if (inserted.error) redirect("/admin/metodologia?erro=1");
  const unpaid = await service.from("natal_charts").select("id,status,methodology_snapshot");
  const entitled = await service.from("entitlements").select("chart_id");
  const entitledIds = new Set((entitled.data ?? []).map((row) => String(row.chart_id)));
  for (const chart of unpaid.data ?? []) {
    if (entitledIds.has(String(chart.id))) continue;
    const frozen = chart.methodology_snapshot as MethodologySnapshot;
    const next = adoptPublishedSnapshot(frozen, snapshot, {
      chartComplete: String(chart.status) === "complete",
      hasEntitlement: false,
    });
    if (next !== frozen) {
      await service.from("natal_charts").update({ methodology_snapshot: next }).eq("id", chart.id);
    }
  }
  await audit(auth.admin.userId, "methodology_published", "methodology_versions", snapshot.versionLabel);
  redirect("/admin/metodologia?publicado=1");
}

export async function updatePrice(formData: FormData) {
  const auth = await requirePermission("settings.write");
  if (!auth.ok) redirect("/admin/configuracoes?erro=permissao");
  const service = tryServiceClient();
  if (!service) redirect("/admin/configuracoes?erro=config");
  const reais = String(formData.get("price") ?? "").replace(",", ".");
  const parsed = priceUpdateSchema.safeParse({
    priceCents: Math.round(Number(reais) * 100),
    active: formData.get("active") === "on",
  });
  if (!parsed.success) redirect("/admin/configuracoes?erro=1");
  await service
    .from("products")
    .update({ price_cents: parsed.data.priceCents, active: parsed.data.active })
    .eq("slug", "leitura-completa");
  await audit(auth.admin.userId, "price_updated", "products", "leitura-completa");
  redirect("/admin/configuracoes?salvo=1");
}

function parseCouponForm(formData: FormData) {
  const kind = formData.get("kind") === "fixed" ? "fixed" : "percent";
  const percentRaw = String(formData.get("percent") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").replace(",", ".");
  return couponSchema.safeParse({
    name: formData.get("name"),
    code: normalizeCouponCode(String(formData.get("code") ?? "")),
    kind,
    percent: kind === "percent" && percentRaw ? Number(percentRaw) : null,
    amountCents: kind === "fixed" && amountRaw ? Math.round(Number(amountRaw) * 100) : null,
    active: formData.get("active") === "on",
  });
}

export async function createCoupon(formData: FormData) {
  const auth = await requirePermission("settings.write");
  if (!auth.ok) redirect("/admin/cupons?erro=permissao");
  const service = tryServiceClient();
  if (!service) redirect("/admin/cupons?erro=config");
  const parsed = parseCouponForm(formData);
  if (!parsed.success) redirect("/admin/cupons?novo=1&erro=1");
  const existing = await service.from("coupons").select("id").eq("code", parsed.data.code).maybeSingle();
  if (existing.data) redirect("/admin/cupons?novo=1&erro=existe");
  const inserted = await service
    .from("coupons")
    .insert({
      name: parsed.data.name,
      code: parsed.data.code,
      kind: parsed.data.kind,
      percent: parsed.data.kind === "percent" ? parsed.data.percent : null,
      amount_cents: parsed.data.kind === "fixed" ? parsed.data.amountCents : null,
      active: parsed.data.active,
    })
    .select("id")
    .maybeSingle();
  if (!inserted.data) redirect("/admin/cupons?novo=1&erro=1");
  await audit(auth.admin.userId, "coupon_created", "coupons", String(inserted.data.id));
  redirect("/admin/cupons?salvo=1");
}

export async function updateCoupon(id: string, formData: FormData) {
  const auth = await requirePermission("settings.write");
  if (!auth.ok) redirect(`/admin/cupons?editar=${id}&erro=permissao`);
  const service = tryServiceClient();
  if (!service) redirect(`/admin/cupons?editar=${id}&erro=config`);
  const parsed = parseCouponForm(formData);
  if (!parsed.success) redirect(`/admin/cupons?editar=${id}&erro=1`);
  const clash = await service.from("coupons").select("id").eq("code", parsed.data.code).neq("id", id).maybeSingle();
  if (clash.data) redirect(`/admin/cupons?editar=${id}&erro=existe`);
  const updated = await service
    .from("coupons")
    .update({
      name: parsed.data.name,
      code: parsed.data.code,
      kind: parsed.data.kind,
      percent: parsed.data.kind === "percent" ? parsed.data.percent : null,
      amount_cents: parsed.data.kind === "fixed" ? parsed.data.amountCents : null,
      active: parsed.data.active,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (!updated.data) redirect(`/admin/cupons?editar=${id}&erro=1`);
  await audit(auth.admin.userId, "coupon_updated", "coupons", id);
  redirect("/admin/cupons?salvo=1");
}

export async function createAdminUser(formData: FormData) {
  const auth = await requirePermission("users.invite");
  if (!auth.ok) redirect("/admin/usuarios?erro=permissao");
  const service = tryServiceClient();
  if (!service) redirect("/admin/usuarios?erro=config");
  const parsed = adminUserCreateSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    role: formData.get("role"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) redirect("/admin/usuarios?novo=1&erro=senha");
  if (parsed.data.role === "super_admin" && auth.admin.role !== "super_admin") {
    redirect("/admin/usuarios?novo=1&erro=permissao");
  }
  const existing = await service.from("admin_profiles").select("id").eq("email", parsed.data.email).maybeSingle();
  if (existing.data) redirect("/admin/usuarios?novo=1&erro=existe");
  const created = await service.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) redirect("/admin/usuarios?novo=1&erro=existe");
  const inserted = await service.from("admin_profiles").insert({
    id: created.data.user.id,
    email: parsed.data.email,
    role: parsed.data.role,
    created_by: auth.admin.userId,
  });
  if (inserted.error) redirect("/admin/usuarios?novo=1&erro=1");
  await audit(auth.admin.userId, "admin_created", "admin_profiles", created.data.user.id);
  redirect("/admin/usuarios?salvo=usuario");
}

export async function updateAdminUser(id: string, formData: FormData) {
  const auth = await requirePermission("users.invite");
  if (!auth.ok) redirect("/admin/usuarios?erro=permissao");
  const service = tryServiceClient();
  if (!service) redirect("/admin/usuarios?erro=config");
  const parsed = adminUserUpdateSchema.safeParse({
    role: formData.get("role"),
    blocked: formData.get("blocked") === "on",
  });
  if (!parsed.success) redirect(`/admin/usuarios?editar=${id}&erro=1`);
  if (parsed.data.blocked && id === auth.admin.userId) redirect(`/admin/usuarios?editar=${id}&erro=proprio`);
  const current = await service.from("admin_profiles").select("id,role,email").eq("id", id).maybeSingle();
  if (!current.data || !isAdminRole(String(current.data.role))) redirect(`/admin/usuarios?editar=${id}&erro=1`);
  const wasSuper = current.data.role === "super_admin";
  const remainsSuper = parsed.data.role === "super_admin" && !parsed.data.blocked;
  if (wasSuper && !remainsSuper && (await countActiveSuperAdmins(id)) < 1) {
    redirect(`/admin/usuarios?editar=${id}&erro=ultimo`);
  }
  const updated = await service
    .from("admin_profiles")
    .update({
      role: parsed.data.role,
    })
    .eq("id", id);
  if (updated.error) redirect(`/admin/usuarios?editar=${id}&erro=1`);
  await service.auth.admin.updateUserById(id, {
    ban_duration: parsed.data.blocked ? "876600h" : "none",
  });
  await audit(auth.admin.userId, parsed.data.blocked ? "admin_blocked" : "admin_updated", "admin_profiles", id);
  redirect(`/admin/usuarios?editar=${id}&salvo=1`);
}

export async function resendAdminAccess(id: string) {
  const auth = await requirePermission("users.invite");
  if (!auth.ok) redirect("/admin/usuarios?erro=permissao");
  const service = tryServiceClient();
  if (!service) redirect("/admin/usuarios?erro=config");
  const profile = await service.from("admin_profiles").select("email").eq("id", id).maybeSingle();
  if (!profile.data) redirect(`/admin/usuarios?editar=${id}&erro=1`);
  const listed = await service.auth.admin.getUserById(id);
  const bannedUntil = listed.data.user?.banned_until;
  if (bannedUntil && Date.parse(String(bannedUntil)) > Date.now()) redirect(`/admin/usuarios?editar=${id}&erro=1`);
  const kind = listed.data.user?.last_sign_in_at ? "recovery" : "invite";
  const mailed = await sendAdminAccessEmail(String(profile.data.email), kind);
  if (!mailed.ok) redirect(`/admin/usuarios?editar=${id}&erro=${mailed.code}`);
  await audit(auth.admin.userId, "admin_access_email_sent", "admin_profiles", id);
  redirect(`/admin/usuarios?editar=${id}&salvo=email`);
}

export async function completeFirstAccess(formData: FormData) {
  const parsed = firstAccessSchema.safeParse({
    tokenHash: formData.get("tokenHash"),
    type: formData.get("type"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) redirect("/admin/primeiro-acesso?erro=senha");
  const client = await trySessionClient();
  if (!client) redirect("/admin/primeiro-acesso?erro=1");
  const verified = await client.auth.verifyOtp({
    token_hash: parsed.data.tokenHash,
    type: parsed.data.type,
  });
  if (verified.error || !verified.data.user) {
    redirect(`/admin/primeiro-acesso?token_hash=${encodeURIComponent(parsed.data.tokenHash)}&type=${parsed.data.type}&erro=1`);
  }
  const updated = await client.auth.updateUser({ password: parsed.data.password });
  if (updated.error) {
    redirect(`/admin/primeiro-acesso?token_hash=${encodeURIComponent(parsed.data.tokenHash)}&type=${parsed.data.type}&erro=senha`);
  }
  const admin = await getAdminSession();
  if (!admin) {
    await client.auth.signOut();
    redirect("/admin/login?erro=bloqueado");
  }
  redirect("/admin");
}

export async function reprocessReading(formData: FormData) {
  const auth = await requirePermission("orders.reprocess");
  if (!auth.ok) redirect("/admin/relatorios?erro=permissao");
  const service = tryServiceClient();
  if (!service) redirect("/admin/relatorios?erro=config");
  const entitlementId = String(formData.get("entitlementId") ?? "");
  const chartId = String(formData.get("chartId") ?? "");
  await service.from("jobs").insert({
    kind: "interpretation",
    idempotency_key: `interpretation-retry:${entitlementId}:${Date.now()}`,
    status: "queued",
    payload: { entitlementId, chartId },
    next_run_at: new Date().toISOString(),
  });
  await audit(auth.admin.userId, "reading_reprocess", "entitlements", entitlementId);
  redirect("/admin/relatorios?salvo=1");
}

export async function simulateManual(formData: FormData) {
  const auth = await requirePermission("simulator.use");
  if (!auth.ok) redirect("/admin/login");
  const longitude = Number(formData.get("longitude"));
  const house = Number(formData.get("house"));
  const pointId = String(formData.get("pointId") || "sun");
  if (!Number.isFinite(longitude) || house < 1 || house > 12) redirect("/admin/simulador?erro=1");
  const result = activatePositions({
    positions: [{ pointId, longitude, houseNumber: house }],
    catalog: officialCatalog,
    methodologyVersion: "simulador-manual",
    pointsToActivate: [pointId],
    fortunaRulePending: pointId === "part_of_fortune",
  });
  const payload = {
    manual: true,
    note: "Longitude e casa informadas manualmente. Isto não é um cálculo de efeméride.",
    result,
  };
  redirect(`/admin/simulador?resultado=${encodeURIComponent(JSON.stringify(payload))}`);
}
