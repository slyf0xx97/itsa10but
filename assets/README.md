# Itsa10but assets

Everything the page serves from `public/` is listed here with its source and licence. The app runs under `/projects/itsa10but`, so a file at `public/assets/x.svg` is served at `/projects/itsa10but/assets/x.svg`. Code builds those URLs with `BASE_PATH` from `lib/base-path.ts`; CSS repeats the prefix in `url()`.

Keep new UI assets under `public/assets/` and add a row below. Vendor marks used in the skills map stay in `public/tool-logos/` with the Devicon licence.

| File | Used in | Source | Licence |
| --- | --- | --- | --- |
| `assets/agents/pixel-team-v2.png` | Hero and the "How it works" trail: the four readers on one transparent sheet (teal Scout with binoculars, mint Finder with a magnifier, coral Recruiter with glasses and a clipboard, yellow Planner with a pencil and checklist) | Generated for this project | Original; project licence |
| `assets/icons/abilities/*.svg` (14 files) | Reader steps and ability chips | Drawn for this project | Original; project licence |
| `assets/icons/quests/write.svg` | Résumé drop zone | Drawn for this project | Original; project licence |
| `assets/icons/samples/*.svg` (8 files) | Sample role picker | Drawn for this project | Original; project licence |
| `assets/art/journey-ridges.svg`, `journey-summit.svg`, `journey-near.svg`, `journey-cloud.svg` | Bottom journey bar: far and middle ridges, snowy summit with flag, near hill, cloud | Drawn for this project | Original; project licence |
| `assets/scenes/bg-camp.svg`, `bg-woods.svg`, `bg-lookout.svg`, `bg-training.svg`, `bg-workshop.svg` | Painted scene behind each stage | Drawn for this project | Original; project licence |
| `assets/scenes/hero-landscape.svg`, `clouds.svg` | Hero backdrop | Drawn for this project | Original; project licence |
| Inline pixel icons in `components/career/pixel-icons.tsx` | Skill rows, radar labels, More tools cards | Drawn for this project | Original; project licence |
| `assets/logos/*.png`, `*.svg`, `nextjs.ico` | Level up cards, résumé-site tiles, news tiles, footer and How it works | Fetched once from each site's own icon or logo, never hotlinked. Origins in `assets/logos/SOURCES.md` | Trademarks of their owners, shown only to identify the linked site; not covered by the project licence |
| `tool-logos/*.svg` | Skills list and radar | [Devicon](https://devicon.dev) | MIT; text in `tool-logos/LICENSE.devicon.txt` |
| `favicon.svg` | Browser tab | Source not recorded; confirm before publishing | Unconfirmed |

Logos are examples of common tools for a skill. They do not mean the candidate has used them.
