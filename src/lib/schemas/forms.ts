import { z } from "zod";

export const chartRequestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/),
  cityQuery: z.string().trim().min(2).max(160),
  cityLabel: z.string().trim().min(2).max(240),
  offsetChoice: z.number().int().min(-14 * 60).max(14 * 60).optional(),
  acceptPrivacy: z.literal(true),
  marketingOptIn: z.boolean(),
});

export type ChartRequest = z.infer<typeof chartRequestSchema>;

const codeUpdateSchema = z.object({
  archetype: z.string().trim().min(1).max(160),
  keyword: z.string().trim().min(1).max(80),
  decanRuler: z.string().trim().min(1).max(80),
  light: z.string().trim().min(1).max(4000),
  shadow: z.string().trim().min(1).max(4000),
  essentialOil: z.string().trim().max(120).nullable(),
  tarotMirrorCard: z.string().trim().max(120).nullable(),
});

export const codeUpdate = codeUpdateSchema;

export const priceUpdateSchema = z.object({
  priceCents: z.number().int().min(100).max(100_000_00),
  active: z.boolean(),
});

export const couponSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    code: z.string().trim().min(3).max(32).regex(/^[A-Za-z0-9_-]+$/),
    kind: z.enum(["percent", "fixed"]),
    percent: z.number().int().min(1).max(100).nullable(),
    amountCents: z.number().int().min(1).max(100_000_00).nullable(),
    active: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "percent" && value.percent == null) {
      ctx.addIssue({ code: "custom", path: ["percent"], message: "Informe o percentual." });
    }
    if (value.kind === "fixed" && value.amountCents == null) {
      ctx.addIssue({ code: "custom", path: ["amountCents"], message: "Informe o valor." });
    }
  });

export const glossaryUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(8000),
});

export const adminUserCreateSchema = z
  .object({
    email: z.string().trim().email().max(200),
    role: z.enum(["super_admin", "admin", "editor", "support"]),
    password: z.string().min(8).max(72),
    confirm: z.string().min(8).max(72),
  })
  .refine((value) => value.password === value.confirm, { path: ["confirm"] });

export const adminUserUpdateSchema = z.object({
  role: z.enum(["super_admin", "admin", "editor", "support"]),
  blocked: z.boolean(),
});

export const firstAccessSchema = z.object({
  tokenHash: z.string().trim().min(16).max(200),
  type: z.enum(["invite", "recovery"]),
  password: z.string().min(8).max(72),
  confirm: z.string().min(8).max(72),
}).refine((value) => value.password === value.confirm, { path: ["confirm"] });

export const methodologyDraftSchema = z.object({
  zodiac: z.enum(["tropical", "sidereal"]),
  houseSystem: z.enum(["placidus", "whole_sign"]),
  nodeMode: z.enum(["true", "mean"]),
  fortunaRule: z.enum(["pending_approval", "day_night_traditional"]),
  activateAscendant: z.boolean(),
  freePreviewPoint: z.enum([
    "sun",
    "moon",
    "mercury",
    "venus",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
    "pluto",
    "chiron",
    "part_of_fortune",
    "south_node",
    "north_node",
  ]),
  rulesValidated: z.boolean(),
});
