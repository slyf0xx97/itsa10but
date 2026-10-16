"use client";

import { useEffect } from "react";

/**
 * Pauses the looping animations of every section that is off screen. The page has dozens of them (agents, clouds, coins, scenery), and the browser
 * keeps painting them even when the section is far below. Each watched section gets the class `is-off` while it is out of view; app/shell.css pauses
 * every animation inside it. A margin of one screen keeps a section moving just before it scrolls in. Nothing is watched without IntersectionObserver.
 */
export function useOffscreenPause(selector = ".hero, .stage, #how-it-works") {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const watcher = new IntersectionObserver((entries) => {
      for (const entry of entries) entry.target.classList.toggle("is-off", !entry.isIntersecting);
    }, { rootMargin: "100% 0px" });
    const seen = new Set<Element>();
    const watch = () => document.querySelectorAll(selector).forEach((el) => { if (!seen.has(el)) { seen.add(el); watcher.observe(el); } });
    watch();
    // Sections that appear later (the dashboard after a run) are picked up when the page changes.
    let queued = false;
    const mutations = new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; watch(); }); });
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => { watcher.disconnect(); mutations.disconnect(); };
  }, [selector]);
}
