# v3.6 decision-card fixture assessment

## Outcome

**FAIL — stopped during retired fixture validation.** The four schemas and synthetic suite passed, but the first retired validation run found an ambiguous exact evidence string. No model, transcription, held-out material, score, or production object was used.

## What passed

- Closed and recursively typed schemas: **4 of 4**.
- Valid synthetic cards accepted: **11 of 11**.
- Invalid semantic mutations rejected for the preregistered reason: **8 of 8**.
- Retired fixture generation completed for 13 cases, 39 family cards, and 2 burden-conflict cards.

## Failure

In Debate 62 case 09, the frozen gold span `I was convinced of the resurrection` occurs twice in the source excerpt. A model card supplies text rather than offsets, so that string cannot identify which occurrence supports the component and scope decisions. The validator correctly rejected it as non-unique.

An audit of every frozen gold span found no other duplicate evidence string. The problem is therefore narrow, but weakening the uniqueness rule would reintroduce ambiguous evidence provenance.

## Recommended correction

Preserve the v3.6 card schemas and uniqueness rule. Add a deterministic fixture normalizer that expands a non-unique frozen span to the shortest unique word-boundary context containing the original occurrence. Bound the expanded context to 160 characters and fail if no unique context exists. Models should likewise return enough surrounding exact text to make their cue unique; the compiler should still calculate offsets.

Because the v3.6 rules and hashes were already frozen, implement this as v3.6.1 rather than altering the failed gate in place. The remote schema smoke test remains blocked until v3.6.1 passes.
