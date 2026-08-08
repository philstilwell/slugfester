# Production canary packet preparation

## Purpose

Prepare the frozen ten-debate production canary for score-blind source discovery without running a model, accessing audio, deriving scores, or changing published debate records.

## Frozen inputs

- Treat `docs/assessment-production/canary-v1.json` as the authoritative debate selection and source-hash lock.
- Require the production corpus manifest and both governing workflow documents to remain hash-replayable.
- Require each debate's local canonical `transcript.txt`, `events.json`, and `manifest.json` files. Verify every hash recorded by the canary before packet construction.
- Require exactly one frozen substantive speaker per side. Packet preparation stops rather than adapting a multi-speaker source to the dyadic schema.

## Deterministic construction

1. Convert the complete normalized event source to the canonical compact JSONL ledger. Preserve the exact hash of the original event file; project each event to `startMs`, `durationMs`, and `text` for transport, recording any omitted optional metadata such as provisional speaker labels.
2. Partition every ledger into at least two contexts with contiguous, non-overlapping owned cores and bounded repeated context at boundaries.
3. Require exact ownership of every event once, exact replay to the full ledger, and compliance with the frozen event and byte ceilings.
4. Construct one source-only packet per debate. It may contain identity, motion, sides, verified source provenance, ledger transport metadata, and partition metadata only.
5. Construct one output schema per chunk. The schema restricts a candidate's start event to that chunk's owned core, its end event to available context, and its speaker to the two frozen interlocutors.
6. Save full and chunk ledgers only under ignored `.assessment-cache` paths. Commit the packets, plans, schemas, preparation manifest, and their hashes.

## Isolation boundary

Discovery receives one packet, one chunk ledger, one chunk-specific schema, and the frozen discovery manual. It receives no legacy assessment, prior judgment, score, winner, tag, Overall Commentary, AI Extension, or publication prose.

The inherited discovery schema continues to require `calibrationOnly: true`. For the production canary this means *staging-only intermediate output*: no output from this stage is itself publishable or authorized to mutate production. Promotion can occur only after the complete adjudication, scoring, publication, and validation chain passes for that debate.

## Authorization boundary

Successful preparation authorizes only deterministic validation and preparation of a separate discovery-execution manifest. It does not authorize model execution, paid transcription, independent judgment, audio verification, adjudication, score derivation, publication, production mutation, or processing the remaining corpus.

Preparation has no metered API or transcription cost. Any later context execution requires its own frozen manifest and the applicable cost/subscription disclosure.
