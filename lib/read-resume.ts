import { docText, docxText } from "./read-docx.ts";

export async function readResumeFile(file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} is too large. Use a file under 5 MB.`);
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const word = /\.(docx?)$/i.exec(file.name)?.[1].toLowerCase();
  if (word) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = (word === "docx" ? await docxText(bytes).catch(() => "") : docText(bytes)).trim();
    if (text.length < 25) throw new Error(`${file.name} has no readable text. Save it as a .docx or PDF and try again.`);
    return text.slice(0, 30000);
  }
  if (!isPdf) {
    if (!/\.(txt|md)$/i.test(file.name)) throw new Error("Use a PDF, Word (.docx or .doc), .txt or .md résumé.");
    const text = (await file.text()).trim();
    if (text.length < 25) throw new Error(`${file.name} has too little text to read.`);
    return text.slice(0, 30000);
  }
  const pdf = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdf.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  const loadingTask = pdf.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const document = await loadingTask.promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 20); pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "").join(""));
  }
  const text = pages.join("\n").trim();
  await loadingTask.destroy();
  if (text.length < 25) throw new Error(`${file.name} has no selectable text. Try an exported PDF or .txt file.`);
  return text.slice(0, 30000);
}
