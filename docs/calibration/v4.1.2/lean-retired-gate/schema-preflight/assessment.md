# v4.1.2 exact-schema endpoint preflight assessment

Status: **failed; retired primary gate not authorized**

The one frozen synthetic 5.6 Sol/low attempt completed without timeout in 156.343 seconds (2.61 minutes). It returned the requested four sections, eight nested moves, complete route tiers, and no model-supplied chronology or calculated totals. Deterministic validation then rejected the artifact.

## Failure

`con-lease-alternative` was classified as `partial-answer`, but both of its two declared target components were marked `contacted: true`. The closed response anchor requires a partial answer to contact at least one but not every indispensable component. With every declared component contacted, the tuple must instead use a compatible response class or represent the genuinely missed indispensable component explicitly.

The validator stopped at:

```text
moves[3]: partial answer must contact some but not all components
```

This is a model-output contract failure, not a chronology failure. The repository did not normalize the class, add a missed component, or retry the context.

## Execution facts

- Attempts: 1
- Retries: 0
- Valid synthetic contexts: 0
- Model: 5.6 Sol
- Reasoning effort: low
- Metered API cost: $0
- Transcription cost: $0
- Output SHA-256: `2abb1afbf9b6fb388dafc175a12473d998506a62e02476fd57ba197830fe58e5`

## Consequence

v4.1.2 remains a failed prospective branch. It does not authorize the retired three-debate primary gate, score derivation, or production mutation. A later protocol may add an explicit pre-submission response-tuple consistency checklist, but any such amendment must receive a new identity and pass its own frozen preflight.
