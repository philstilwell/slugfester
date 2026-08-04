# Slugfester Burden-Contact Integration Workflow v3.8

This model-facing workflow contains invariant process rules only. Gate sample sizes, agreement thresholds, expected category counts, prior outcomes, and authorization decisions are intentionally absent and must not be supplied to assessment contexts.

## Source chain

Every assessed debate must have a locally saved full transcript, timestamped event file, and source manifest whose hashes are verified before review. A move packet contains an atomic excerpt and its exact source coordinates, but both initial reviewers may inspect the same full transcript to resolve local ambiguity, omitted antecedents, speaker identity, or argumentative context.

The debate motion, side labels, explicit route map, and atomic move inventory are frozen before the two assessment passes begin. Source preparation is not a score. Its AI-authored route and move judgments must be independently reviewed, and any disputed preparation field must be resolved before classification packets are locked.

## Attribution and audio

Speaker attribution confidence is recorded for every move. High-confidence attribution may proceed from the verified transcript chain. Medium- or low-confidence attribution requires comparison with the source audio before assessment. If audio does not resolve the speaker, the move remains unresolved and cannot enter an assessment packet.

## Independent assessment

Two isolated 5.6 Sol contexts assess every debate. Each receives the same invariant workflow and rubric, the same locked source artifacts, and a counterbalanced packet of anonymous composite candidates. Neither context may receive candidate origins, provisional labels, another pass's output, legacy assessments, gate thresholds, or prior gate results.

For each move, a reviewer selects one complete burden-contact state: no route contact, support for one exact bridge, or attack on one exact bridge. Contact, polarity, tier, and bridge identity are never elicited as independently combinable scalar fields.

## Disagreement and adjudication

The extractor decodes anonymous option identifiers and compares the complete semantic tuples deterministically. Evidence wording and rationale wording do not create a semantic dispute when the decoded tuples match.

A third isolated 5.6 Sol context receives only cases whose decoded tuples differ, along with the common locked source material needed for those cases. It receives neither initial rationale nor pass identity. It may select only one of the two disputed semantic tuples. A final decision requires two matching votes; otherwise the case remains unresolved.

## Downstream boundary

Scores may be calculated only from a complete adjudicated semantic ledger. Unresolved fields cannot be imputed, averaged, or silently defaulted. Participant assessments, Overall Commentary, AI Extension, benchmark changes, and production-page changes are separate downstream stages and are not outputs of burden-contact classification.
