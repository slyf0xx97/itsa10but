/**
 * The logo for the model an agent runs on, by the maker named in its id. Each file is the maker's own icon, saved once with its origin in public/assets/logos/SOURCES.md,
 * so the page never loads an image from another host. A model from a maker without a file shows a letter, which is what modelMark returns.
 */
export type ModelMaker = "anthropic" | "gemini" | "openai" | "deepseek";

const FILES: Record<ModelMaker, string> = { anthropic: "model-anthropic.png", gemini: "model-gemini.png", openai: "model-openai.webp", deepseek: "model-deepseek.ico" };

/** Which of the four makers an id belongs to, in Anthropic's, Google's or OpenRouter's spelling, or null. */
export function modelMaker(id: string): ModelMaker | null {
  if (/^(?:anthropic\/)?claude-/i.test(id)) return "anthropic";
  if (/^google\//i.test(id) || /^gemini-/i.test(id)) return "gemini";
  if (/^openai\//i.test(id)) return "openai";
  if (/^deepseek\//i.test(id)) return "deepseek";
  return null;
}

/** A logo file for the model, or a letter from the maker's name (the part before the slash) when there is no file. */
export function modelMark(id: string): { file: string } | { letter: string } {
  const maker = modelMaker(id);
  return maker ? { file: FILES[maker] } : { letter: (id.split("/")[0].match(/[a-z0-9]/i)?.[0] ?? "?").toUpperCase() };
}
