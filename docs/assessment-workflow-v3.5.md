# Slugfester Deterministic Semantic Compiler Workflow v3.5

## Status and scope

Version 3.5 is a classification-only retired-development workflow. It replays the six frozen v3.4 Terra/Sol review artifacts without another model call. It may not score interlocutors, draft assessment prose, open held-out material, or change production debate objects.

The replay has two independent outcomes:

1. the **compiler gate** asks whether every frozen review and replay lock can be serialized as a valid annotation with no case-specific or discretionary repair; and
2. the **semantic-readiness gate** compares replay locks with the already frozen retired gold keys.

Passing the compiler gate does not imply semantic readiness.

## Deterministic compilation

The compiler consumes semantic proposals and exact evidence text. Character offsets are never trusted as decisions: the compiler requires each active evidence string to occur exactly once in the source excerpt and derives zero-based, end-exclusive offsets itself. Missing or non-unique active evidence fails closed.

Duplicated dependent fields are not independent decisions:

- `connectedExample` is derived from `exampleClassification`; `connectionEvidence` supports `distinct-connected-example`, while `boundaryEvidence` is used only for `inside-locked-target`.
- component contact is derived from each component's contact mode.
- original-target contact is true when expressly proposed or when a component, eligible contrary item, nondefault scope, or diagnostic necessarily bears on the locked target.
- relevant contrary material is mechanically unavailable when any component is contacted.
- a consequence is unavailable when the defect label is `none`.
- default and inactive evidence slots are emitted as null.

The only permitted projection changes are these published implications. The compiler has no case-ID table, gold access, fallback annotation, or manual correction path. Any other invalid primitive aborts the replay.

## Atomic diagnostic bundle

Defect label, defect evidence, consequence status, and consequence evidence form one diagnostic bundle. The merge selects the bundle from one source; it may not combine a defect from one source with a consequence from another.

## Conservative replay policy

Raw Pass A and Pass B remain the frozen candidates. Compiled Terra remains the leading arbiter.

- On a raw disagreement, Terra selects a candidate only when its semantic value matches exactly one raw candidate.
- A third semantic value is allowed only for scope or the atomic diagnostic bundle, and only when compiled Terra and Sol independently return the exact same alternative semantic value with valid evidence.
- Otherwise the field is marked unresolved and raw Pass A is retained only as a deterministic diagnostic disposition, not as an accepted adjudication.
- On a raw agreement, the shared value is retained unless both compiled reviews return the exact same eligible alternative. Shared burden adjustment and burden contact are always locked.
- Target/component/contrary dependencies are projected only after all primitive selections, so the final annotation is constructed coherently rather than repaired after validation.

## Evidence and audio gate

The replay reuses the frozen v3.2 source and audio-verification chain. Every medium- or low-confidence move must remain audio verified by hash. No transcription, API, or subscription model execution is authorized.

## Stop rule

The compiler gate requires all six review artifacts, all 26 compiled case annotations, and all 13 replay-lock annotations to validate; every active evidence string must resolve uniquely; source hashes must match; and discretionary repairs, fallback cases, model calls, scoring fields, and production mutations must all equal zero.

The semantic-readiness gate retains the v3.4 thresholds, including zero unresolved disputes. If either gate fails, no disjoint retired model test, held-out gate, scoring phase, or corpus rollout is authorized.
