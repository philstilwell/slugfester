# Slugfester Reassessment Workflow v2.3

This calibration workflow is a controlled remediation of v2.2. It preserves the locked source chain, audio gate, inventories, weights, formulas, scoring disagreement thresholds, burden controls, and numerical promotion thresholds. Its material change is to separate response classification from numerical scoring.

Version 2 remains the production baseline. v2.3 may authorize only a preregistered ten-debate gate after the same three debates pass every classification, numerical, source, composition, and rendering gate. It cannot authorize all 195 debates.

## Version and provenance contract

Every artifact records the exact workflow, rubric, schema, gate, model, source hashes, completion time, and isolation method. All v2.3 work is `calibrationOnly: true`.

There are three independent stages:

1. two fresh classifiers assign response relations without scores;
2. every classifier disagreement is adjudicated and one response class is locked for every move;
3. two different fresh scorers receive the locked class but neither classifier output, the other scoring pass, nor any legacy score.

The classifier and scoring schemas are exact contracts. Missing, renamed, alternative, or extra fields invalidate an artifact.

## Required order of operations

1. **Preregister.** Lock sample, controlled variables, class agreement gates, scoring gates, allowlists, and stop rules before classifier access.
2. **Validate the full source.** Require local `transcript.txt`, `events.json`, and `manifest.json` with matching hashes. Reusing a previously verified source is permitted only when every hash is rechecked.
3. **Enforce the audio prerequisite.** Every medium- or low-confidence move must retain a successful local audio-verification record and matching raw-artifact hashes before classification or scoring. No new paid transcription is required when those verified artifacts remain unchanged.
4. **Lock the inventory.** Preserve burdens, sections, weights, move IDs, side labels, importance, response links, and source spans from the controlled v2.2 gate. No score-informed edits are permitted.
5. **Classify Pass A.** A fresh isolated task uses only the workflow, rubric, classification schema, gate manifest, one inventory, its audio audit, and that debate's local transcript/event/manifest chain. It produces no scores.
6. **Classify Pass B.** A different fresh isolated task uses the identical allowlist and cannot access Classifier A, any score, adjudication, or legacy assessment.
7. **Validate and adjudicate classifications.** Validate both passes before comparison. Adjudicate every response-class or target-set disagreement in a fresh task. Preserve both originals and lock exactly one class and target set for every move.
8. **Evaluate the classification gate.** Report exact class agreement and Cohen's kappa before numerical scoring. The controlled rerun may continue for diagnostic completion if the gate fails, but it cannot pass v2.3 or authorize expansion.
9. **Score Pass A.** A fresh task receives the scoring allowlist and final response-lock file, not raw classifier passes. It must use the locked class and produce the exact scoring schema.
10. **Score Pass B.** A different fresh task receives the same inputs, cannot access Pass A, and must use the same locked class.
11. **Validate before comparison.** Invalid passes return only to their originating task for schema repair. They never enter adjudication.
12. **Adjudicate numerical triggers.** Adjudication is required when any dimension differs by more than 8 points, a computed move score differs by more than 4 points, or a burden adjustment differs by more than 2 points. The locked response class cannot be changed during score adjudication.
13. **Calculate mechanically.** Repository code computes all move, section, and overall values.
14. **Apply the stop rule.** If classification or numerical reliability fails, record the failure and do not compose scorecards, AI Extensions, novelty maps, or rendering claims.
15. **Compose only after reliability passes.** Draft complete scorecards, then tag review, Overall Commentary, and the AI Extension.
16. **Audit the AI Extension.** Place it after Overall Commentary in a default-collapsed, visually distinct accordion. Label it as AI-generated; strengthen both sides proportionately; do not use rational-invulnerability language; map each extension to the inventory as synthesis or novel material.
17. **Run final QA.** Validate hashes and calculations, confirm displayed scores, and inspect desktop/mobile accordion behavior, keyboard focus, and reduced motion.
18. **Promote deliberately.** A passed three-debate gate authorizes only a preregistered ten-debate gate. Production data and rankings remain unchanged without explicit editorial approval.

## Response-class decision tree

Apply these questions in order. Stop at the first satisfied class.

1. **Constructive opening:** There is no live opponent claim that the selected act is principally trying to answer; the act builds the side's case against its motion or adopted burden.
2. **Justified reframe:** The speaker explains why the original demand is malformed and answers the corrected demand. Merely replacing the demand is not a justified reframe.
3. **Diagnostic defeat:** The move identifies a contradiction, missing premise, ambiguity, or invalid inference which—if the diagnosis is correct—defeats the targeted claim without needing a further substantive answer. A question that merely requests clarification does not qualify.
4. **Full answer:** The move addresses every indispensable component on which the strongest live target succeeds or fails. It may still be logically or evidentially poor; classification concerns coverage, not soundness.
5. **Partial answer:** The move answers at least one indispensable component of the strongest live target but leaves another indispensable component unresolved.
6. **Relevant counterargument:** The move supplies contrary material relevant to the target or motion but does not answer an indispensable component of the live target.
7. **Weaker substitution:** The move changes the issue, substitutes a different burden, attacks a materially weaker position, or otherwise satisfies none of the preceding tests.

For compound objections, classifiers state the indispensable components. Incidental subpoints do not prevent a full-answer classification. Classify only the selected speaker's argumentative act within a mixed-speaker span. `respondsToIds` is evidence, not a mandatory class: a move may have a response link yet remain principally constructive, and a genuine reply may target material visible only in the full transcript.

## Classification lock and gate

Every exact class or target-set disagreement is adjudicated. The final lock contains every move once and includes only the resolved class, target IDs, decisive-target summary, and resolution provenance needed by scorers.

The preregistered classification gates are:

- exact response-class disagreement rate at most `0.15`;
- exact response-class agreement at least `0.85`;
- Cohen's kappa at least `0.75`;
- unresolved or unadjudicated disagreements: `0`;
- moves missing a locked class: `0`.

## Numerical scoring and class bands

Move weights remain:

`move = round(.25 logical coherence + .20 evidence/warrant + .20 responsiveness + .15 relevance/burden + .10 precision/clarity + .10 calibration/charity)`

Calibration and charity are separately scored from 0–100 and mechanically combined:

`calibration/charity = round((calibration + charity) / 2)`

Responsiveness must stay within the locked class range:

| Locked class | Responsiveness range |
| --- | ---: |
| constructive-opening | 0–100, using motion/burden anchors |
| full-answer | 80–100 |
| partial-answer | 55–79 |
| diagnostic-defeat | 80–100 |
| relevant-counterargument | 50–69 |
| justified-reframe | 80–100 |
| weaker-substitution | 0–49 |

Section and overall formulas remain unchanged:

`section = round(sum(move score × importance) / sum(importance))`

`overall = round(weighted section mean + burden-completion adjustment)`

## Strengthened burden-adjustment exclusion

The default is zero. A nonzero adjustment is eligible only for one specific, debate-wide consequence that changes completion of an adopted burden and is absent from every scored move, all six dimensions, move importance, section weights, and inventory selection. It may not aggregate, amplify, or compensate for scored performance.

Each pass must identify the affected burden and success criterion, enumerate every related move considered for duplication, list where the candidate consequence is already captured, and state a counterfactual showing why the weighted score would otherwise misreport burden completion. If any `alreadyCapturedBy` entry exists, the value must be zero. If no consequence survives, use `distinctConsequence: "none"`, empty affected burden and move lists, and zero.

Inventory incompleteness, omitted moves, stylistic impressions, cumulative repetition, section coverage, or dissatisfaction with locked weights can never justify an adjustment. They are workflow defects or already-scored properties, not debate-wide residual consequences. A nonzero final adjustment survives only when both passes independently identify the same eligible consequence with the same sign, or a threshold-triggered adjudicator independently establishes all criteria.

## Gate rules

The v2.2 numerical thresholds stay frozen: mean absolute dimension delta at most 5; move-adjudication rate at most 0.25; maximum overall pass delta at most 5; winner-classification difference rate at most 0.20; minimum pass rank correlation 0.90. All source, audio, schema, isolation, burden, adjudication, calculator, composition, novelty, and rendering hard gates must also pass.

A failed classification or numerical gate blocks the ten-debate gate even when overall winners are stable. Thresholds may not be raised after results are visible.
