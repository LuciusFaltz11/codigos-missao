import { z } from "zod";

export const IndividualReadingSchema = z.object({
  activation_id: z.string().min(1),
  headline: z.string().min(8),
  interpretation: z.string().min(50),
  light_expression: z.string().min(20),
  shadow_expression: z.string().min(20),
  reflective_question: z.string().min(10),
});

export const PatternSchema = z.object({
  pattern_id: z.string().min(1),
  activation_ids: z.array(z.string().min(1)).min(1),
  theme: z.string().min(5),
  insight: z.string().min(40),
  evidence: z.string().min(20),
});

export const IndividualBatchSchema = z.object({
  individual_readings: z.array(IndividualReadingSchema).min(1),
});

export const SynthesisSchema = z.object({
  patterns: z.array(PatternSchema),
  overall_synthesis: z.string().min(400),
  closing_reflection: z.string().min(80),
  reflective_questions: z.array(z.string().min(10)).min(1).max(5),
});

export const InterpretationResultSchema = z.object({
  individual_readings: z.array(IndividualReadingSchema),
  patterns: z.array(PatternSchema),
  overall_synthesis: z.string().min(400),
  closing_reflection: z.string().min(80),
  reflective_questions: z.array(z.string().min(10)).min(1).max(5),
});

export type InterpretationResult = z.infer<typeof InterpretationResultSchema>;
export type IndividualReading = z.infer<typeof IndividualReadingSchema>;

const FORBIDDEN_PATTERNS: RegExp[] = [
  /diagn[oó]stic/i,
  /voc[eê] (tem|teve|sofre de) (um |uma )?(trauma|doen[cç]a|depress[aã]o|ansiedade)/i,
  /vida passada/i,
  /cura garantida/i,
  /voc[eê] vai (enriquecer|casar|morrer|adoecer|engravidar)/i,
  /com certeza voc[eê]/i,
  /destino (fixo|inevit[aá]vel|selado)/i,
  /prometo que/i,
  /resultado financeiro garantido/i,
];

export function findForbiddenClaims(text: string): string[] {
  return FORBIDDEN_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

export function sameIdSet(actual: string[], expected: string[]) {
  if (actual.length !== expected.length) return false;
  const left = new Set(actual);
  return expected.every((id) => left.has(id));
}

export function validateAgainstEvidence(input: {
  result: InterpretationResult;
  activationIds: string[];
  verifiedPatternIds: string[];
}): string[] {
  const errors: string[] = [];
  const returned = input.result.individual_readings.map((reading) => reading.activation_id);
  if (!sameIdSet(returned, input.activationIds)) {
    errors.push("O conjunto de activation_id da leitura não corresponde ao mapa.");
  }
  if (new Set(returned).size !== returned.length) {
    errors.push("Há activation_id repetido na leitura individual.");
  }

  const allowed = new Set(input.activationIds);
  const allowedPatterns = new Set(input.verifiedPatternIds);
  for (const pattern of input.result.patterns) {
    if (!allowedPatterns.has(pattern.pattern_id)) {
      errors.push(`Padrão não calculado pelo backend: ${pattern.pattern_id}.`);
    }
    if (pattern.activation_ids.some((id) => !allowed.has(id))) {
      errors.push(`O padrão ${pattern.pattern_id} cita uma ativação inexistente.`);
    }
  }
  if (input.verifiedPatternIds.length === 0 && input.result.patterns.length > 0) {
    errors.push("A síntese afirmou padrões sem evidência calculada.");
  }

  const blob = JSON.stringify(input.result);
  const forbidden = findForbiddenClaims(blob);
  if (forbidden.length > 0) errors.push("A leitura contém formulação proibida pela política editorial.");
  return errors;
}
