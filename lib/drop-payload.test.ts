import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyDrop, pickJobFile, pickResumeFile, UNSUPPORTED_FILE } from "./drop-payload.ts";

const file = (name: string) => ({ name }) as File;

test("files beat links, links beat text", () => {
  assert.equal(classifyDrop({ files: [file("a.pdf")], uriList: "https://x.com", text: "hi" }).kind, "files");
  assert.deepEqual(classifyDrop({ files: [], uriList: "# comment\r\nhttps://www.linkedin.com/jobs/view/123456789/", text: "" }), { kind: "link", url: "https://www.linkedin.com/jobs/view/123456789/" });
  assert.deepEqual(classifyDrop({ files: [], uriList: "", text: "  https://example.com/job  " }), { kind: "link", url: "https://example.com/job" });
  assert.equal(classifyDrop({ files: [], uriList: "", text: "We need a SOC analyst" }).kind, "text");
  assert.equal(classifyDrop({ files: [], uriList: "", text: "see https://x.com later" }).kind, "text");
  assert.equal(classifyDrop({ files: [], uriList: "javascript:alert(1)", text: "" }).kind, "none");
  assert.equal(classifyDrop({ files: [], uriList: "", text: "  " }).kind, "none");
});

test("the role box takes job files and sends résumés to the résumé box", () => {
  assert.equal(pickJobFile([file("job-posting.pdf")]).file?.name, "job-posting.pdf");
  assert.equal(pickJobFile([file("soc.txt")]).file?.name, "soc.txt");
  assert.match(pickJobFile([file("My_Resume.pdf")]).message, /résumé box/);
  assert.equal(pickJobFile([file("My_Resume.pdf")]).file, undefined);
  assert.equal(pickJobFile([file("photo.png")]).message, UNSUPPORTED_FILE);
  const many = pickJobFile([file("cv.pdf"), file("jd.md"), file("other.txt")]);
  assert.equal(many.file?.name, "jd.md");
  assert.match(many.message, /Only one job file/);
});

test("the résumé box takes résumés and sends job postings to the role box", () => {
  assert.equal(pickResumeFile([file("Ghernie CV.pdf")]).file?.name, "Ghernie CV.pdf");
  assert.equal(pickResumeFile([file("resume.docx")]).file?.name, "resume.docx");
  assert.equal(pickResumeFile([file("resume.pages")]).message, UNSUPPORTED_FILE);
  assert.match(pickResumeFile([file("Job Description.txt")]).message, /role box/);
  assert.equal(pickResumeFile([file("job-application-resume.pdf")]).file?.name, "job-application-resume.pdf");
  assert.equal(pickResumeFile([file("notes.md")]).message, "");
});
