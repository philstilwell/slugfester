# Reader features — September 5, 2026

Implements site-audit recommendations 1, 2 and 6. No published scores, argument judgments, source transcripts or research calculations were changed.

## Insights

`/insights/` is linked from primary navigation, the footer, the landing page and Backend's research library. Seven editorial introductions provide a finding, exact headline statistic, limitations, a research figure with alternative text and a reading key, the full paper, and relevant scorecards, searches or profiles.

All figures are unchanged copies of published research figures. Six come from `docs/analysis/astra-corpus-papers-2026-09-04/figures/`; the slogan figure comes from `docs/analysis/direct-slogan-study-2026-09-04/figures/`. Summaries are grounded in those papers' manuscripts and existing Backend descriptions. The research snapshot remains September 4 (253 assessments), with the September 5 direct slogan review identified separately. These are not live counts or probability-of-truth measures.

The same `renderInsightsContent()` supplies the generated HTML and interactive reader. All seven introductions remain available without JavaScript. The Insights module loads only when its route is requested; images load as needed. It has its own canonical address, metadata, structured data and sitemap entry. Existing PDF addresses and Backend content are retained.

## What decided this assessment?

Every published debate receives an introduction immediately below the title/scoreboard. It reuses the published debate summary and computes the displayed gap from the existing overall scores, including ties. For each side it selects a highest-scoring displayed move, shows its existing words, and links to its section and YouTube timestamp. Tied moves use the first displayed occurrence.

When a critique explicitly identifies a “Strongest feature,” that passage supplies the explanation. Older free-form critiques instead use the first existing overall strength, clearly labeled as overall commentary. A key limitation comes from the first existing overall blunder. The introduction explicitly says these examples do not alone determine the total. Multi-speaker material remains a shared-side assessment, not an individual performance judgment. No future logical-extension material is used as evidence for the actual debate.

## Related debates

Every published scorecard ends with three distinct suggestions, with visible reasons. Selection tries a shared primary topic, a shared interlocutor in a different lineup, and a different cast within the same primary topic; remaining slots use the same topic. Within those groups, overlap in the motion, label and section headings determines order, followed by debate number and ID. Suggestions exclude the current debate and repeat source videos. They make no claim about ideological endorsement or guaranteed agreement/disagreement.

Introductions and suggestions derive from the published catalogue, so new debates receive them automatically. Research findings remain frozen until editorially updated.

## Verification

- `validate-reader-features.mjs` checks all 253 introductions against their exact source fields and verifies three valid, deterministic, non-self suggestions per debate. It also checks all seven paper/figure links, image dimensions, source-image identity, and local onward links. It runs with public-site validation and therefore in the existing quality workflow.
- All 253 published assessments retain their existing validation result.
- The expanded suite has 54 browser checks, including Insights accessibility and narrow-phone layout.
- Targeted browser checks cover seven loaded figures at 320/390/1200 pixels, Insights jump links, three representative debate introductions (including a team debate), section jumps, related navigation, and the complete non-JavaScript Insights reader.
- Visual reference images are updated only for deliberate visible changes. Browser failures now retain screenshots and traces for review.
- A small landing-label wrap correction prevents “Debates/Scorecards” from overlapping the next statistic on narrow phones.

No paid model, transcription, image-generation or hosting-migration work was required.
