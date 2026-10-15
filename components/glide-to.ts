import type { MouseEvent } from "react";

/** Smooth-scroll to a section id, clear of the sticky header. Falls back to the browser's hash jump when the id is missing. */
export function glideTo(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  event.preventDefault();
  const header = document.querySelector<HTMLElement>(".site-header");
  const stuck = header && getComputedStyle(header).position === "sticky" ? header.offsetHeight : 0;
  const top = target.getBoundingClientRect().top + window.scrollY - stuck - 8;
  const quick = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: Math.max(0, top), behavior: quick ? "instant" : "smooth" });
  history.replaceState(null, "", "#" + id);
}
