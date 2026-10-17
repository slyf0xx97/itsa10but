/** Text from Word files, read in the browser with no library. A .docx is a zip with the text in word/document.xml. A .doc is the old binary format, so it is a best-effort read. */

const XML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** Finds one entry in a zip by walking the central directory, then inflates it. Handles stored and deflated entries, which is all Word writes. */
async function zipEntry(bytes: Uint8Array, wanted: string): Promise<Uint8Array | null> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let at = bytes.length - 22; at >= Math.max(0, bytes.length - 65557); at--) if (view.getUint32(at, true) === 0x06054b50) { end = at; break; }
  if (end < 0) return null;
  let at = view.getUint32(end + 16, true);
  for (let n = view.getUint16(end + 10, true); n > 0 && at + 46 <= bytes.length && view.getUint32(at, true) === 0x02014b50; n--) {
    const method = view.getUint16(at + 10, true), size = view.getUint32(at + 20, true), nameLen = view.getUint16(at + 28, true);
    const skip = nameLen + view.getUint16(at + 30, true) + view.getUint16(at + 32, true), local = view.getUint32(at + 42, true);
    if (new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLen)) === wanted) {
      const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
      const data = bytes.subarray(start, start + size);
      if (method === 0) return data;
      if (method !== 8) return null;
      const inflated = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Uint8Array(await new Response(inflated).arrayBuffer());
    }
    at += 46 + skip;
  }
  return null;
}

/** Paragraph ends and line breaks become newlines, tabs stay tabs, every other tag is dropped. */
export function wordXmlText(xml: string): string {
  return xml
    .replace(/<\/w:p>/g, "\n").replace(/<w:br\s*\/?>/g, "\n").replace(/<w:tab\s*\/?>/g, "\t")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => code[0] === "#" ? String.fromCodePoint(code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)) : XML_ENTITIES[code] ?? whole)
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export async function docxText(bytes: Uint8Array): Promise<string> {
  const xml = await zipEntry(bytes, "word/document.xml");
  if (!xml) throw new Error("That file isn't a readable Word .docx.");
  return wordXmlText(new TextDecoder().decode(xml));
}

/**
 * shortcut: scans the raw bytes for long runs of readable text (8-bit or UTF-16) instead of parsing the OLE file, so headers, tables and odd fonts can come out
 * rough. Move to a real .doc parser if people rely on it; the error below already points them to .docx or PDF.
 */
export function docText(bytes: Uint8Array): string {
  const runs = (text: string) => (text.match(/[\x20-\x7e\xa0-\xff\r\t]{30,}/g) ?? []).map((run) => run.replace(/\r/g, "\n").trim()).join("\n");
  const narrow = runs(new TextDecoder("latin1").decode(bytes));
  const wide = runs(new TextDecoder("utf-16le").decode(bytes.subarray(0, bytes.length - (bytes.length % 2))));
  return (wide.length > narrow.length ? wide : narrow).replace(/\n{3,}/g, "\n\n").trim();
}
