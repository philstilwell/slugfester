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

- Seven PDFs, 60 pages and 21 figures; all declared PDF and vector-chart fonts
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

## Stability conclusion revision

- Independently reproduced all 3,000 split-half correlations, the ordered-split
  correlation, process-centered rank agreement and modeled repeatability from
  the frozen records. `verify_stability.py` uses a separate tied-rank calculation.
- The 0.87 median and 0.81–0.92 split range support strong within-catalogue
  repeatability. The 0.84 ordered split and 0.99 process sensitivity support
  that interpretation without constituting independent replications.
- Kept scope explicit: the random/ordered splits cover 31 people; the full
  ranking and process sensitivity cover 57 people. The split range is not a
  population confidence interval, and correlations are not accuracy percentages.
- Rebuilt only paper seven (12 pages, three unchanged figures). The other six
  PDF hashes, all source records, result values, charts and biographies remain
  unchanged. Reviewed all 12 rendered pages plus full-size summary/conclusion.
- Re-ran the 62 browser tests, public-data reconciliation, 880-page generation
  checks, 719 source fingerprints and all PDF font/link/boundary checks; all pass.
- Revised shared copy appears in Insights, the methods page and Backend, and in
  initial HTML for readers without JavaScript. Desktop and phone layouts checked.
