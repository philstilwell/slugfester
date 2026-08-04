# v3.8.7 Exhaustive Batch Span Correction

## Basis

The v3.8.5 proposal had clean transport but failed the first atomic-span word limit. The v3.8.6 coordinate correction validly repaired that first span, after which the fail-fast validator exposed another. A new collect-all preflight now mirrors the coverage validator's cross-field rules and reports exactly four issues, all `span-word-count`: additions 01, 02, 03, and 07. Every other audited rule passes.

## Correction

One fresh isolated `5.6 Sol` context receives only the four immutable target records and their bounded local timestamped event windows. It must return one coordinate correction for each target in fixed order. Each selected subspan must stay inside its original span, contain 20–220 normalized words, last no more than 150 seconds, and preserve the immutable proposition.

The repository merges only eight integer fields: `startEvent` and `endEvent` for the four registered targets. Canonical JSON must prove zero noncoordinate mutations. The complete v3.8.4 coverage validator then runs on the merged proposal.

## Frozen boundaries

- The v3.8.6 correction is preserved as failure evidence but is not used as correction input and is unavailable to the model.
- Exactly one model context; no retry; 20-minute timeout.
- Transport classification: clean 0–2, recovered-degraded 3–8, invalid above 8 or unrecovered.
- ChatGPT subscription; API keys removed; metered API and transcription cost: $0.
- Coverage review model execution, burden classification, scoring, assessment prose, production mutation, and corpus rollout remain unauthorized.
- Any correction-schema, coordinate, identity, transport, or complete-validator failure blocks review and authorizes no automatic retry.
