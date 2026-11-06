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

function versionParts(version: string) {
  return version.split(".").map((part) => Number.parseInt(part, 10) || 0);
}

export function promptVersionIsCurrent(version: string) {
  const stored = versionParts(version);
  const current = versionParts(PROMPT_VERSION);
  const length = Math.max(stored.length, current.length);
  for (let index = 0; index < length; index += 1) {
    const left = stored[index] ?? 0;
    const right = current[index] ?? 0;
    if (left !== right) return left > right;
  }
  return true;
}

export function pickLivePrompts(rows: InterpretationPromptRow[]): LiveInterpretationPrompts {
  const published = rows
    .filter((row) => row.status === "published" && row.body.trim())
    .sort((left, right) => String(right.created_at ?? "").localeCompare(String(left.created_at ?? "")));
  const individual = published.find((row) => row.kind === "individual" && promptVersionIsCurrent(row.version));
  const synthesis = published.find((row) => row.kind === "synthesis" && promptVersionIsCurrent(row.version));
  return {
    individual: individual?.body.trim() || INDIVIDUAL_SYSTEM_PROMPT,
    synthesis: synthesis?.body.trim() || SYNTHESIS_SYSTEM_PROMPT,
    version: individual ? individual.version : PROMPT_VERSION,
  };
}
