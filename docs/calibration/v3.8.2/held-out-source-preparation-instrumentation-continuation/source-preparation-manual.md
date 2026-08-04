# v3.8.2 source-preparation instrumentation continuation manual

This calibration-only continuation repairs the v3.8.1 transport instrumentation defect without changing its semantic source-preparation contract. It is AI-only and uses 5.6 Sol at high reasoning through ChatGPT subscription authentication with API keys removed.

## Immutable proposal reuse

The three v3.8.1 raw proposals and deterministic enrichments are reusable only when their exact paths and SHA-256 hashes match the v3.8.1 failure record and each raw proposal freshly passes the frozen v3.8.1 validator. No proposal regeneration, normalization, candidate substitution, score, or assessment prose is permitted.

## Independent review

One isolated review context is run per debate. The reviewer receives the full local transcript and event chain plus a review packet that exposes source spans and deterministic route/bridge identities while hiding proposal speaker labels, sides, propositions, confidence judgments, contacts, and rationales. It independently reviews every route, bridge, candidate, attribution, and provisional contact in packet order.

For a non-null contact, the reviewer copies exactly one `bridgeId` from the packet and emits only `polarity` plus `bridgeId`. It does not score either participant or write an assessment.

## Disagreement and adjudication

Proposal-review comparisons are extracted deterministically field by field. If a debate contains disagreement, one isolated third context sees only those disputed fields with the two initial values anonymized and rotated. It must select one supplied option per field and cannot add a third value. Final source fields require two matching votes.

## Attribution and audio

Audio verification is mandatory for every move whose attribution confidence is below high in either initial judgment or after adjudication. An unresolved audio check excludes the move. No final move selection occurs for a debate while one of its required audio checks is pending.

## Transport instrumentation

Each model context receives one inference attempt and no output retry. A same-request transport retry is counted only from an anchored `WARN codex_core::responses_retry` line and records its timestamp, turn ID, ordinal, and maximum. Ordinary words such as “reconnection,” “presume,” or “resumes” never count. Each invocation has a 60-minute wall-clock timeout. Review and adjudication phase locks hash every file actually supplied to their model contexts plus completed upstream evidence; future outputs are excluded.

## Boundary

A passing source-preparation continuation may authorize preregistration of classification-packet construction only. Burden-contact classification model execution, participant scores, Overall Commentary, AI Extension, benchmark changes, production changes, and rollout to all debates remain unauthorized.
