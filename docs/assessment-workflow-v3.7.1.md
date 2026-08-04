# Slugfester Gold-Blind Benchmark Audit Workflow v3.7.1

This calibration-only workflow audits the 14 disputed semantic fields extracted from the failed v3.7 retired-card comparison. It does not assess debate participants and cannot produce scores, Overall Commentary, AI Extension prose, or production changes.

## Frozen process

1. Preserve the v3.7 packets, outputs, analysis, and retired expected cards unchanged.
2. Present only the disputed field, its source context, and anonymous candidate values. Do not expose whether a candidate came from retired gold, Terra, or Sol.
3. Run two isolated 5.6 Sol passes per debate. Counterbalance option positions between the two passes.
4. Map option IDs to semantic values only after both initial passes close.
5. Deterministically extract disagreements. Run a third isolated 5.6 Sol pass per affected debate, containing only disputed fields and newly counterbalanced option positions.
6. A final semantic value requires two matching votes. A third-pass value that neither initial pass selected remains unresolved.
7. Derive comparison metrics only after the adjudicated audit key is complete. Preserve the 31 uncontested retired fields.

Every model context receives only the workflow, v3.7.1 rubric, audit manual, one debate packet, and its response schema. Other passes, candidate-origin maps, retired labels, v3.7 outputs, prior rationales, participant scores, and production prose are unavailable.

All included speaker attributions are high confidence. If a later audit packet contains a medium-confidence move, retained audio verification becomes a prerequisite before model execution.
