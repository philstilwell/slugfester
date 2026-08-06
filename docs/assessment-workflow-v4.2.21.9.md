# Slugfester Generalized Partition Lane v4.2.21.9

This stage replaces the hardcoded Debate 99 partition front end with a debate-independent, deterministic source-discovery transport. It makes no model or audio call, derives no score, and authorizes no assessment execution.

The repository greedily packs complete timestamped source rows under both an event ceiling and a byte ceiling. Each chunk has a nonoverlapping owned core plus forty rows of boundary context when available. Core ranges cover every transcript event exactly once. A discovery candidate is owned by the chunk containing its start event; it may extend into that chunk's locked lookahead so a boundary-spanning argument is not truncated. Lookbehind may inform interpretation but can never originate a candidate.

Chunk discovery is score-blind. It emits source spans and semantic candidate metadata, but no ratings, sections, scores, evidence quotation, or `moveKind`. The repository validates exact source replay, rejects future or same-side local targets, derives `moveKind` solely from response intent, qualifies candidate IDs by chunk, and performs no silent semantic deduplication.

The partition front end feeds the already-passed consensus back end: candidate-grounded Pass A, an isolated Pass B over Pass A's locked inventory, deterministic disagreement extraction, audio verification of selected medium-confidence moves, dispute-only adjudication, deterministic final ledger, and one score pass after adjudication. Before held-out execution, a new candidate-grounded Pass A output shape must structurally enforce four-to-six sections and one-to-two moves from each side in every section. The failed v4.2.12 lean section shape is not reused.
