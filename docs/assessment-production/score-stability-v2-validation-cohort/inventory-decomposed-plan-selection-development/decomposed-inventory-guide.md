# Decomposed score-blind inventory protocol

This development protocol separates inventory planning from candidate selection without changing the final locked-inventory semantics.

## Plan contract

The planner receives one debate's packet and complete lossless candidate transport. It authors only:

- one burden route per side and the route bridges;
- four to six weighted issue sections totaling exactly 100 percent; and
- score-blind isolation and audit assertions.

Candidate selection, ratings, response topology, burden contact, scores, winners, legacy assessments, publication prose, and other debates remain unavailable. The repository validates the plan, freezes its canonical SHA-256 hash, and closes the planner context.

## Selection contract

A fresh selector context receives the immutable plan, complete lossless candidate transport, and no planner execution metadata. It authors only `candidateSelectionsBySide.pro` and `candidateSelectionsBySide.con`:

- every repository-owned candidate key is required exactly once under its fixed side;
- `null` means unselected;
- selected values contain only `sectionId`, `moveId`, `moveKind`, and `proposition`;
- `sectionId` is restricted to the immutable plan's section IDs;
- side and within-side order are never model-authored; and
- the selector must choose 8–24 candidates total, with one or two from each side in every section.

The selection output must repeat the canonical candidate-transport hash and immutable plan hash. Repository code rejects any hash mismatch, missing or relocated candidate key, duplicate move ID, invalid section-side cardinality, score-like field, or reply without an earlier selected opponent.

## Deterministic composition

Repository code alone recomposes the plan and selection into the existing side-partitioned proposal, derives within-side order from chronology, restores full evidence, and compiles the locked inventory. Neither stage may repair the other, retry, extend the timeout, reuse a failed-gate output for acceptance, or proceed to scoring.
