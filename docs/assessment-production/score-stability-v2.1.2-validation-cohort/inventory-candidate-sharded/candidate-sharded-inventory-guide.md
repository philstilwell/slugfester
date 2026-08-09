# v2.1.2 candidate-sharded inventory contract

## Scope

This contract governs the score-blind inventory stage for the fresh v2.1.2 validation cohort. It prepares a three-context inventory route for each debate without executing any model, deriving any score, promoting the proposed score-stability policy, reclassifying a failed predecessor gate, or authorizing production mutation.

The complete passing v2.1.2 discovery bundle is the only candidate source. Every discovered candidate remains present. The repository may project that bundle into lossless transports, but it may not silently deduplicate, semantically repair, rewrite, truncate, relocate, or delete a candidate.

## Preserved execution boundary

Any later inventory execution remains bound to:

- model label `5.6 Sol`;
- model slug `gpt-5.6-sol`;
- reasoning effort `low`;
- ChatGPT-subscription authentication with API keys removed;
- score blindness and the complete assessment isolation rules;
- one fresh isolated context for each stage;
- inventory concurrency of at most two;
- one attempt per context, with no retry or timeout extension; and
- fail-closed treatment of any invalid output, hash mismatch, contamination, or missing section-side coverage.

## Three isolated stages

### 1. Candidate-census plan

The planner receives one inventory source packet, the complete candidate census, this guide, the inventory manual, and the strict plan schema. The census preserves every candidate ID, side, speaker, chronology, proposed proposition, response intent, load-bearing metadata, and context summary. Only the source-evidence excerpt and its `sourceExact` flag are deferred to the side selectors.

The planner may write only the two burden routes and four to six weighted issue sections. Candidate selection, ratings, response topology, scores, winners, legacy assessments, other debates, other judgments, execution metadata, and publication prose are unavailable.

### 2. Pro candidate-evidence selection

After the planner output independently passes schema and deterministic validation, a new isolated selector receives the immutable plan, the inventory source packet, every original model-visible candidate field for the pro side, this guide, the inventory manual, and an exact schema bound to the plan hash. It cannot see con candidate evidence, the con selector output, or planner execution metadata.

### 3. Con candidate-evidence selection

A separate new isolated selector receives the corresponding con-only evidence and the same immutable plan. It cannot see pro candidate evidence, the pro selector output, or planner execution metadata.

Each selector must map every candidate on its side to either `null` or one nomination containing an immutable `sectionId`, a priority tier, a unique move ID, a move kind, and a source-grounded proposition. Every section must receive at least one nomination from each side.

## Packet-freezing dependency

The plan contexts can be frozen before any model call. Exact side-selector schemas and copied-input hashes cannot be frozen until the accepted plan exists because each schema binds the canonical immutable-plan hash and enumerates its section IDs.

Therefore the preparation checkpoint freezes:

- the ten exact planner source packets, censuses, and schemas;
- the twenty complete mutually isolated side transports;
- the deterministic schema-generation and validation code;
- maximum-plan side-schema prototypes used only to prove transport bounds; and
- the requirement for a second model-free freeze before any side-selector call.

Prototype schemas are not executable selector schemas and cannot authorize a model call.

## Deterministic reduction and compilation

Selectors may nominate more than two candidates for a section. The repository retains at most two candidates per section and side by this frozen order:

1. priority tier: `essential`, then `strong`, then `supporting`;
2. source start event;
3. source end event; and
4. qualified candidate ID.

Every deferred nomination remains in the reduction audit. The repository then merges the two side maps, restores validator-only evidence from the hash-locked full evidence bundle, compiles the locked inventory, and replays all uniqueness, source, chronology, section-coverage, and schema checks.

The one medium-attribution discovery candidate in Debate 73 is not audio-verified during preparation. If it is retained in the locked inventory, the existing rule requiring later audio verification remains mandatory.

## Score boundary

No inventory input or output may contain a rating, response class, target topology, score, total, winner, legacy assessment, Overall Commentary, or AI Extension. Scores remain a later one-pass repository calculation over a fully adjudicated ledger.

The user accepts genuine ties after integer rounding. That instruction remains recorded as the unpromoted v2.1 proposal; it does not alter or retroactively pass any failed v1, v2, v2.1, or v2.1.1 gate.
