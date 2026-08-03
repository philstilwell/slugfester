# v2.7 Orthogonal-Target and Diagnostic Annotation Manual

This manual governs the development layer built from the 15 retired v2.6 disagreement cases.

## Decision order

1. Decide target object: same or changed.
2. Decide target scope: same, narrowed, strengthened, or modality-shift.
3. Decide target burden: retained, reassigned, or replaced.
4. Derive target disposition. Do not select it directly.
5. If disposition is preserved, annotate every component operation.
6. If no component is contacted, decide relevant contrary material.
7. For responsive moves only, identify a diagnostic object and defect, then classify impact as none, verdict, or inferential consequence.
8. Derive coverage and diagnostic labels mechanically.

## Boundary rules

- A temporal or strength restriction is scope narrowing, not object change.
- A different explanatory question, comparison class, referent, or subject is object change.
- Reassigning the opponent's demand back to the proponent is a burden change even if the same topic remains visible.
- Same object plus narrowed scope remains component-annotatable and normally includes a qualifying operation.
- Preserved zero-contact material derives `nonanswer`, never `substitution`.

## Diagnostic explicitness

- A defect must point to the target packet or one component.
- “Ignored,” “absurd,” “wrong,” an analogy, or “not good enough” may identify criticism but does not automatically express its inferential effect.
- `verdict` records an expressed negative judgment without a consequence link.
- `inferential-consequence` requires words stating why the target inference, conclusion, or burden fails, weakens, or exceeds its proper scope.
- Constructive moves are diagnostic-not-applicable because they lack a locked opponent target in this classification layer.

## Evidence

All evidence offsets are zero-based and end-exclusive into the responding `sourceExcerpt`. Every non-default target axis, positive component operation, relevant-contrary judgment, non-null defect, and non-none impact requires exact evidence. Derived fields are never hand-selected.
