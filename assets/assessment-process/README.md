# Assessment-process infographic

Published on the Backend page from the approved September 26, 2026 guide.

- `panel-1.webp` through `panel-3.webp`: 1600 × 2240 web-optimized copies of the approved panels (WebP quality 92; about 1 MB combined).
- `slugfester-assessment-process.pdf`: three-page guide, with selectable text and embedded fonts. The October 22, 2026 revision explicitly identifies reviewers and adjudicators as independent AI agents called by the administrative AI.
- The character artwork was generated with Google Gemini from the user's supplied reference. All wording and formulas were separately typeset.
- The shared, accessible text is in `src/data/assessment-process-guide.js`; it appears in both initial HTML and the interactive Backend page.

The guide documents the standard new one-on-one workflow as of September 26, 2026. It is an explanatory snapshot, not a replacement for the operational add-debate skill. It does not claim that historical assessments used identical controls.

Source material: the installed `add-slugfester-youtube-debate` skill and its single-debate/team-debate runbooks; `docs/assessment-production-workflow.md`; `docs/reassessment-rubric-v2.1.md`; `docs/assessment-workflow-v4.2.21.17.41.md`; the Debate 238 manifest; and the standalone-debate and reassessment scoring modules. The original source record remains in the user's `Downloads/Slugfester-assessment-guide-2026-09-26` folder. The revised editable layout and original character artwork are saved in `source/` here.

## Q&A illustration

- `qa-characters.webp`: 480 × 439 transparent WebP (quality 88), generated with OpenAI imagegen on October 22, 2026 using `panel-1.webp` as the character and style reference. It pairs the same two characters with “Q&A”, “?” and “!” for the Backend accordion heading.
- Reviewers and adjudicators in the guide and its diagrams are independent AI agents called by the administrative AI. The page states this above the illustrated panels as well as in the accessible text.

## Rebuilding the guide

Run `python3 assets/assessment-process/source/build_infographic.py` with ReportLab installed and the macOS supplemental Arial fonts available. The builder embeds all three used font faces and checks paragraph heights before writing the PDF. Render its three pages at 1600 × 2240 and encode them as WebP at quality 92 to refresh `panel-1.webp` through `panel-3.webp`; visually inspect every page after wording changes. The web panels and download link use the same revision marker to refresh previously cached copies.
