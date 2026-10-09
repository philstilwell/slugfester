# Validation of the October research edition

## Numerical and source checks

- Reconstructed 7,032 scored moves, 3,206 section-side scores and 582 overall
  side scores; matched all public move values and 112 final-ledger fingerprints.
- Checked 719 input-file fingerprints against the source manifest.
- Independently recomputed public score gaps, all eight research topic means,
  fallacy-label counts, and every ranked person's count, mean and place in JavaScript.
- Reproduced the historical direct-study counts, equal-debate word rates and
  seeded resampling intervals from the published per-debate records.
- Confirmed no changes in earlier overall scores or assessment-process grouping.
- Identified the shared video behind assessments 13 and 125 and disclosed the
  distinction between 308 assessments and 307 source links. Comparable analyses
  contain 291 unique source links; recurring speakers remain a limitation.

## PDF and chart checks

- Seven PDFs, 59 pages and 21 figures; all declared PDF and vector-chart fonts
  embedded. Automated page-boundary, internal-link and source-link checks pass.
- Visually reviewed contact sheets covering every PDF page and a full-size cover.
  Rebalanced the endings of papers two, four and five, then rerendered and checked
  the changed layouts. Charts carry units, population scope and reading guides.
- Current webpage figures match the research outputs byte for byte; dimensions
  are read from the actual images. PDF lengths and figure counts come from the
  final publication manifest, not old hand-entered descriptions.

## Scope limits

This was a statistical and editorial refresh, not a new assessment campaign.
No new transcript-level slogan judgments were made. Historical direct findings
and current score-based warning patterns are explicitly separated. Resampling
does not account for every repeated-speaker dependency or systematic judging
error. The selection and research categories remain exploratory.

## Website checks

- All 62 browser tests pass, including accessibility, phone widths, enlarged
  text, keyboard navigation, display snapshots and browser data limits.
- All 880 generated search-engine pages validate. Independent public-data and
  reader-feature checks pass after the final chart adjustment.
- Manually reviewed Insights, methods and the Backend library on desktop and
  phone layouts. Moved the ranking chart legend away from the plotted ranges.
- Confirmed all seven PDF downloads return the exact published file hashes.
- With JavaScript disabled, Insights contains 12,874 characters of substantive
  content and seven PDF links; the methods page contains 18,268 characters and
  seven PDF links. The Backend library is also available without JavaScript.
- Initial local browser runs encountered connection resets from the development
  server. The unchanged tests all passed when rerun against a local server with
  a larger connection queue; no assertions were relaxed.

Live publication is verified after deployment; these are pre-publication checks.
