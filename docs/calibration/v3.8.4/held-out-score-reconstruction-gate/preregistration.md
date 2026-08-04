# v3.8.4 held-out score and reconstruction gate preregistration

## Purpose

This calibration gate tests the first complete path from a verified local transcript through source coverage, adjudicated burden contact, adjudicated scoring judgments, repository-derived scores, participant assessment prose, Overall Commentary, AI Extension, and rendered accordion behavior.

It uses the three dyadic debates already opened for v3.8–v3.8.3: Debates 103, 55, and 161. It makes no production edits and does not inspect a new held-out debate.

## Coverage correction

The v3.8.3 gate classified 12 deliberately sampled moves, four per debate. That sample passed its burden-contact repeatability test but cannot support a complete scorecard. The v3.8.2 source work proposed only eight seed moves per debate and was optimized for category-balanced selection rather than full assessment coverage. In particular, some accepted route bridges and direct replies have no seed move.

The v3.8.4 gate therefore fails closed before scoring unless a committed coverage lock shows:

- every accepted motion, central, and subsidiary bridge has a representative source move or an explicit consequential-omission record;
- every load-bearing constructive line, major direct reply, material concession, and consequential omission needed for the assessment is represented;
- every move has an atomic excerpt, context window, proposition, speaker, side, source span, attribution confidence, response targets when applicable, and source-review provenance;
- every medium- or low-confidence attribution is successfully audio verified;
- the scorecard layout contains 4–7 coherent sections, each move appears exactly once, every scored section contains at least one move from each side, section weights are positive integers totaling 100, and move importance is 1–3; and
- coverage, section weights, and move importance are locked before any scoring judgment is visible.

The 12 passed v3.8.3 tuples are immutable seeds when their moves survive coverage review. Every additional move must pass the same complete-state burden-contact protocol before scoring.

## Model and independence

All semantic and prose contexts use the exact user-facing label `5.6 Sol` with high reasoning through ChatGPT subscription authentication. API keys are removed. Each debate receives:

- isolated source preparation/review and dispute-only resolution for coverage additions;
- two isolated burden-contact passes plus a disputed-tuples-only adjudicator for every added move;
- two isolated scoring-judgment passes using the same closed schema;
- one isolated scoring adjudicator receiving only deterministically disputed fields and two anonymous candidates; and
- one isolated reconstruction context after the final calculated ledger locks.

The two initial scoring passes have equal standing. The adjudicator may choose only one of the two disputed candidates. It cannot supply a third value or inspect nondisputed fields. Rationale and evidence wording differences alone do not create a score dispute.

## Disagreement rule

A scoring dispute is created when:

1. response classes differ;
2. any scalar judgment differs by more than 5 points;
3. the diagnostic move totals calculated privately from the two closed passes differ by more than 4 points, in which case every unequal scalar in that move is exposed; or
4. burden-adjustment value or eligibility semantics differ.

Equal categorical fields copy directly. Scalar differences of 5 or less are nondisputed and merge to the rounded mean. A disputed field takes the adjudicator-selected candidate. Every merge preserves both raw passes and the dispute record.

## Scoring boundary

Initial score passes contain seven raw judgments per move but no calculated score. They may not emit combined calibration/charity, move totals, section totals, overall totals, ranges, winners, critiques, tags, Overall Commentary, or AI Extension material.

The repository calculator runs only after the complete scoring lock validates. It combines calibration and charity, then computes move, section, overall, and diagnostic pass totals using the frozen v3.8.4 formulas. A model-supplied calculated total is an invalid artifact, not a value to correct.

## Composition boundary

Composition is authorized only if every pre-composition threshold passes. One isolated reconstruction context per debate receives the final ledger and source packet, not a legacy scorecard. Deterministic QA enforces score identity, source move IDs, summary and critique limits, Overall Commentary minimums, representative-quote verification, tag timing, AI Extension novelty, balanced structure, byline, placement, default-collapsed state, distinct styling metadata, and prohibited-language absence.

Calibration previews must use the production rendering path without changing `src/data/debates.js`, production ledgers, rankings, or generated SEO pages.

## Frozen thresholds

| Gate | Requirement |
| --- | ---: |
| Source chains | 3/3 valid |
| Required medium/low audio checks | 100% verified |
| Coverage audits | 3/3 pass |
| Accepted bridge coverage | 100% represented or omission-recorded |
| Sections | 4–7 per debate |
| Valid initial score contexts | 6/6 |
| Contaminated contexts | 0 |
| Model-supplied calculated totals | 0 |
| Mean absolute scalar delta | ≤ 5 |
| Material scalar-dispute rate | ≤ 0.25 |
| Unresolved score fields | 0 |
| Nondisputed-field mutations | 0 |
| Maximum diagnostic overall pass delta | ≤ 5 |
| Diagnostic winner agreement | 3/3 |
| Spearman correlation across six side/debate totals | ≥ 0.90 |
| Burden-adjustment exclusion violations | 0 |
| Calculator/ledger mismatches | 0 |
| Complete reconstruction artifacts | 3/3 |
| Score/prose identity | 100% |
| Representative-quote verification | 100% |
| AI Extension novelty coverage | 100% |
| AI Extension structural balance | 3/3 |
| Accordion/byline/placement metadata | 3/3 |
| Prohibited-language hits | 0 |
| Desktop/mobile/keyboard/reduced-motion checks | all pass |
| Metered model API cost | $0 |
| Transcription cost | $0 |

## Transport, time, and cost

The gate reuses three locally saved full transcript chains and public source audio. It permits no paid transcription and no metered model API. The estimated marginal financial cost is therefore $0.

The live execution is expected to require roughly 18–30 isolated subscription contexts, depending on coverage and disagreement volume. At prior observed Sol runtimes, the likely wall-clock range is 4–10 hours with bounded same-request recovery. Before live execution, a separate phase lock must freeze context counts, timeouts, recovery limits, packet hashes, and exact allowlists.

## Stop rules and authorization

This preregistration authorizes only deterministic packet, schema, fixture, validator, and phase-lock construction. It does not authorize a v3.8.4 model call, numerical participant score, prose artifact, benchmark mutation, production mutation, ranking change, ten-debate gate, or all-195 rollout.

After an execution phase lock is committed, live work proceeds in order. A failed coverage or classification phase blocks scoring. A failed scoring threshold blocks composition. Any failed hard gate blocks ten-debate authorization. Thresholds and sample membership may not change after outputs are visible.

A complete pass may authorize only preregistration of a disjoint ten-debate end-to-end consistency gate. The editor must explicitly accept that later result before corpus-wide production begins.
