# Slugfester Reassessment Workflow v2.4

This calibration workflow remediates the v2.3 classification failure by replacing one mutually exclusive response class with orthogonal annotations. It preserves the local transcript chain, source hashing, audio prerequisite, isolation, exact schemas, adjudication preservation, calculator ownership, strengthened burden-residual exclusion, and post-reliability composition stop rule.

Version 2 remains the production baseline. v2.4 begins with a classification-only held-out gate. Passing that gate may authorize a separate complete three-debate numerical gate; it does not authorize the ten-debate gate or corpus-wide reassessment.

## Annotation model

Every move has an inventory-locked `interactionMode`:

- `constructive`: the selected act principally builds the side's case against the motion or an adopted burden;
- `responsive`: the selected act principally engages the inventory-locked target packet.

Classifiers do not choose or change interaction mode, target identity, indispensable target components, move boundaries, speaker identity, or burden IDs. They separately annotate:

1. **target coverage** — `not-applicable`, `full`, `partial`, `relevant-nonanswer`, or `substitution`;
2. **diagnostic mechanism** — whether the act identifies a contradiction, missing premise, ambiguity, or invalid inference;
3. **reframe mechanism** — whether the act argues that the original demand is malformed and supplies a corrected demand; and
4. **burden relation** — `completes`, `advances-central`, `advances-sub-burden`, `topical-peripheral`, or `unadopted-or-irrelevant`.

Diagnostic and reframe flags are independent of coverage. A diagnostic move may fully answer, partially answer, or merely pressure a target. A reframe may be complete, partial, or a substitution. No priority rule forces mechanism and coverage to compete for one label.

## Atomic inventory contract

Each move must contain one speaker's one primary argumentative act. The selected span may contain a non-substantive backchannel of at most two seconds, but it may not combine an opponent question, the selected speaker's answer, and a follow-up into one scored unit. Moderator logistics and audience reactions are excluded.

Every committed source excerpt contains 30–90 exact words. Every responsive move includes a prelocked target packet with:

- the strongest live target's speaker and exact source span;
- a 15–90 word exact target excerpt;
- a concise target claim;
- only the components indispensable to the target's success; and
- a rationale explaining why that target is the appropriate object of response.

Constructive moves have `targetPacket: null`. Burden IDs and observable success criteria are locked before annotation. Speaker attribution must be high confidence; a medium- or low-confidence candidate requires successful local audio verification before it may enter the inventory.

## Held-out sampling protocol

Each debate contributes exactly 12 moves:

1. the first two load-bearing constructive moves from each side; and
2. eight load-bearing responsive moves distributed across the subsequent chronological exchange.

Responsive selection takes the earliest qualifying atomic acts from successive chronological quarters, carrying an unfilled quota forward. Do not manufacture side symmetry, but no side may contribute fewer than four total moves. A candidate that cannot meet atomicity, attribution, exact-excerpt, or target-packet requirements is skipped in favor of the next qualifying act, with the exclusion logged.

Inventory builders use only the workflow, inventory schema, preregistered manifest, debate metadata, and that debate's full local transcript/event/manifest chain. They may not access production scores, critiques, tags, prior calibration scores, v2.3 classifications, or development examples. A separate fresh reviewer checks source fidelity, atomicity, target components, burdens, and selection-protocol compliance. All repairs occur before annotation passes.

## Development and held-out separation

The 32 v2.3 class disagreements are development data. They may be converted into v2.4 examples and summarized in the annotation manual. They cannot enter the held-out sample or be used to change thresholds after preregistration.

The held-out debates are selected from metadata before transcript review and are excluded from all v2.3 development artifacts. Held-out classifiers may read the finalized development manual and examples but no scores, prior assessments, inventory-review deliberations, or other classifier output.

## Required order

1. Preregister the model, sample, schemas, thresholds, allowlists, and stop rules.
2. Convert v2.3 disagreements into development examples under the orthogonal model.
3. Validate local transcript, event, and manifest hashes for each held-out debate.
4. Build score-blind atomic inventories and target packets under the fixed sampling protocol.
5. Independently review and repair inventories before annotation.
6. Run Annotation Pass A in a fresh isolated task.
7. Run Annotation Pass B in a different fresh isolated task without Pass A.
8. Validate both exact schemas before comparison.
9. Adjudicate every coverage, mechanism, or burden-relation disagreement in a fresh task; preserve both originals.
10. Calculate component agreement, kappa where preregistered, prevalence, and the exact-tuple diagnostic.
11. Apply the stop rule. A failed annotation gate blocks numerical scoring, scorecards, AI Extensions, novelty maps, rendering claims, and expansion.
12. If every gate passes, preregister a separate complete numerical gate using the locked v2.4 annotations and unchanged numerical thresholds.

## Coverage anchors

For constructive moves, coverage is always `not-applicable`.

For responsive moves:

- `full`: every prelocked indispensable component is substantively addressed;
- `partial`: at least one indispensable component is addressed and at least one is not;
- `relevant-nonanswer`: the move supplies relevant contrary material but addresses no indispensable component;
- `substitution`: the move changes the issue, substitutes a different burden, or attacks a materially weaker claim.

Coverage concerns structural contact, not soundness. A complete but unsound answer remains `full`; its numerical coherence or evidence would later be lower.

## Mechanism flags

`diagnostic: true` requires an identified defect and its relevance to the target. A bare request for clarification, rhetorical question, or later-promised diagnosis is false.

`reframe: true` requires an explanation of why the original demand is malformed and a stated corrected demand. Whether that corrected demand is answered is recorded by coverage, not by the flag.

## Burden relation anchors

- `completes`: if successful, the move itself satisfies a locked motion-level success criterion or decisively defeats the opponent's adopted burden;
- `advances-central`: materially advances the central adopted burden, but at least one motion-level bridge remains;
- `advances-sub-burden`: establishes or attacks a necessary subsidiary issue without the motion-level consequence;
- `topical-peripheral`: related to the subject but nonessential, rhetorically adjacent, or directed at a burden not needed by the side's case;
- `unadopted-or-irrelevant`: depends on a burden the side or opponent did not adopt, or lacks a material route to the locked motion.

Judge the selected act only. Do not import later completion, cumulative repetition, or another allied speaker's distinct theory.

## Held-out annotation gates

The gate contains exactly 36 moves. It passes only if all of the following hold:

- target-coverage exact agreement at least `0.85` and Cohen's kappa at least `0.75`;
- diagnostic-flag exact agreement at least `0.90`;
- reframe-flag exact agreement at least `0.90`;
- at least three adjudicated positive instances of each mechanism flag, otherwise the flag gate is underpowered and cannot pass;
- burden-relation exact agreement at least `0.80` and Cohen's kappa at least `0.70`;
- exact agreement on the complete annotation tuple at least `0.70`;
- inventory atomicity or target-packet violations: `0`;
- unresolved disagreements or moves missing a final lock: `0`; and
- schema variants, prohibited-input contamination, or source-hash mismatches: `0`.

Thresholds may not be changed after any held-out transcript or annotation result is visible.

## Future numerical use

If the annotation gate passes, responsiveness is constrained by interaction and coverage: constructive `0–100`, full `80–100`, partial `55–79`, relevant-nonanswer `50–69`, substitution `0–49`. Relevance/burden is constrained by the locked relation: completes `90–100`, advances-central `80–89`, advances-sub-burden `70–79`, topical-peripheral `50–69`, unadopted-or-irrelevant `0–49`.

Mechanism flags never add or subtract points. The six dimension weights, separate calibration/charity subratings, section and overall formulas, score-disagreement thresholds, and burden-adjustment exclusion remain as in v2.3.

## AI Extension and promotion

No AI Extension is composed during a classification-only gate. In a future complete assessment it remains visibly AI-generated, default-collapsed, visually distinct, placed after Overall Commentary, balanced across sides, and novelty-mapped without rational-invulnerability language.

A passed held-out annotation gate authorizes only a preregistered complete v2.4 three-debate numerical gate. The ten-debate gate and all 195 production reassessments remain unauthorized until all intermediate gates pass and the editor explicitly approves promotion.
