# Lossless Columnar Candidate Transport

The candidate evidence in `candidate-evidence-bundle.json` is encoded without semantic reduction.

- `columnOrder` lists the original candidate field paths in their exact row order.
- Each entry in `candidateRows` is one complete candidate. Value `candidateRows[i][j]` belongs to field path `columnOrder[j]`.
- Dots in a field path represent the original nested object path, such as `sourceSpan.startEvent` or `candidateEvidence.excerpt`.
- Every discovered candidate and every original model-visible candidate field is present exactly once. Row order matches the original candidate order.
- Treat `candidateEvidence.excerpt` as the source-exact evidence for that candidate and use `qualifiedCandidateId` exactly when selecting it.

This transport changes serialization only. It does not authorize semantic downselection, scoring, response topology, or any field outside the inventory schema.
