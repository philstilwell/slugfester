# v4.2.6 retired-completion failure assessment

Debate 106 returned a clean first-pass output in 5.25 minutes, and every excerpt satisfied the 450-character and 12–100-token rules. Deterministic validation rejected two out-of-order placements. Sorting only in memory for diagnosis exposed a second violation: section 4 contained three pro moves, above the one-or-two limit.

The raw output is preserved and was not normalized. The failure shows that chronology-first prose and a top-level array do not reliably enforce cross-item ordering or per-section side cardinality. Silent reordering would solve only one violation and cannot decide which substantive move to omit or relocate.

The next development step is one bounded, score-blind AI correction pass. Deterministic code extracts the violations; an isolated Sol/low correction context receives the immutable raw output, full compact source, packet, rubrics, and schema, but no scores, legacy material, other judgments, or publication prose. It may change only the reported fields and their necessary dependents. The corrected whole output must pass every validator. No second correction is allowed, and repair incidence and runtime enter the 195-debate projection.
