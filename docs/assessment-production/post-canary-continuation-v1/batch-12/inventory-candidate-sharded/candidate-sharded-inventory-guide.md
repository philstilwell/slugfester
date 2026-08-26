# Post-canary Batch 12 candidate-sharded inventory contract

## Scope

This contract governs the score-blind inventory stage for Debates 152, 28, 119, 116, 131, 07, 33, 15, 29, and 11 under the active v2.2 score-stability policy. It prepares a three-context route for each debate without deriving a score, preparing an independent judgment, performing audio work, reconstructing publication prose, or changing production.

The passed Batch 12 discovery bundles are the only candidate source. Every discovered candidate remains present. The repository may project candidates into lossless transports, but it may not silently deduplicate, semantically repair, rewrite, truncate, relocate, or delete a candidate. All nonempty Batch 12 source rows contain at least one repository lexical token, and the unchanged twelve-token minimum governs every candidate window.

## Preserved execution boundary

Any later inventory execution remains bound to:

- model label `5.6 Sol`;
- model slug `gpt-5.6-sol`;
- reasoning effort `low`;
- ChatGPT-subscription authentication with API keys removed;
- score blindness and the complete assessment isolation rules;
- one fresh isolated context for each stage;
- inventory concurrency ramp `1 -> 2`, with a maximum of two;
- one attempt per context, with no retry or timeout extension; and
- fail-closed treatment of any invalid output, hash mismatch, contamination, missing section-side coverage, or unresolved cross-side chronology condition.

Integer-rounded ties remain permitted by the active v2.2 policy. No inventory context receives or authors a rating, score, total, or winner.

## Three isolated stages

### 1. Candidate-census plan

The planner receives one inventory source packet, the complete candidate census, this guide, the inventory manual, and the strict plan schema. The census preserves every candidate ID, side, speaker, chronology, proposed proposition, response intent, load-bearing metadata, and context summary. Source-evidence excerpts and their `sourceExact` flags are unavailable to the planner and deferred to the side selectors.

The planner may write only the two burden routes and four to six weighted issue sections. Candidate selection, ratings, response topology, scores, winners, legacy assessments, other debates, other judgments, execution metadata, and publication prose are unavailable.

### 2. Pro candidate-evidence selection

After the planner output independently passes schema and deterministic validation, a new isolated selector receives the immutable plan, the inventory source packet, every original model-visible candidate field for the pro side, this guide, the inventory manual, and an exact schema bound to the plan hash. It cannot see con candidate evidence, the con selector output, or planner execution metadata.

### 3. Con candidate-evidence selection

A separate new isolated selector receives the corresponding con-only evidence and the same immutable plan. It cannot see pro candidate evidence, the pro selector output, or planner execution metadata.

Each selector must map every candidate on its side to either `null` or one nomination containing an immutable `sectionId`, a priority tier, a unique move ID, a source-grounded proposition, a `preferredMoveKind`, and a source-grounded constructive `orphanFallback` with rationale. Every section must receive at least one nomination from each side. The fallback does not rewrite the proposition; it classifies that same proposition as constructive if the preferred reply would otherwise lack an earlier selected opposing move.

## Packet-freezing dependency

The ten planner contexts can be frozen before any model call. Exact side-selector schemas and copied-input hashes cannot be frozen until the accepted plans exist because each schema binds the canonical immutable-plan hash and enumerates its section IDs.

Therefore this checkpoint freezes:

- ten exact planner source packets, censuses, and schemas;
- twenty complete mutually isolated side transports;
- deterministic schema-generation and validation code;
- twenty maximum-plan chronology-fallback schema prototypes used only to prove transport bounds; and
- the requirement for a second model-free freeze before any side-selector call.

Prototype schemas are not executable selector schemas and cannot authorize a model call.

## Deterministic reduction and chronology fallback

Selectors may nominate more than two candidates for a section. The repository retains at most two candidates per section and side by this frozen order:

1. priority tier: `essential`, then `strong`, then `supporting`;
2. source start event;
3. source end event; and
4. qualified candidate ID.

Every deferred nomination remains in the reduction audit. The repository then merges the two side maps in exact source chronology. It preserves each retained `preferredMoveKind` unless that move is a reply with no earlier selected opposing move. Only in that case does it apply the selector-authored constructive fallback. The repository records every applied fallback, restores validator-only evidence from the hash-locked full evidence bundle, and replays the unchanged inventory compiler and all uniqueness, source, chronology, section-coverage, and schema checks.

Earlier failed canary outputs and validation-cohort outputs remain historical evidence only. They are unavailable to every fresh Batch 12 model context.

## Audio and score boundaries

discovery found no below-high-confidence attribution candidates in Batch 12. Any later below-high-confidence attribution introduced or preserved by inventory would require verification before judgment or scoring. This preparation performs no audio work.

No inventory input or output may contain a rating, response class, target topology, score, total, winner, legacy assessment, Overall Commentary, or AI Extension. Scores remain a later one-pass repository calculation over a fully adjudicated ledger.
