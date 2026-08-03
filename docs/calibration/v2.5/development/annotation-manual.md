# v2.5 Derived Annotation Manual

This development manual operationalizes the v2.5 schema. Its 15 examples are the moves containing all 24 disputed v2.4 fields. They are permanently development-only and cannot enter a held-out sample.

## Frozen inventory authority

Copy `interactionMode`, `targetPacketId`, `primaryBurdenRouteId`, target components, eligible burden bridges, and bridge tiers exactly. If one appears defective, report an inventory violation rather than compensating in annotation.

## Coverage primitives

For each responsive target component, mark `addressed` only when the atomic act accepts, denies, distinguishes, qualifies, explains, or undermines it. Otherwise mark `not-addressed`.

Set `targetPreserved: false` only when the act changes the claim's object, strength, modality, comparison class, or burden. A poor direct answer still preserves the target. Use `relevantContraryMaterial` only when the target is preserved and no component is addressed.

The calculator derives coverage. Do not reason backward from a preferred label.

## Diagnostic primitives

Choose a non-`none` defect type only when the move itself identifies the defect. Cite the shortest exact phrase and its character offsets. Then independently ask whether the move explicitly states why that defect blocks, weakens, or changes the target inference. A hearer being able to infer the consequence is not enough; positive impact requires a second exact phrase.

Diagnostic derives true only when defect type, defect evidence, explicit impact, and impact evidence are all positive.

## Reframe primitives

First ask whether the move explains that the original demand is malformed, overstrong, reversed, impossible as stated, or directed at the wrong question. Then separately ask whether it states the corrected demand or standard. Cite exact phrases for each positive.

Qualification, disagreement, terminology clarification, or a competing theory does not by itself satisfy either primitive. Reframe derives true only when both primitives and both evidence phrases are present.

## Burden bridges

The inventory locks one primary adopted route and eligible bridges. Select only bridges the atomic act supplies, attacks, concedes, or distinguishes. Do not choose bridge tier; it is already locked.

The highest contacted tier derives the relation. No contact on a locked route is topical-peripheral; a null route is unadopted-or-irrelevant. Do not import later completion, cumulative repetition, an allied speaker's theory, or a burden the side never adopted.

## Evidence offsets

Offsets are zero-based and end-exclusive. They must satisfy:

`sourceExcerpt.slice(startChar, endChar) === text`

Evidence must come from the selected speaker's atomic excerpt, not the target packet or surrounding transcript.

## Lessons from the v2.4 disputes

1. Separate target preservation from component contact; this resolves partial-versus-substitution disagreements.
2. A diagnosis needs both a named defect and an expressed consequence; merely implying the consequence is insufficient.
3. A reframe needs both a malformed-demand explanation and an expressed replacement; denying a method is not automatically a replacement.
4. Central versus subsidiary status belongs to the prelocked route graph, not classifier intuition about rhetorical importance.
5. Derived labels are audit outputs, never independent choices and never numerical bonuses.

## Final self-audit

- Every inventory lock is copied exactly.
- Every responsive target component appears exactly once.
- Constructive coverage primitives use empty contacts and null applicability fields.
- Every positive mechanism primitive has exact in-move evidence and valid offsets.
- Every contacted bridge is eligible and appears once.
- Every derived label equals the repository derivation library.
- No score, prior assessment, other pass, review artifact, or winner judgment was consulted.
