# Slugfester Reassessment Workflow v2.9

Workflow v2.9 replaces the failed v2.8 primitive contract. It remains classification-only until its development challenge, executable preflight, and held-out gate pass in that order. It does not authorize numerical scoring, Overall Commentary, AI Extension, rankings, or production changes.

## Design rule

The gated schema contains only distinctions that directly affect responsiveness, burden relevance, diagnostic quality, or reframe classification. Descriptive distinctions that do not change a score are excluded from the reliability gate.

## One scoring pass

For every locked responsive move, one pass records, in this order:

1. whether the move contacts the original target;
2. whether it uses an expressly connected example;
3. whether it exclusively substitutes a different object;
4. scope and burden adjustment;
5. binary contact for each indispensable target component;
6. relevant contrary material when no component is contacted;
7. an expressly cued defect and an expressly stated consequence;
8. the two reframe primitives; and
9. the highest evidenced burden-route tier contacted.

Code derives target disposition, responsive coverage, diagnostic status, reframe status, burden relevance, and the final classification tuple. Annotators never enter a derived label or score.

## Original-target contact and substitution

`originalTargetContact` is true when an exact clause predicates something of, questions, grants, restricts, distinguishes, explains, or attacks the locked target proposition or one of its indispensable components. The response may also introduce another example, comparison, or question.

`connectedExample` is independent. It is true only when exact language presents another case, analogy, counterexample, or model as bearing on the original target. Mere adjacency or topic overlap is false.

`exclusiveObjectSubstitution` is true only when all three conditions hold:

- the response makes a different subject, referent, comparison class, baseline, or question type do the work of answering;
- no clause contacts the original target or its components; and
- the changed object is evidenced by an exact span.

Therefore original-target contact and exclusive substitution cannot both be true. Introducing a new comparison does not substitute the target when the response also addresses the original claim.

## Scope

Scope is classified only when the original target is contacted. Apply this order:

1. change among possibility, probability, actuality, necessity, or certainty: `modality-shift`;
2. smaller range, population, time, quantifier, strength, or added condition: `narrowed`;
3. larger or stronger nonmodal commitment: `strengthened`;
4. otherwise: `same`.

A non-same relation requires its own evidence. Exclusive substitution always uses `same` because no comparison to the preserved target is scored.

## Burden adjustment exclusion

Start with `retained`. Use `reassigned` only for an exact transfer of the same live demand to a different bearer. Use `replaced` only for an exact statement that a materially different success condition should govern instead.

The following never establish non-retention by themselves: a counterquestion, “my point is,” a historical restatement, a new argument, an example, a comparison, topic redirection, or the assertion that another issue is interesting. When an excerpt contains both an answer and a new question, retain the original burden unless the new condition is expressly proposed as a replacement.

## Binary component contact

Every indispensable component receives exactly one `contacted` boolean and one evidence field. Contact is true when an exact clause grants, uses, denies, restricts, distinguishes, explains, questions the warrant of, or expressly challenges that component. Annotators do not classify the response posture.

One clause may contact multiple components only if its grammar expressly ranges over them. Contact never propagates through dependency edges. Coverage is derived:

- `substitution`: exclusive object substitution;
- `full`: every component contacted;
- `partial`: at least one but not every component contacted;
- `relevant-nonanswer`: original-target or contrary-material contact with no component contact; or
- `nonanswer`: neither target nor relevant contrary material is contacted.

Burden adjustment does not overwrite responsive coverage.

## Diagnostic

A diagnostic requires both:

- one expressly cued defect from the ordered list below; and
- a separate exact clause stating what consequently fails, does not follow, is not established, does not explain, cannot bear the claimed weight, or must be limited.

Defect order: `attribution-error`, `contradiction`, `ambiguity`, `scope-mismatch`, `unsupported-comparison`, `missing-premise`, `invalid-inference`, `evidential-insufficiency`, `irrelevance`.

The diagnostic target is always the locked target packet. Packet-versus-component object selection is not scored. A disagreement, alternative explanation, counterexample, ridicule, bare falsity claim, or bare negative verdict does not by itself satisfy either primitive.

## Reframe

A reframe requires both an exact explanation of why the original demand is malformed and an exact statement of the replacement demand or success condition. Redirection, a counterquestion, or a new question without the defect explanation is not a reframe. A response may both answer the original target and reframe the broader demand.

## Burden relevance

Annotate at most one burden contact: the highest evidenced eligible route tier contacted by the move. Allowed tiers are `subsidiary`, `central`, and `motion`; use `none` when no eligible bridge is contacted. The record includes the eligible bridge ID and exact evidence.

Whether a move supports or attacks the bridge does not affect relevance and is not encoded here. Code derives `topical-peripheral`, `advances-sub-burden`, `advances-central`, or `completes`. If no route is adopted, code derives `unadopted-or-irrelevant`.

## Evidence

Every positive or changed primitive requires the shortest complete exact clause that preserves controlling negation, modality, quantifier, comparison, condition, and referent. Offsets are zero-based and end-exclusive into the supplied responding excerpt. Missing or inexact evidence invalidates the artifact.

## Key construction

The development key requires two independent 5.6 Sol annotations from the frozen packet. Neither candidate may inspect prior v2.8 keys or passes. A third fresh 5.6 Sol context adjudicates every candidate disagreement from the source packet and records the resolution in a ledger before the key and manifest freeze.

## Lanes and gates

Dyadic and multi-speaker metrics are reported separately, but the same contract applies to both and the pooled hard gate controls authorization. Multi-speaker debates are not excluded merely because they contain three or more participants.

The development gate requires:

- original-target contact exact agreement at least 0.90;
- exclusive-substitution exact agreement at least 0.90;
- scope and burden-adjustment exact agreement at least 0.90;
- component-contact micro agreement at least 0.90;
- coverage exact agreement at least 0.85 and kappa at least 0.75;
- defect-type exact agreement at least 0.85;
- consequence and diagnostic exact agreement at least 0.90;
- reframe exact agreement at least 0.90;
- burden-relevance exact agreement at least 0.85 and kappa at least 0.75;
- exact derived-tuple agreement at least 0.75; and
- diagnostic-positive and reframe-positive recall against the adjudicated key at least 0.80 for each blind pass.

Failure freezes the attempt and keeps executable preflight, held-out selection, numerical scoring, and production use locked. Success authorizes executable preflight only.

