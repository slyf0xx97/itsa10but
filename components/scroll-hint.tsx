"use client";

import { useCallback, useEffect, useRef, useState, type HTMLAttributes } from "react";

const Chevron = ({ dir }: { dir: "left" | "right" }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} /></svg>;

/** A horizontally scrolling row that shows when there is more: edge fades, arrow buttons and a one-time peek. Extra props go to the scroller. */
export function ScrollHint({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const scroller = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setMore((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(el);
    Array.from(el.children).forEach((child) => resize.observe(child));

    // Peek once, the first time the row is on screen, so the overflow is noticed. Skipped under reduced motion.
    let back: number | undefined;
    let peeked = false;
    const view = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || peeked) return;
      peeked = true;
      view.disconnect();
      if (!matchMedia("(prefers-reduced-motion: no-preference)").matches || el.scrollWidth <= el.clientWidth + 24 || el.scrollLeft > 0) return;
      el.scrollTo({ left: 24 });
      back = window.setTimeout(() => el.scrollTo({ left: 0 }), 600);
    }, { threshold: 0.6 });
    view.observe(el);

    return () => { resize.disconnect(); view.disconnect(); window.clearTimeout(back); };
  }, [measure]);

  const page = (dir: -1 | 1) => scroller.current?.scrollBy({ left: dir * scroller.current.clientWidth * 0.8 });

  return <div className="sh">
    <div {...rest} ref={scroller} className={`sh-scroll ${className ?? ""}`} onScroll={measure}>{children}</div>
    <span className="sh-fade is-left" data-show={more.left} aria-hidden="true" />
    <span className="sh-fade is-right" data-show={more.right} aria-hidden="true" />
    <button type="button" className="sh-btn is-left" data-show={more.left} tabIndex={-1} aria-label="Scroll left" onClick={() => page(-1)}><Chevron dir="left" /></button>
    <button type="button" className="sh-btn is-right" data-show={more.right} tabIndex={-1} aria-label="Scroll right" onClick={() => page(1)}><Chevron dir="right" /></button>
  </div>;
}
