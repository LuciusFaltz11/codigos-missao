import { z } from "zod";
import { chartRequestSchema } from "@/lib/schemas/forms";

export const wixChartRequestSchema = chartRequestSchema.extend({
  turnstileToken: z.string().trim().max(4000).optional(),
  marketingOptIn: z.boolean().optional().default(false),
});

export type WixChartRequest = z.infer<typeof wixChartRequestSchema>;
