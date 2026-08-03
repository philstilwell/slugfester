# Slugfester Reassessment Workflow v2.9.1

Workflow v2.9.1 is a classification-only replacement for the failed v2.9 attempt. It does not authorize numerical scoring, Overall Commentary, AI Extension, rankings, held-out selection, or production changes.

## Scoring-relevant primitives

One pass records only:

1. original-target contact;
2. an expressly connected example, when present;
3. scope and burden adjustment;
4. binary contact for each indispensable component;
5. relevant contrary material when no component is contacted;
6. an expressly cued defect and a separately stated consequence;
7. the two reframe primitives; and
8. the highest evidenced eligible burden-route tier.

Code derives target disposition, coverage, diagnostic, reframe, burden relevance, and the exact classification tuple. No response-posture taxonomy, diagnostic-object granularity, bridge direction, or exclusive-substitution label appears in the scoring contract.

## Target contact and examples

`originalTargetContact` is true when an exact clause predicates something of, questions, grants, restricts, distinguishes, explains, or attacks the locked target proposition or one of its indispensable components. When false, target disposition is `unaddressed`.

`connectedExample` is independent and true only when exact language presents another case, analogy, counterexample, or model as bearing on the original target. Adjacency and topic overlap are insufficient. A response may contact the target while also introducing a new comparison or question.

## Scope

Scope is classified only when the target is contacted. Apply this order: change among possibility, probability, actuality, necessity, or certainty is `modality-shift`; a smaller nonmodal range, population, time, quantifier, strength, or added condition is `narrowed`; a larger nonmodal commitment is `strengthened`; otherwise use `same`. Every non-same relation requires exact evidence.

## Burden-adjustment exclusion

Start with `retained`. Use `reassigned` only for an exact transfer of the same live demand to another bearer. Use `replaced` only for an exact statement that a materially different success condition governs instead.

A counterquestion, “my point is,” historical restatement, new argument, example, comparison, topic redirection, or assertion that another issue is interesting never changes the burden by itself. When a response both answers and asks something new, retain the burden unless the new condition is expressly installed as the replacement standard.

## Binary component contact and coverage

Every indispensable component receives a boolean and exact evidence when contacted. Granting, using, denying, restricting, distinguishing, explaining, questioning the warrant of, or expressly challenging a component all count as contact. One clause may contact several components only when its grammar expressly ranges over each; contact never propagates through dependencies.

Coverage is derived as `full` when every component is contacted, `partial` when some are, `relevant-nonanswer` when the target or relevant contrary material is contacted without component contact, and `nonanswer` otherwise. Burden adjustment never overwrites coverage.

## Diagnostic

A diagnostic requires both an expressly cued defect and a separate exact clause stating what consequently fails, does not follow, is not established, does not explain, cannot carry the claimed weight, or must be limited.

Use the first expressed defect: `attribution-error`, `contradiction`, `ambiguity`, `scope-mismatch`, `unsupported-comparison`, `missing-premise`, `invalid-inference`, `evidential-insufficiency`, or `irrelevance`. The diagnostic target is the locked packet; component-versus-packet object selection is not scored. Counterargument, alternative explanation, ridicule, bare falsity, or a bare negative verdict is insufficient.

## Reframe

A reframe requires both an exact explanation of why the original demand or framing is malformed and an exact statement of the replacement demand or success condition. Redirection or a counterquestion without the explanation is false. An answer may also reframe a broader issue; target contact does not exclude reframe.

## Burden relevance

Record at most one contact: the highest evidenced eligible tier (`none`, `subsidiary`, `central`, or `motion`) with its bridge ID and exact evidence. Supporting and attacking are equally relevant and direction is not encoded. Code derives `topical-peripheral`, `advances-sub-burden`, `advances-central`, `completes`, or `unadopted-or-irrelevant`.

## Evidence and defaults

Every positive or changed primitive uses the shortest complete clause preserving controlling negation, modality, quantifier, comparison, condition, and referent. Offsets are zero-based and end-exclusive into the supplied response. Missing or inexact evidence invalidates the artifact.

When an explicitness test fails: target contact false, connected example false, scope same, burden retained, every component false, no defect, no consequence, no reframe, and burden tier none. A unique rationale remains required.

## Key and gate order

Two fresh 5.6 Sol contexts independently annotate the frozen retired packet. A third fresh context adjudicates every disagreement and records a resolution ledger. The adjudicated key, sources, validators, analyzer, and thresholds are frozen before blind Passes A and B.

Dyadic and multi-speaker metrics are reported separately under one semantic contract. The pooled hard gate requires: target-contact agreement 0.90; scope and burden-adjustment agreement 0.90; component-contact micro agreement 0.90; coverage exact 0.85 and kappa 0.75; defect-type agreement 0.85; consequence and diagnostic agreement 0.90; reframe agreement 0.90; burden-relevance exact 0.85 and kappa 0.75; exact derived tuple 0.75; and diagnostic-positive and reframe-positive recall against the adjudicated key 0.80 for each pass.

Failure freezes the attempt. Success authorizes executable preflight only.

