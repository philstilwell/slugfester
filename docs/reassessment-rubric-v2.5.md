# Slugfester Reassessment Rubric v2.5

This classification-only rubric supplies operational tests for the derived v2.5 annotation model. It does not authorize numerical scores. If a later numerical gate is authorized, the v2.4 numerical weights, ranges, calibration/charity controls, burden-residual exclusion, and calculator ownership remain unchanged.

## Component contact

Mark a target component `addressed` only when the atomic act accepts, denies, distinguishes, qualifies, explains, or undermines that exact component. Topic overlap, rhetorical pressure, a promise to answer later, or a bare clarification request is `not-addressed`.

`targetPreserved` is false when the act changes the claim's object, strength, modality, comparison class, or burden. It remains true when the act disputes the claim directly, even badly. `relevantContraryMaterial` is used only when no component is addressed and records material relevant to the actual preserved target.

## Diagnostic primitives

Choose `defectType` only for a defect actually identified in the move:

- `contradiction`: jointly incompatible commitments are identified;
- `missing-premise`: a required bridge is identified as absent;
- `ambiguity`: an unstable term, scope, referent, or distinction is identified;
- `invalid-inference`: the stated conclusion is said not to follow from the stated basis;
- `unsupported-comparison`: the move identifies a missing rival, baseline, or comparative warrant;
- `other`: a comparably explicit structural defect not covered above; or
- `none`: no qualifying defect is identified.

The defect phrase must state or unmistakably name the defect. `targetImpactExplicit` is true only when the move also states why the defect blocks, weakens, or changes the target inference. A listener being able to infer the impact is insufficient; cite the phrase that expresses it.

## Reframe primitives

`malformedDemandExplained` is true only when the act explains why the original demand is wrongly framed, impossible as stated, reversed, overstrong, or directed at the wrong question. Disagreement, qualification, or ordinary term clarification alone is false.

`replacementDemandStated` is true only when the act states the demand, standard, or question that should replace the original. The replacement need not be answered. Both positive primitives require exact phrases.

## Burden bridge contact

Use only the locked primary route and eligible bridges. Mark a bridge contacted only when the act supplies, attacks, concedes, or distinguishes that bridge. Choose `supports` when the act builds the route and `attacks` when it challenges the adopted route. Do not promote a subsidiary bridge because it is rhetorically important, or demote a central bridge because the evidence is weak. Tier is inventory-locked.

No contacted eligible bridge means topical-peripheral. A null primary route means unadopted-or-irrelevant. The highest contacted tier mechanically determines the derived relation.

## Evidence discipline

Positive mechanism primitives require the shortest exact phrase that supports the judgment. Character offsets are zero-based and end-exclusive. Do not cite the target packet, another speaker, or transcript context outside the atomic move.

## Numerical continuity if later authorized

Derived coverage would constrain responsiveness exactly as in v2.4: constructive `0–100`, full `80–100`, partial `55–79`, relevant-nonanswer `50–69`, substitution `0–49`.

Derived burden relation would constrain relevance/burden exactly as in v2.4: completes `90–100`, advances-central `80–89`, advances-sub-burden `70–79`, topical-peripheral `50–69`, unadopted-or-irrelevant `0–49`.

Diagnostic and reframe remain descriptive and never add or subtract points.
