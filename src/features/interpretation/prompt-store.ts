import { INDIVIDUAL_SYSTEM_PROMPT, PROMPT_VERSION, SYNTHESIS_SYSTEM_PROMPT } from "@/features/interpretation/prompts";

export type InterpretationPromptKind = "individual" | "synthesis";

export type InterpretationPromptRow = {
  kind: string;
  version: string;
  body: string;
  status: string;
  created_at?: string;
};

export type LiveInterpretationPrompts = {
  individual: string;
  synthesis: string;
  version: string;
};

export function pickLivePrompts(rows: InterpretationPromptRow[]): LiveInterpretationPrompts {
  const published = rows
    .filter((row) => row.status === "published" && row.body.trim())
    .sort((left, right) => String(right.created_at ?? "").localeCompare(String(left.created_at ?? "")));
  const individual = published.find((row) => row.kind === "individual");
  const synthesis = published.find((row) => row.kind === "synthesis");
  return {
    individual: individual?.body.trim() || INDIVIDUAL_SYSTEM_PROMPT,
    synthesis: synthesis?.body.trim() || SYNTHESIS_SYSTEM_PROMPT,
    version: individual?.version || synthesis?.version || PROMPT_VERSION,
  };
}
