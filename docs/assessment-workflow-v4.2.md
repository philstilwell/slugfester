# Slugfester Compact Primary-Input Transport v4.2

This development amendment inherits the complete v4.1.9 judgment schema, rubric, source-integrity rules, one-attempt rule, and 30-minute timeout. It changes only how already-locked source and instruction content is transported to the primary model. It responds to the v4.1.9 Debate 180 timeout without retrying, extending, scoring, or reusing that failed context.

## Lossless timestamped source ledger

The plain transcript and normalized events remain stored locally and hash-locked in the source packet. Repository code deterministically compiles the event file into one UTF-8 JSONL ledger. Each line is a JSON array containing exactly:

`[eventIndex, startMs, durationMs, text]`

The ledger must contain every event exactly once in original order. Before a model context is authorized, repository validation must parse every line, verify consecutive indices, replay the complete array to byte-for-value equality with the parsed original events, and verify the ledger SHA-256 frozen in the packet. The model receives this ledger as its complete timestamped transcript. It does not receive a second plain-text copy of the same words.

Source-span indices still refer to the original normalized events. The original event-file bytes—not the transport ledger—remain authoritative for post-output event hashing, excerpt coverage, and repository-owned time compilation.

## Primary-relevant instructions only

The primary context receives the complete v4.0, v4.0.1, and v4.1 rubric files, one consolidated v4.2 primary manual, the source-only packet, the lossless source ledger, and the enforced output schema. It does not receive historical workflow amendments whose sampling, compute, Pass B, adjudication, score-lock, comparison, or publication rules the primary judge cannot act upon.

This instruction reduction changes no anchor, dimension, response class, burden tier, bounded-inventory rule, charity rule, adjustment exclusion, source requirement, or output field. Repository orchestration continues to enforce all downstream workflow documents outside the isolated model context.

## Retired transport smoke

Debate 180 is reused only as the retired long-context stress case because v4.1.9 produced no judgment output for it. The v4.2 smoke cannot count toward any external gate, score, comparator, or production authorization. It passes only if:

1. the compact ledger exactly replays to the original events and all source hashes validate;
2. one Sol/low context completes within the unchanged 30-minute cap with no retry or invalid transport classification;
3. the output passes the unchanged schema-bounded event-aware validator;
4. repository-owned times compile and replay exactly; and
5. measured copied input is materially smaller than v4.1.9.

Only a passed smoke authorizes preparation of a new disjoint source-blind gate using the same transport. Failure is preserved unchanged and returns the workflow to architecture review.
