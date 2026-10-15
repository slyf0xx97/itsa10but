"use client";
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";

export type TipTone = "teal" | "water" | "coral" | "orange" | "lime" | "leaf";

/**
 * A word (or, with `panel`, an icon button) that opens a short explanation. Opens on mouse hover, keyboard focus and click or tap;
 * closes on Escape or a press outside. Focus is never trapped.
 * `panel` is the rich variant: a wider non-modal dialog that may hold lists, scrolls when tall and has its own Close button for touch.
 * The trigger is then `word` (an icon or emoji) named by `label`.
 * The bubble is a small card: a coloured header strip (`icon` in a tile, default an info mark, and the title; `tone` picks the colour, default teal),
 * a scrollable body and, for the small bubble, an arrow that points at the word (placement sets data-side and --tip-arrow-x).
 */
export function WordTip({ title, children, word, panel = false, label, icon, tone }: { title: string; children: ReactNode; word: ReactNode; panel?: boolean; label?: string; icon?: ReactNode; tone?: TipTone }) {
  const id = useId();
  const titleId = id + "-title";
  const root = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hover || focus || pinned;
  // A block element cannot sit in a span, so the panel variant swaps both wrappers for divs (the tooltip stays inline). Same props either way.
  const Wrap = (panel ? "div" : "span") as "div";

  useLayoutEffect(() => {
    const el = bubble.current;
    const btn = trigger.current;
    if (!open || !el || !btn) return;
    const margin = 12;
    // Both the small bubble and the panel go into the top layer (popover) and are placed with fixed coordinates, so a card with
    // overflow: hidden or clip, a scroll area or the modal <dialog> cannot clip them. They flip above when there is no room below.
    try { el.showPopover?.(); } catch { /* already open, or no popover support: fixed positioning still applies */ }
    const place = () => {
      el.style.removeProperty("--tip-max");
      el.style.removeProperty("--panel-max");
      const t = btn.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      const viewW = document.documentElement.clientWidth;
      const viewH = window.innerHeight;
      const below = t.bottom + 10; // room for the arrow
      const roomBelow = viewH - margin - below;
      const roomAbove = t.top - 10 - margin;
      // Flip above when the card does not fit below and there is more room above. A card taller than its room scrolls inside its body.
      const flip = b.height > roomBelow && roomAbove > roomBelow;
      const room = flip ? roomAbove : roomBelow;
      // The panel scrolls as a whole, so it is capped by its own max-height; the small bubble scrolls only its body.
      if (b.height > room) {
        if (panel) el.style.setProperty("--panel-max", Math.max(160, room) + "px");
        else el.style.setProperty("--tip-max", Math.max(96, room - (el.firstElementChild?.getBoundingClientRect().height ?? 0) - 6) + "px");
      }
      const left = Math.max(margin, Math.min(t.left, viewW - b.width - margin));
      el.style.left = left + "px";
      el.style.top = (flip ? t.top - 10 - Math.min(b.height, room) : below) + "px";
      el.dataset.side = flip ? "above" : "below";
      el.style.setProperty("--tip-arrow-x", Math.max(22, Math.min(t.left + Math.min(t.width, 160) / 2 - left, b.width - 22)) + "px");
    };
    place();
    const onScroll = (event: Event) => { if (!el.contains(event.target as Node)) place(); }; // scrolling the card's own body must not re-place it
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
      try { el.hidePopover?.(); } catch { /* already closed */ }
    };
  }, [open, panel]);

  const close = () => { setHover(false); setFocus(false); setPinned(false); };
  useEffect(() => {
    if (!open) return;
    const onPress = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) close(); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("pointerdown", onPress);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPress); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return <Wrap className={panel ? "word-tip is-panel" : "word-tip"} ref={root}
    onPointerEnter={(event) => { if (event.pointerType === "mouse") setHover(true); }}
    onPointerLeave={(event) => { if (event.pointerType === "mouse") setHover(false); }}
    // Focus may move from the trigger to the Close button inside; only leaving the whole widget closes the focus-opened state.
    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocus(false); }}>
    <button type="button" ref={trigger} className={panel ? "tip-icon-btn" : "word-tip-btn"} aria-expanded={open}
      aria-label={label}
      {...(panel ? { "aria-haspopup": "dialog" as const, "aria-controls": id } : { "aria-describedby": id })}
      onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) setFocus(true); }}
      onClick={() => setPinned((value) => !value)}>
      {word}{!panel && <Info className="word-tip-icon" aria-hidden="true" focusable="false" />}
    </button>
    <Wrap id={id} ref={bubble} hidden={!open} className={panel ? "word-tip-bubble is-panel" : "word-tip-bubble"} data-tone={tone}
      popover="manual" {...(panel ? { role: "dialog", "aria-labelledby": titleId } : { role: "tooltip" })}>
      <span className="word-tip-head">
        <span className="word-tip-badge" aria-hidden="true">{icon ?? <Info size={18} strokeWidth={2.5} />}</span>
        <strong className="word-tip-title" id={panel ? titleId : undefined}>{title}</strong>
        {panel && <button type="button" className="tip-close" onClick={() => { trigger.current?.focus(); close(); }}>Close</button>}
      </span>
      <span className="word-tip-body">{children}</span>
      {!panel && <span className="word-tip-arrow" aria-hidden="true" />}
    </Wrap>
  </Wrap>;
}
