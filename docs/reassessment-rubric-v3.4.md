# Slugfester Reassessment Rubric v3.4

Version 3.4 governs classification only. It inherits the scoring anchors of v2.1 but does not select or expose participant-performance scores.

## Responsiveness and component contact

Start each component at `false`. Set it to `true` only when the response does at least one of the following to that exact proposition: asserts it, explicitly denies it, restricts it, distinguishes it, explains it, or challenges its warrant.

An explicit global assent may contact multiple components only when its wording clearly ranges over the complete locked target as stated. A generic “yes,” praise for one example, broad thematic agreement, worldview compatibility, or discussion of a neighboring claim does not distribute automatically across components. If the response immediately narrows, distinguishes, or redirects the target, classify components individually.

Partial answers receive credit only for the components actually contacted. Do not infer contact with omitted components from topical proximity or from the response's overall conclusion.

Original target contact is `true` when at least one locked component is contacted or the response otherwise expressly takes up the locked proposition. It is not satisfied by a merely adjacent topic.

## Connected example and contrary material

Start `connectedExample` at `false`.

- `distinct-connected-example`: the response introduces a new case, analogy, counterexample, model, or illustration that bears on the locked target.
- `inside-locked-target`: the cited material merely repeats or discusses an example already contained in the locked target; it is not a connected example.
- `none`: no qualifying example is present.

Start `relevantContraryMaterial` at `false`. It may be `true` only when no locked component is contacted and the response supplies material that bears against the target. If any component is contacted, contrary material is excluded mechanically.

## Scope

Start scope at `same`.

- `narrowed`: the response explicitly restricts the range, domain, quantifier, or application of the target.
- `strengthened`: it explicitly expands or intensifies the target.
- `modality-shift`: it changes necessity, possibility, certainty, probability, or an equivalent modal force.

A different reason, autobiographical route, example, emphasis, or vocabulary is not a scope shift by itself.

## Diagnostics

Start `defectType` at `none` and `consequenceStated` at `false`.

First decide whether the response explicitly marks a defect in the opponent's reasoning or framing. Only then choose the first expressed eligible label:

- `attribution-error`
- `contradiction`
- `ambiguity`
- `scope-mismatch`
- `unsupported-comparison`
- `missing-premise`
- `invalid-inference`
- `evidential-insufficiency`
- `irrelevance`

Charitably prefer the narrowest label licensed by the speaker's words. Do not convert an alternative view, unexplained disagreement, change of emphasis, or mere negation into a defect diagnosis.

A positive consequence requires a separate clause that states what inferential failure follows from the identified defect. The consequence clause must be textually distinct from the defect cue and linked to it. Restating the objection, announcing disagreement, or supplying only the defect label is insufficient.

## Reframing

Start both fields at `false`.

`malformedDemandExplained` is `true` only when the response explains why the governing question, demand, comparison, or success condition is defective. A new topic or preferred emphasis does not suffice.

`replacementDemandStated` is `true` only when the response states an alternative governing question, demand, or success condition. It may be true without a malformed-demand explanation only when that replacement is explicit.

## Burden relevance and exclusion

Burden adjustment starts at `retained`. Reassignment or replacement requires explicit burden language or an unmistakable replacement of who must establish what; a counterargument, denial, question, or reframing alone does not move the burden.

Burden contact starts at `none`. Select the highest eligible bridge the response expressly supports or attacks. Topical relation, component contact, and rhetorical force are not enough. The evidence must bear on the bridge's inference, not merely on one of its subjects.

Shared raw burden values are excluded from v3.4 review-based override. Only a raw burden disagreement may be resolved, and it is resolved by the preregistered Terra arbiter under the same exact-evidence rule.

## Charity

Apply the strongest interpretation that the actual words reasonably support, while preserving the distinction between what is implied conversationally and what is asserted for scoring. Charity can resolve ambiguity within a licensed category; it cannot invent a missing component, diagnostic cue, consequence clause, replacement demand, or burden bridge.

## Coupled invariants

- Nondefault values require exact evidence; defaults require null evidence.
- `connectedExample=true` requires `distinct-connected-example`.
- `relevantContraryMaterial=true` requires zero contacted components.
- `defectType=none` requires no defect cue and `consequenceStated=false`.
- `consequenceStated=true` requires a non-none defect, a separate consequence cue, and a distinct-clause audit.
- A component marked `false` must have contact mode `none`; a component marked `true` must have a positive contact mode.
- No participant-performance score may appear in a classification artifact.
