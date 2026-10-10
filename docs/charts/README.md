# Charts snapshots

The Charts section at `/backend/#charts` is an explicitly refreshed view of saved, published assessments. It does not call a model or rescore debates. The page is part of the existing static site and uses its native HTML, CSS and SVG presentation, with no external chart library or runtime service.

## Refresh

1. Review new debate positions in `position-review.json`. `pro` or `con` identifies the side supporting the religious claim; `null` excludes a debate and should have an explanatory entry. Unreviewed debates are excluded visibly. Assignments reuse the corrected research taxonomy by stable debate ID where available. Explicit reviews also cover legacy panels omitted from that taxonomy. Every reviewed exclusion must have a reason; unresolved cases carry a distinct pending status.
2. Review the phrase rules in `src/data/chart-definitions.js`. These are descriptive browsing labels, not semantic verdicts; the public method states this explicitly. Multiple matches are retained. Scope is the main question of a debate, not a claim that all its moves concern only that question.
3. Run `npm run charts:build -- --date=YYYY-MM-DD` using the intended publication date in the user's time zone. For a correction published on the same date, add `--revision=2` (then `3`, etc.); the original date archive stays intact and the new archive uses a suffix such as `2026-10-08-r2.json`. It writes the current browser snapshot and a dated archive. The builder checks each published move against the locked ledger, uses the recorded constructive/reply/concession classification, and reads or deterministically reconstructs the six existing dimension values.
4. Run `npm run charts:check`, `npm run seo`, and `npm run site:preflight`, then review the Backend Charts section on desktop and phone. Run the Charts browser tests when behavior changes. Inspect examples from every family, coverage, exclusions and filters before publishing.
5. Commit and publish the reviewed site. Preserve earlier snapshot archives. Use `--replace-same-date` only to correct a date/revision that has not been published. Never overwrite an already published archive.

Ordinary assessment publication, SEO generation and validation **do not refresh the charts**. Validation checks the archived snapshot internally, not against subsequently changed live scores. The linked assessments may be corrected after a snapshot; that limitation is visible on the page.

## Measures

- Frequency: distinct debates with at least one unique assessed move in a family and position, divided by all eligible debates in the selected scope. Families overlap, and shares are not additive.
- Scores: average unique move scores within each debate/position/family, then report the median and interpolated 25th/75th percentiles across debate averages. The interval is observed spread, not inferential uncertainty.
- Case/reply: average unique move scores within each debate/position/family/role, then the equal-debate mean. Groups can contain different debates. Concessions are omitted only from this comparison.
- Dimensions: fraction strictly below the selected threshold within each debate/position/family, then the equal-debate mean. The threshold defaults to 70 and can be changed from 50 to 100 in steps of 5; a score equal to the threshold is not counted. Raw counts remain in cell accessibility labels. The slider changes the view immediately, preserves the saved snapshot, and is retained in links and filter selections. All included assessments are combined; there is no generation filter. This is an operational threshold, not a causal diagnosis.
- Speakers: distinct attributed names in the relevant assessed moves. Frequent speakers can still influence multiple debates; no independent-sample or significance claim is made.

The 2026-10-08 snapshot covers 226 of 300 published debates and 5,405 unique moves. The exclusion list and downloadable JSON provide a complete accounting. Source hashes identify the position review, family rules, and locked assessment inputs. No private transcript cache, API credentials, or unpublished model outputs are copied into the browser snapshot.

## Resolved legacy panels

The October 8 revision 2 closes all 16 pending position cases. The evidence and decisions are recorded in [the review record](reviews/2026-10-08-r2.json). All 16 remain excluded: their grouped legacy assessments have no locked move identifiers or compatible dimension records; several also lack a clear religious-versus-skeptical position pair. Their original published scores remain available on their debate pages. The included set and all chart values remain unchanged. A future inclusion would require a compatible assessment and a fresh eligibility review, not merely a label change.

## Page location

The complete chart view is embedded in Backend in place of the former research-paper library. Research papers remain on Insights. The old `/charts/` route forwards browser visitors to Backend while preserving query filters and section anchors; its static fallback remains readable and identifies Backend as the canonical page. The chart snapshot and manual refresh process are unchanged.
