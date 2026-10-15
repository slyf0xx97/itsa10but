"use client";
import { useCallback, useState } from "react";
import { FileText } from "lucide-react";
import { Popup } from "@/components/popup";
import { WordTip } from "@/components/career/word-tip";
import { promptFor } from "@/lib/agent-prompts";

/** A Markdown file as a code-editor style view: line numbers, headings in teal, list dashes in coral. It only styles lines, nothing is parsed or run. */
type LineKind = "code" | "h1" | "h2" | "li" | "blank" | "p";
const kindsOf = (lines: string[]): LineKind[] => {
  let fence = false;
  return lines.map((line) => {
    if (line.startsWith("```")) { fence = !fence; return "code"; }
    return fence ? "code" : line.startsWith("# ") ? "h1" : line.startsWith("## ") ? "h2" : /^\s*- /.test(line) ? "li" : line.trim() === "" ? "blank" : "p";
  });
};

export function MdView({ text, maxLines, label }: { text: string; maxLines?: number; label: string }) {
  const lines = text.split("\n");
  const kinds = kindsOf(lines);
  const shown = maxLines ? lines.slice(0, maxLines) : lines;
  return <div className="md-view" role="group" aria-label={label}>
    {shown.map((line, index) => <div key={index} className={"md-l md-" + kinds[index]}><span className="md-n" aria-hidden="true">{index + 1}</span><span className="md-t">{line || "\u00a0"}</span></div>)}
    {maxLines && lines.length > maxLines && <div className="md-l md-more"><span className="md-n" aria-hidden="true">…</span><span className="md-t">{lines.length - maxLines} more lines</span></div>}
  </div>;
}

/**
 * The agent's prompt file as a peek: click the "role-scout.md" button for a short look at the top of the file, and open the whole file from there.
 * The text is built from the real spec (lib/agent-prompts.ts), so what you read is what the agent is given.
 */
export function PromptPeek({ name, model }: { name: string; model?: string }) {
  const prompt = promptFor(name, model);
  const [full, setFull] = useState(false);
  const closeFull = useCallback(() => setFull(false), []);
  if (!prompt) return null;
  return <>
    <WordTip panel clickOnly buttonClass="rd-prompt" tone="water" icon={<FileText size={18} aria-hidden="true" />} title={prompt.file}
      label={`Open a peek at the ${name} prompt, ${prompt.file}`}
      word={<><FileText size={16} aria-hidden="true" /><span className="rd-prompt-name">{prompt.file}</span><span className="rd-prompt-hint">Peek</span></>}>
      <span className="md-peek">
        <MdView text={prompt.markdown} maxLines={10} label={`First lines of ${prompt.file}`} />
        <button type="button" className="md-open" aria-haspopup="dialog" onClick={() => setFull(true)}>Open the whole file</button>
      </span>
    </WordTip>
    <Popup open={full} onClose={closeFull} title={prompt.file} icon={<FileText size={20} aria-hidden="true" />} wide>
      {full && <MdView text={prompt.markdown} label={prompt.file} />}
    </Popup>
  </>;
}
