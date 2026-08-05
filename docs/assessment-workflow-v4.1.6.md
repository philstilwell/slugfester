# Slugfester Bounded Lean Workflow v4.1.6

This prospective amendment inherits v4.0 through v4.1.5. It responds only to the frozen v4.1.5 triggered Pass B timeout. It does not replay, repair, normalize, or count any artifact from the failed context.

## Nonredundant Pass B source access

Every triggered Pass B judge must still read the complete local timestamped transcript. The original complete `events.json` and local source manifest remain mandatory, local, hash-locked, and validator-authoritative, but the judge no longer performs a second complete reading of the duplicative event file.

Before execution, repository code deterministically builds a locked-event ledger from the original events file. For every selected move, the ledger contains every event from the locked inclusive `startEvent` through `endEvent`, plus exactly two available context events before and after that span. Repository validation proves that every row, index, timestamp, duration, and caption text exactly matches the hash-locked original. The model reads this ledger completely alongside the complete transcript, locked Pass B packet, workflow, rubric, and exact output schema.

This source-access change removes redundant caption ingestion; it does not permit transcript sampling, excerpt-only assessment, new argument selection, source-span mutation, or weaker attribution confidence. Medium- or low-confidence speaker attribution still requires audio verification before disagreement extraction.

## Execution boundary

- Pass B remains 5.6 Sol/high, score-blind, fresh, and isolated.
- One attempt per debate and no workflow retry or output normalization.
- The fixed retired order remains 55, 103, 161.
- The per-context timeout increases prospectively from 20 to 30 minutes so one allowed transport recovery cannot consume the entire judgment window.
- A timeout, invalid transport classification, schema failure, semantic failure, or preexisting output fails the gate and blocks later stages.

## Measured Pass B compute gate

The old eight-minute Pass B planning value is retired. After three valid contexts, the central corpus projection uses the measured eligible Pass B mean. If exactly one valid context records recoverable stream events, the eligible mean uses the two transport-clean contexts; otherwise it uses the ordinary three-context mean. At least two transport-clean contexts are required, and more than one recovered context fails timing eligibility.

The conservative Pass B value is the greater of 8.5 minutes and 125% of the eligible mean. The central projection retains the measured v4.1.5 primary mean, and the conservative projection retains its primary floor. Both retain the five-hour audio/QA/rendering allowance and the separate two-hour transport contingency. Central total must remain at most 52 hours and conservative total at most 60 hours.

## Gate identity and inheritance

The passed v4.1.5 exact-schema preflight is inherited because the judgment fields and constraints are unchanged; only protocol constants and source delivery change. A deterministic fixture must prove the version translation and locked-event derivation before a new three-debate gate may be frozen.

Protocol identity:

- `schemaVersion: 4.1.6-triggered-pass-b-output`
- `protocolId: v4.1.6-triggered-pass-b-consensus`
