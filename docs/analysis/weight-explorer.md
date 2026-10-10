# Interactive scoring-weight comparison

The Insights section at `/insights/#scoring-weights` reweights the **reviewed October 9, 2026 research set**, not the live catalogue. It includes 234 paired religious-versus-skeptical debates (146 earlier-procedure and 88 later-procedure), containing 5,652 scored moves. A move is an argument or reply. The role mapping is the research set's reviewed `theist_side`/`non_side`, never an assumption that PRO means religious.

## Reproduction and refresh

1. `node scripts/build-weight-explorer.mjs` builds the compact browser snapshot from the saved research debate and move data, using the corresponding assessment ledgers for the original section membership and weights. It checks the six default dimension weights against the scoring library, checks move membership and scores, and requires every default final score to match its publication. The generated snapshot includes hashes of its source files.
2. `node scripts/build-weight-explorer.mjs --check` verifies the projection is unchanged. It does not reassess anything.
3. `node --test tests/weight-explorer.test.mjs` tests baseline parity, independent source-based recomputation under alternative weights, role mapping, filtered populations, rounding, boundaries and slider redistribution.
4. `npm run seo` updates initial HTML and coordinated browser import versions. `npm run seo -- --check` verifies the generated files.

For a future research edition, review the new debates' inclusion and positions first, then deliberately update the source directory/date in the builder and the associated regression expectations. Do not silently include new debates or assign roles from speaker identity. No paid model calls are involved in building or interacting with this section.

## Calculation

The sliders are whole-number percentages summing to 100. Adjusting one redistributes the remainder proportionally among the others, with largest-remainder allocation for exact totals. If all other weights were zero, their default proportions are used when weight becomes available again. This is an exploration tool, not a recommendation of extreme settings.

Four presets provide repeatable starting points: current rubric, evidence-focused, logic-focused and reply-focused. Each focused example gives its named area 40%, the other two of logic/evidence/replies 15% each, and relevance/clarity/confidence-and-fairness 10% each. These are illustrative choices, not validated improvements or settings chosen to favor a side. Selecting a preset keeps the chosen assessment group. Manual changes show “Custom weights” unless they exactly match another preset, and reset restores the current rubric. Presets are tested against an independent calculation from the source records.

## Filters and share links

Each projected debate retains its original reviewed `topic` classification, mapped to one of eight stable research-group IDs. These groups are broader than the site's browsing categories. Topic and assessment-procedure filters intersect; their option counts, current results, original-weight baselines and individual debate table all use that same intersection. “Show all debates” clears both filters but keeps weights. “Reset to current weights” resets weights but keeps filters. Selections below ten debates receive a descriptive small-selection warning, not a claim about a statistical significance threshold. Empty intersections have no numerical averages.

Copy-link and browser-address state use `sw=1`, `edition`, `weights` (six ordered integer percentages), `procedure`, and `topic`, with the `#scoring-weights` anchor. Links contain the research edition and only public configuration, never names or unrelated query parameters. Reading validates every field, rejects duplicates and unsupported versions, and rejects weights that do not total 100. Invalid or mismatched-edition links show a warning and restore the full defaults; they do not silently calculate a different intended comparison. Manual copy from a visible read-only URL field is available if browser clipboard access fails. Shared settings require JavaScript; initial HTML explicitly identifies its default all-topic results.

For each move: round the sum of its six recorded dimension scores times their selected fractional weights. Within each side of each section: take the move-importance-weighted average, then round. Combine section scores using original section weights; retain the original burden-completion adjustment, round, and clamp to 0–100. Every debate then contributes equally to both position averages. Average gaps use the unrounded averages of final whole-number side scores; display rounding is two decimal places. Individual outcome changes include transitions to or from a tie.

The browser never alters dimension judgments, importance ratings, sections, adjustments or published scorecards. Earlier and later procedures can be compared separately, but changing weights does not make their judging processes equivalent. Scenario outcomes are not evidence that a worldview is true, that the judge is unbiased, or that the scenario is a better rubric.

Initial HTML contains the default summary and methods with disabled controls, so readers without JavaScript still receive substantive information. JavaScript enables controls and the optional per-debate table. The same renderer and calculation serve both initial HTML and the interactive view. The SEO generator versions nested explorer imports with the rest of the site.
