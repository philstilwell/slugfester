# Publication validation

Validated October 9, 2026 against the frozen 308-assessment research snapshot.

## Evidence and calculations

- All source fingerprints match the earlier research edition and locked ledgers.
- The reply census was independently reconstructed from all 112 applicable raw ledgers: 2,444 replies and 2,978 target links.
- The 16 selected passages were read with their saved source excerpts, relevant targets, timestamps and original assessment context. The written interpretations distinguish the point addressed from the question left open.
- Every outside-pair opponent average excludes all meetings of the focal pair. All eight model checks and the additional matched-sample check were independently reproduced using full design-matrix fits.
- Repeated-pair counts, strict reversals and margin ranges were independently recomputed.
- The case studies are explicitly purposive, not prevalence estimates. The opponent calculations are descriptive, not causal effects or a replacement ranking. The difference between model checks is not presented as a confidence interval.
- Machine-readable results are in `verification-results.json`; `verify.py` reproduces these checks.

## PDF review

- Papers 8, 9 and 10 contain 7, 8 and 8 pages respectively, with 1, 1 and 2 figures.
- Every page was rendered and visually inspected. Figure headings, tables, page breaks, margins and source links were checked; the creator diagram's subtitle spacing was corrected during review.
- All PDF fonts are embedded. Each page contains meaningful selectable text, and the internal site links resolve to existing pages.
- The PDF fingerprints match `publication-manifest.json`. The original seven papers retain their exact previous fingerprints.

## Site and integration

- All 62 browser checks passed in the final complete `npm run site:check` run. The independent scoring-weight tests also passed (9 tests).
- The public-site validator, generated-page check, frozen weighting inputs and earlier research-edition checks passed.
- Desktop Insights sections and the mobile Insights/Backend library layouts were visually inspected.
- Initial HTML contains all ten research sections and all ten Backend paper links without JavaScript. The three local PDF downloads returned HTTP 200 with bytes identical to the reviewed files.
- No debate scores, interlocutor biographies, original research PDFs or scoring-weight calculations were changed.

These checks validate this research package and its publication presentation. They do not constitute an independent full-video reassessment or outside peer review.
