# Production canary score-blind inventory preparation

## Purpose

Prepare one isolated inventory-locking context for each debate in the frozen ten-debate production canary. This stage organizes the complete discovery output into burden routes, issue sections, weights, and a bounded move inventory. It does not judge performance or derive scores.

## Frozen inputs

- Require the passed production-canary discovery analysis and verify every candidate-bundle and sparse-context hash recorded there.
- Require the source-preparation manifest and verify the source packet, canonical event document, and full compact ledger for each debate.
- Use the score-blind inventory curator manual and the existing deterministic inventory schema and compiler.
- Retain every discovered candidate in the model transport. Do not perform semantic candidate downselection before the curator sees the context.

## Packet construction

For each debate:

1. Re-render one source-exact evidence excerpt for every discovered candidate from the hash-locked canonical event document.
2. Preserve the complete evidence bundle for deterministic validation. Project a smaller model transport that retains every candidate, candidate identity, side, speaker, proposition, source span, burden relevance, response intent, context summary, and source-exact excerpt.
3. Omit validator-owned confidence and excerpt-metric fields from the model transport; restore them only from the hash-locked complete evidence bundle after candidate selection.
4. Build a debate-specific JSON schema whose candidate IDs are restricted to the supplied complete transport.
5. Require the manual, source packet, candidate transport, and schema to remain at or below the proven 115 KB copied-input ceiling.

## Curator boundary

The curator must create exactly one burden route per side and four to six issue sections totaling 100 percent. Each section must select one or two candidates per side, with eight to twenty-four unique selected moves overall. A reply is legal only when an earlier selected opposing move exists in source chronology.

The curator cannot see legacy assessments, independent judgments, scores, winners, tags, Overall Commentary, AI Extension, or other debates. Ratings, response targets, response classes, burden-contact judgments, adjustments, totals, and publication prose are prohibited. The inherited `calibrationOnly: true` field means staging-only intermediate output in this production canary; it does not authorize publication or production mutation.

## Deterministic lock

After a later model execution, repository code—not the curator—will validate the proposal, restore repository-owned candidate fields, order selected moves chronologically, re-render final source evidence, and compile the locked inventory. Any invalid proposal stops its debate; semantic repair and retries are not authorized by preparation.

Selected moves with below-high attribution confidence must be audio-verified before adjudication. Discovery found no such candidates in this canary, but the rule remains mandatory if a later locked source condition changes.

## Authorization boundary

Successful preparation authorizes only deterministic validation and preparation of a separate inventory-execution manifest. It does not authorize model execution, retry, paid transcription, audio verification, independent judgments, adjudication, score derivation, publication, production mutation, or processing the remaining corpus.

Preparation has no metered API or transcription cost. Any later model execution requires its own frozen manifest and cost/subscription disclosure.
