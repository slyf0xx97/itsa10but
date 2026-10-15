"use client";
import { useRef, useState, type DragEvent } from "react";
import { classifyDrop, type DropPayload } from "@/lib/drop-payload";

/**
 * Drag and drop for one box. `over` is true while something is held above it. A drop is read straight from the event
 * (dataTransfer only lives that long) and handed on as a DropPayload. Nothing is stored, logged or put in a URL.
 */
export function useDropZone(onDrop: (payload: DropPayload) => void, enabled = true) {
  const [over, setOver] = useState(false);
  const depth = useRef(0); // dragenter and dragleave fire for every child, so count them

  const carries = (event: DragEvent) => Array.from(event.dataTransfer.types).some((type) => type === "Files" || type === "text/uri-list" || type === "text/plain");

  const props = {
    onDragEnter: (event: DragEvent) => { if (!enabled || !carries(event)) return; event.preventDefault(); depth.current++; setOver(true); },
    onDragOver: (event: DragEvent) => { if (!enabled || !carries(event)) return; event.preventDefault(); event.dataTransfer.dropEffect = "copy"; },
    onDragLeave: () => { if (depth.current > 0 && --depth.current === 0) setOver(false); },
    onDrop: (event: DragEvent) => {
      depth.current = 0; setOver(false);
      if (!enabled) return;
      event.preventDefault(); // keeps the browser from opening a dropped file
      const data = event.dataTransfer;
      onDrop(classifyDrop({ files: Array.from(data.files), uriList: data.getData("text/uri-list"), text: data.getData("text/plain") }));
    },
  };
  return { over: over && enabled, props };
}
