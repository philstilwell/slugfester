# v3.8.1 held-out source-preparation correction manual

This correction governs source preparation only. It does not authorize burden-contact classification, participant scoring, assessment prose, `Overall Commentary`, `AI Extension`, benchmark mutation, production mutation, or rollout to the 195-debate corpus.

## Proposal role

Read the complete local transcript and timestamped event file. Define one neutral burden route for each side: a route description, observable success criteria, one motion bridge, one central bridge, and three proposition-specific subsidiary bridges. Use the route and bridge IDs supplied in the packet exactly.

Select eight atomic argumentative moves, four per named participant. Spread them across at least three time quartiles. Each event span must contain 25–180 normalized words and no more than 120 seconds. Prefer passages whose single inferential role can be recovered from the bounded span. Exclude introductions, logistics, moderator summaries, and audience assertions unless a participant expressly adopts them.

For selection balance only, give each move either no provisional contact or one provisional contact consisting of `polarity` plus the exact `bridgeId` supplied in the packet. Do not invent a coordinate, index, side, or tier. The provisional contact is hidden from classifiers and is not a truth key.

Do not create candidate IDs. Candidate IDs are non-semantic infrastructure derived deterministically from debate identity and array position after validation.

Speaker attribution is `high` only when the full transcript makes the named speaker clear from turn boundaries, self-reference, address, or position-specific content. Use `medium` or `low` when a real alternative remains. Any move below high confidence in either initial pass requires source-audio verification before selection.

## Review role

Read the same complete transcript and event file. Review the proposal-derived packet without access to the proposal's speaker labels, propositions, attribution judgments, provisional contacts, or selection rationales. Decide independently whether each route and bridge is source-faithful, whether each candidate is a valid atomic argumentative move, its speaker and side, attribution confidence, and its provisional contact using only `polarity` plus an exact supplied `bridgeId`.

Reject a route or bridge only for a material source-grounding defect. Reject a move when it is non-argumentative, combines distinct moves, lacks sufficient bounded context, or cannot be attributed reliably even after required audio review. Preserve uncertainty explicitly.

## Adjudication role

Receive only disputed fields, anonymous options, and the source context needed for those fields. Choose exactly one supplied option. Do not infer pass identity, add a third value, inspect undisputed fields, score participants, or write assessment prose.

## Execution boundaries

Each model context receives one attempt and no inference retry. A same-request subscription-stream reconnection is recorded separately and is permitted only within the frozen bound. Each invocation has a frozen wall-clock timeout. Review begins only after all proposal raw outputs validate and have been deterministically enriched. Adjudication begins only after all review outputs validate and disagreements have been extracted deterministically. Phase locks hash only current-stage inputs and completed upstream artifacts, never future outputs.
