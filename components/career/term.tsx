"use client";
import type { ReactNode } from "react";
import { PixelIcon } from "@/components/career/pixel-icons";
import { WordTip } from "@/components/career/word-tip";
import { GLOSSARY, type TermId } from "@/lib/glossary";

/** A jargon word with a plain-word tooltip from the glossary. Children replace the label, the explanation stays. */
export function Term({ id, children }: { id: TermId; children?: ReactNode }) {
  const entry = GLOSSARY[id];
  return <WordTip title={entry.title} word={children ?? entry.word} tone={entry.tone} icon={entry.icon && <PixelIcon name={entry.icon} size={18} />}>
    {entry.lines.map((line) => <span key={line} className="word-tip-line">{line}</span>)}
    {entry.sections?.map((section) => <span key={section.label} className="word-tip-sec">
      <span className="word-tip-sec-h">{section.icon && <span className="word-tip-sec-icon"><PixelIcon name={section.icon} size={14} /></span>}{section.label}</span>
      {section.items.map((item) => <span key={item} className="word-tip-line word-tip-item">{item}</span>)}
    </span>)}
    {entry.source && <span className="word-tip-line word-tip-source">Source: <a href={entry.source.href} target="_blank" rel="noopener noreferrer">{entry.source.label}</a></span>}
  </WordTip>;
}
