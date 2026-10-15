/**
 * The words in the footer's "Legal" popup, apart from the MIT text (license-text.ts). Plain data so a test can check the voice rules.
 * Anything that names a source, a licence or a date here must match SOURCES.md, the README and lib/sg-snapshot.ts.
 */
export type LegalSection = { id: string; title: string; text?: string[]; list?: string[] };

export const LEGAL_SECTIONS: LegalSection[] = [
  {
    id: "copyright",
    title: "Copyright",
    text: ["© 2026 Ghernie Encinas. The code is released under the MIT License (see the MIT License button). The four pixel agent characters, the scenes and the other artwork were made for this project and fall under the same licence. They are fictional and don't depict any real person, company or character."],
  },
  {
    id: "advice",
    title: "What this tool is",
    list: [
      "Itsa10but gives general information. It isn't career, legal, immigration or hiring advice.",
      "A score shows how much proof the text you gave contains. It doesn't predict an interview or a job offer.",
      "API boost uses AI models, which can be wrong or leave things out. Check every result against your own résumé and the real posting.",
      "Everything comes as is, with no warranty, as the MIT License says.",
    ],
  },
  {
    id: "names",
    title: "Names, logos and trademarks",
    text: ["LinkedIn, Anthropic, OpenRouter, Firecrawl, IMDA, MOM, PwC, The Straits Times and every other name or logo shown belong to their owners. They appear only to say where a figure, a link or a feature comes from. Itsa10but is independent, and none of them endorse or sponsor it."],
  },
  {
    id: "sources",
    title: "Content from other sources",
    list: [
      "Singapore figures come from the sources named beside each one, checked 15 Oct 2026. They are dated snapshots and not forecasts.",
      "News headlines and snippets belong to their publishers. They are read from public feeds and link back to the original.",
      "Job listings come from public feeds (Himalayas, Jobicy, Arbeitnow and Remotive) and belong to the employers who posted them. Check the original posting before you apply.",
      "Photos come from Unsplash under the Unsplash License. The photographers are credited in the Verified figures popup.",
      "Tool marks come from Devicon under the MIT license. PDFs are read with pdf.js under the Apache License 2.0. The fonts are Pixelify Sans and Atkinson Hyperlegible under the SIL Open Font License.",
    ],
  },
  {
    id: "data",
    title: "Your data",
    text: ["There is no database, and nothing you add is stored. Your résumé is read in your browser. With API boost on, the masked résumé text goes to the model provider you chose. Your keys stay in this tab and travel only in request headers."],
  },
];

export const LEGAL_CONTACT = "If you own something shown here and want it removed or credited differently, get in touch and it will be sorted out.";
