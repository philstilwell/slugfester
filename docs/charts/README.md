# Charts snapshots

The `/charts/` page is an explicitly refreshed view of saved, published assessments. It does not call a model or rescore debates. The page is part of the existing static site and uses its native HTML, CSS and SVG presentation, with no external chart library or runtime service.

## Refresh

1. Review new debate positions in `position-review.json`. `pro` or `con` identifies the side supporting the religious claim; `null` excludes a debate and should have an explanatory entry. Unreviewed debates are excluded visibly. Debate 1–226 assignments reuse the corrected research taxonomy by stable debate ID.
2. Review the phrase rules in `src/data/chart-definitions.js`. These are descriptive browsing labels, not semantic verdicts; the public method states this explicitly. Multiple matches are retained. Scope is the main question of a debate, not a claim that all its moves concern only that question.
3. Run `npm run charts:build -- --date=YYYY-MM-DD` using the intended publication date in the user's time zone. It writes the current browser snapshot and a dated archive. The builder checks each published move against the locked ledger, uses the recorded constructive/reply/concession classification, and reads or deterministically reconstructs the six existing dimension values.
4. Run `npm run charts:check`, `npm run seo`, and `npm run site:preflight`, then review the Charts page on desktop and phone. Run the Charts browser tests when behavior changes. Inspect examples from every family, coverage, exclusions and generation filters before publishing.
5. Commit and publish the reviewed site. Preserve earlier snapshot archives. Use `--replace-same-date` only to correct a snapshot that has not been published.

Ordinary assessment publication, SEO generation and validation **do not refresh the charts**. Validation checks the archived snapshot internally, not against subsequently changed live scores. The linked assessments may be corrected after a snapshot; that limitation is visible on the page.

## Measures

- Frequency: distinct debates with at least one unique assessed move in a family and position, divided by all eligible debates in the selected scope/generation. Families overlap, and shares are not additive.
- Scores: average unique move scores within each debate/position/family, then report the median and interpolated 25th/75th percentiles across debate averages. The interval is observed spread, not inferential uncertainty.
- Case/reply: average unique move scores within each debate/position/family/role, then the equal-debate mean. Groups can contain different debates. Concessions are omitted only from this comparison.
- Dimensions: fraction below 70 within each debate/position/family, then the equal-debate mean. Raw counts remain in cell accessibility labels. This is an operational threshold, not a causal diagnosis.
- Speakers: distinct attributed names in the relevant assessed moves. Frequent speakers can still influence multiple debates; no independent-sample or significance claim is made.

The 2026-10-08 snapshot covers 226 of 300 published debates and 5,405 unique moves. The exclusion list and downloadable JSON provide a complete accounting. Source hashes identify the position review, family rules, and locked assessment inputs. No private transcript cache, API credentials, or unpublished model outputs are copied into the browser snapshot.
