# Slugfester Reassessment Workflow v2.5

This calibration workflow responds to the v2.4 held-out failure by replacing compound binary judgments with observable primitives and calculator-derived labels. It preserves the successful local-source, hashing, atomic-inventory, target-packet, audio, isolation, adjudication, and stop-rule controls.

Version 2 remains the production baseline. v2.5 is classification-only. Passing its fresh held-out gate may authorize preregistration of a complete three-debate numerical gate; it does not authorize the ten-debate gate or corpus-wide reassessment.

## Derived annotation model

Inventory builders lock move boundaries, speaker, side, interaction mode, target components, burden routes, bridge tiers, and each move's primary burden packet before classifiers see the debate.

Classifiers annotate only observable primitives:

1. component-by-component target contact and target preservation;
2. relevant contrary material when no target component is contacted;
3. diagnostic defect type, defect phrase, explicit target-impact judgment, and impact phrase;
4. malformed-demand explanation and replacement-demand statement, each with an exact phrase; and
5. burden-bridge contacts within the locked primary burden route.

Repository logic derives target coverage, diagnostic, reframe, and burden relation. Classifiers record the derived values produced by the fixed rules but may not choose a different result.

## Coverage derivation

Constructive moves derive `not-applicable`.

For responsive moves:

- `substitution` if the target is not preserved;
- `full` if the target is preserved and every indispensable component is addressed;
- `partial` if the target is preserved and some but not all components are addressed;
- `relevant-nonanswer` if the target is preserved, no component is addressed, and relevant contrary material is present; otherwise
- `substitution` if no component is addressed and no relevant contrary material is present.

Coverage remains structural rather than evaluative. An unsound answer may still be full.

## Mechanism derivation and evidence

`diagnostic` derives true only when `defectType` is not `none`, an exact defect phrase is cited from the atomic move, `targetImpactExplicit` is true, and a target-impact phrase is cited. Defect types are `contradiction`, `missing-premise`, `ambiguity`, `invalid-inference`, `unsupported-comparison`, and `other`.

`reframe` derives true only when both `malformedDemandExplained` and `replacementDemandStated` are true and each has an exact supporting phrase from the atomic move.

Every phrase stores exact text and zero-based start/end character offsets into the committed move excerpt. The validator must reproduce the phrase with `sourceExcerpt.slice(startChar, endChar)`.

## Burden-route graph and derivation

Each adopted burden is represented as a route containing bridges with fixed tiers:

- `motion`: the success criterion or decisive defeat of the adopted burden;
- `central`: a bridge on the main route whose completion still leaves a motion-level step; and
- `subsidiary`: a necessary local premise, distinction, or evidential issue.

Each move receives a locked primary burden packet containing one adopted route or `null` and the eligible bridge IDs it could contact. Classifiers select contacted eligible bridges and whether each is supported or attacked.

Burden relation derives by the highest contacted tier: `completes` for motion, `advances-central` for central, `advances-sub-burden` for subsidiary, and `topical-peripheral` when a locked route has no bridge contact. A null route derives `unadopted-or-irrelevant`. No later act, allied speaker theory, cumulative repetition, or unadopted contrary burden may be imported.

## Atomic inventory and review

Each debate contains exactly 12 chronological single-speaker acts: the first two load-bearing constructives per side and eight responsive acts drawn from successive chronological quarters. Each side contributes at least four total moves. Move excerpts are exact 30–90 word spans; responsive targets are exact prior 15–90 word spans.

Speaker attribution must be high confidence or successfully audio-verified. Medium- or low-confidence candidates without local verification are excluded and logged. No paid audio service may be used without a prior estimate and approval.

One fresh reviewer repairs the draft. A fresh third review is required when the first review changes meaning, sampling eligibility, speaker ownership, burden routes or tiers, move atomicity, or a target packet. All review repairs precede annotation.

## Development and held-out separation

The 24 v2.4 disputed fields and their locked outcomes become v2.5 development data. The v2.4 held-out debates are retired permanently from held-out use. v2.5 development artifacts may change the manual and schema only before the new gate is preregistered.

The v2.5 held-out sample is selected from production metadata only and excludes every v2.1–v2.4 development or held-out debate. Held-out classifiers may read the finalized v2.5 manual and examples but no development source deliberations, review artifacts, scores, prior assessments, other pass, or gate result.

## Required order

1. Freeze the derived rules, schemas, thresholds, sample, allowlists, and stop rule.
2. Convert the v2.4 disagreements into v2.5 development fixtures and validate every derivation.
3. Validate each held-out local transcript/event/manifest chain.
4. Build fresh score-blind atomic inventories with target components and burden-route graphs.
5. Independently review and repair inventories; run triggered third review where required.
6. Run Pass A and Pass B in different fresh isolated 5.6 Sol tasks using the exact allowlist.
7. Validate both schemas and every mechanical derivation before comparison.
8. Adjudicate every primitive disagreement in a fresh score-blind task; preserve agreed primitives.
9. Recalculate final derived labels and reliability statistics.
10. Apply the stop rule. Any failed annotation or hard gate blocks scores and composition.

## Held-out gates

The gate contains 36 moves. Existing v2.4 thresholds remain unchanged:

- derived target-coverage exact agreement ≥ `0.85` and Cohen's kappa ≥ `0.75`;
- derived diagnostic exact agreement ≥ `0.90` and at least three final positives;
- derived reframe exact agreement ≥ `0.90` and at least three final positives;
- derived burden-relation exact agreement ≥ `0.80` and Cohen's kappa ≥ `0.70`;
- exact derived tuple agreement ≥ `0.70`.

New primitive diagnostics must also pass:

- component-contact micro exact agreement ≥ `0.90`;
- target-preservation exact agreement ≥ `0.90`;
- defect-type exact agreement ≥ `0.85`;
- target-impact-explicit exact agreement ≥ `0.90`;
- malformed-demand-explained exact agreement ≥ `0.90`;
- replacement-demand-stated exact agreement ≥ `0.90`; and
- exact contacted-bridge-set agreement ≥ `0.80`.

Hard gates require zero source mismatches, inventory/review violations, derivation mismatches, evidence-offset errors, unresolved disagreements, missing locks, schema variants beyond one, or prohibited-input contamination.

## Numerical and composition stop

No numerical scoring, scorecard, Overall Commentary, AI Extension, novelty map, or rendering claim is produced in this gate. A passed gate authorizes only preregistration of a complete v2.5 three-debate numerical gate. All further promotion requires a separate successful numerical gate, a successful ten-debate gate, and explicit editorial approval.
