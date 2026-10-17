import assert from "node:assert/strict";
import { test } from "node:test";
import { deflateRawSync } from "node:zlib";
import { docText, docxText, wordXmlText } from "./read-docx.ts";

/** A one-file zip written by hand, so the test needs no zip library. */
function zip(name: string, content: string, deflate: boolean): Uint8Array {
  const raw = Buffer.from(content), data = deflate ? deflateRawSync(raw) : raw, id = Buffer.from(name);
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(deflate ? 8 : 0, 8); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(raw.length, 22); local.writeUInt16LE(id.length, 26);
  const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(deflate ? 8 : 0, 10); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(raw.length, 24); central.writeUInt16LE(id.length, 28);
  const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 10); end.writeUInt32LE(46 + id.length, 12); end.writeUInt32LE(30 + id.length + data.length, 16);
  return new Uint8Array(Buffer.concat([local, id, data, central, id, end]));
}

const xml = '<w:document><w:body><w:p><w:r><w:t>Built a Python tool &amp; cut report time by 40%.</w:t></w:r></w:p><w:p><w:r><w:t>Led a team of 4</w:t><w:tab/><w:t>students.</w:t></w:r></w:p></w:body></w:document>';

test("docxText reads deflated and stored entries", async () => {
  for (const deflate of [true, false]) {
    assert.equal(await docxText(zip("word/document.xml", xml, deflate)), "Built a Python tool & cut report time by 40%.\nLed a team of 4\tstudents.");
  }
});

test("docxText rejects a zip with no document.xml", async () => {
  await assert.rejects(docxText(zip("other.xml", xml, true)), /readable Word/);
  await assert.rejects(docxText(new Uint8Array([1, 2, 3])), /readable Word/);
});

test("wordXmlText decodes numeric entities", () => assert.equal(wordXmlText("<w:p><w:t>R&#233;sum&#xE9;</w:t></w:p>"), "Résumé"));

test("docText pulls readable runs out of binary, 8-bit or UTF-16", () => {
  const sentence = "Built a Python tool that cut weekly report time by forty percent.";
  const junk = Buffer.from([0, 1, 2, 3, 200, 0, 9, 9]);
  assert.match(docText(new Uint8Array(Buffer.concat([junk, Buffer.from(sentence, "latin1"), junk]))), /Built a Python tool/);
  assert.match(docText(new Uint8Array(Buffer.concat([junk, Buffer.from(sentence, "utf16le"), junk, Buffer.alloc(0)]))), /Built a Python tool/);
});
