# v3.8.6 Coverage Span Correction

## Purpose

The fresh v3.8.5 Debate 161 proposal had clean transport and one deterministic validation failure: `addition-01` covered 253 normalized words, above the frozen 220-word atomic-span maximum. This correction does not rerun or reassess the debate.

Exactly one fresh isolated `5.6 Sol` context receives only the failed move's immutable proposition and metadata plus a bounded local timestamped event window. It may choose only `startEvent` and `endEvent` within the original span. The corrected span must contain 20–220 normalized words, last no more than 150 seconds, remain attributable to the same speaker and side, and faithfully support the immutable proposition.

The repository then merges only those two coordinates into the frozen v3.8.5 raw proposal. It proves all other fields byte-equivalent under canonical JSON and reruns the complete v3.8.4 coverage validator to produce a new enriched artifact.

## Boundaries

- Previous Debate 161 proposals other than the single target record are unavailable to the correction model.
- No proposition, speaker, side, role, move kind, response reference, rationale, bridge record, concession record, audit field, score, or prose may change.
- One model context, no model-output retry, 15-minute timeout.
- Transport uses the preregistered v3.8.5 stderr-only detector and 0–2 / 3–8 / >8 classifications.
- ChatGPT subscription authentication; API keys removed; metered API and transcription cost: $0.
- A failure blocks review and authorizes no automatic retry.
- Coverage review model execution, burden classification, scoring, assessment prose, production changes, and corpus rollout remain unauthorized.
