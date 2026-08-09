# Candidate-sharded inventory development contract

## Scope

This document specifies a model-free development contract for a prospective successor to the failed score-stability v2 inventory gates. It does not authorize a model execution, retry, timeout extension, semantic repair, judgment packet, score pass, policy promotion, publication step, or production mutation.

The ten debates in the closed validation cohort may be used only for retired regression, adversarial fixtures, schema construction, and byte measurement. Their quarantined outputs are evidence, not acceptance inputs. Any prospective execution must begin with a newly selected disjoint cohort and a separately frozen preparation and execution boundary.

## Preserved execution boundary

Any future execution remains bound to:

- model label `5.6 Sol`;
- model slug `gpt-5.6-sol`;
- reasoning effort `low`;
- ChatGPT-subscription authentication;
- no API key or metered API fallback;
- score blindness and the complete assessment isolation rules;
- one fresh context for each stage;
- no retries, timeout extensions, or semantic correction of an invalid output; and
- fail-closed gate disposition.

## Three isolated stages

### 1. Candidate-census plan

The planner receives the complete source packet, the complete candidate census, this guide, the assessment manual, and the strict plan schema. The census preserves every candidate, its side, speaker, chronology, proposed proposition, response intent, load-bearing metadata, and context summary. Only the redundant candidate-evidence excerpt and `sourceExact` flag are deferred.

The planner may write only `routes` and `sections`. Candidate selection is unavailable. Scores, ratings, response topology, prior judgments, winner labels, other debates, and execution metadata are unavailable.

### 2. Pro candidate-evidence selection

A new isolated selector receives the immutable plan, the complete source packet, every original model-visible candidate field for the pro side, this guide, the assessment manual, and a strict pro-only schema. It cannot see con candidate evidence or the con selector output.

### 3. Con candidate-evidence selection

A separate new isolated selector receives the same classes of input for the con side. It cannot see pro candidate evidence or the pro selector output.

Each selector maps every candidate on its side to either `null` or one nomination containing:

- an immutable plan `sectionId`;
- a `priorityTier` of `essential`, `strong`, or `supporting`;
- a unique `moveId`;
- a `moveKind` of `constructive` or `reply`; and
- a concise source-grounded proposition.

Every section must receive at least one nomination from each side. A candidate has exactly one map key, so cross-section duplication and position collisions are structurally unrepresentable.

## Deterministic reduction and compilation

Selectors may nominate more than two candidates for a section. The repository, not a model, retains at most two per section and side by this frozen order:

1. `priorityTier`: `essential`, then `strong`, then `supporting`;
2. source start event;
3. source end event; and
4. qualified candidate ID.

All deferred candidates remain recorded in the reduction audit. This is a mechanical bounded-cardinality operation; it does not alter a proposition, invent a candidate, relocate a candidate between sections, or make a semantic correction.

The repository then merges the two side maps, restores validator-only evidence from the complete evidence bundle, compiles the existing locked inventory, and applies every existing uniqueness, source, chronology, section-coverage, and schema check. Any missing section-side coverage, hash mismatch, wrong-side key, duplicate retained move ID, contaminated input, or compiler failure fails the entire gate.

## Binding and isolation

The plan binds both the compact census hash and the full candidate-transport hash. Each selector output binds the full transport hash, its side-specific transport hash, and the canonical immutable-plan hash. Post-plan mutation or cross-side relocation is rejected deterministically.

The plan context does not assert that it reviewed candidate evidence excerpts. Collective complete-evidence review is established only after both side selectors pass and the repository successfully composes their outputs. The compiler never treats a locally valid artifact from a failed gate as a passed gate.

## Score boundary

No score, winner, calculated total, rating, response topology, legacy assessment, or other judgment may appear in any inventory-stage input or output. Scores remain a later one-pass repository calculation over a fully locked final ledger.

The proposed score-stability v2.1 rule accepts any genuine tie after integer rounding and rejects a published opposite-side reversal. Unrounded adjusted totals remain diagnostic. This prospective policy does not alter the frozen v2 proposal, reclassify the failed v1 canary, or promote v2.1.
