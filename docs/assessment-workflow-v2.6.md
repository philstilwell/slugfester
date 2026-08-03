# Slugfester Reassessment Workflow v2.6

This classification-only workflow repairs the two v2.5 held-out failures: component-contact micro agreement and derived target-coverage exact agreement. It retains the v2.5 mechanism, burden-route, source, isolation, review, adjudication, and stop-rule controls unchanged.

Version 2 remains the production baseline. v2.6 cannot authorize scoring until a fresh held-out annotation gate passes. A passed v2.6 gate may authorize only preregistration of a complete three-debate numerical gate; it cannot authorize a ten-debate gate or corpus-wide reassessment.

## Ordered target-contact model

For every responsive act, classifiers decide target relation before component contact.

1. `substituted` applies only when the act changes the target's object, strength, modality, comparison class, or burden. It requires a substitution type and an exact in-move evidence phrase. Component operations are then not applicable and must be empty.
2. `preserved` applies when the act continues to answer the same target, even badly. The classifier then annotates every locked target component.
3. Constructive moves use `not-applicable`.

Every target component is inventory-locked with a kind and dependency list. Kinds are `fact-premise`, `rule-comparison`, `inference`, `burden`, `modality`, and `conclusion`. Dependencies form a directed acyclic graph.

For a preserved target, each component receives either no operation or exactly one qualifying operation: `accepts`, `denies`, `distinguishes`, `qualifies`, `explains`, or `undermines`. Every positive operation requires exact in-move evidence. Contact is calculator-derived from operation presence.

Contact does not propagate through the target graph. Attacking an inference does not contact its factual premises; attacking a premise does not automatically contact its conclusion. A collective phrase may support multiple contacts only when it explicitly ranges over those components and independently performs the same qualifying operation on each. Mention, topic overlap, silence, and an attack on a dependent node are insufficient.

If a preserved target has no component operation, classifiers may mark relevant contrary material only with exact evidence. Relevant contrary material is false whenever any component is contacted.

## Coverage derivation

Constructive moves derive `not-applicable`. Responsive moves derive:

- `substitution` when target relation is `substituted`;
- `full` when a preserved target has a qualifying operation for every component;
- `partial` when a preserved target has operations for some but not all components;
- `relevant-nonanswer` when a preserved target has no component operation but has cited relevant contrary material; and
- `substitution` when a preserved target has neither component contact nor relevant contrary material.

The calculator owns all derived labels. Classifiers may not work backward from a preferred coverage result.

## Unchanged mechanism and burden model

Diagnostic and reframe primitives, exact evidence offsets, burden-route graphs, eligible bridges, bridge tiers, and burden-relation derivation remain exactly as in v2.5. Their v2.5 held-out results passed and are not reopened for taxonomy revision.

## Inventory graph and lint controls

Each responsive target packet locks:

- an exact prior opponent excerpt and target speaker;
- whether it is the immediate opponent claim or an explicitly justified earlier load-bearing claim;
- typed, nonduplicative components;
- dependency edges with no missing node, self-edge, or cycle; and
- a rationale for every exception to immediate-target selection.

Validators reject exact duplicate component text, invalid graph edges, inference or conclusion nodes without dependencies, unresolved target-recency exceptions, ineligible burden bridges, mixed-speaker acts, source-hash mismatch, or a medium/low speaker attribution without verified local audio.

One fresh review remains mandatory. A different fresh third review remains mandatory after any change to meaning, sampling, speaker ownership, burden route or tier, atomicity, target packet, component kind, component dependency, or target recency.

## Development separation

The three v2.5 held-out debates and all 36 moves are permanently retired from held-out use. Their ten component-contact disagreements, six coverage disagreements, and three target-relation disagreements become v2.6 development fixtures. Development may refine examples and lints only before the v2.6 gate is preregistered.

The v2.6 held-out sample must be selected from production metadata only, excluding every debate used in v2.1 through v2.5 development or held-out testing. No held-out transcript may be inspected before the sample, schemas, thresholds, allowlists, and stop rule are committed.

## Required order

1. Freeze the v2.6 contact model, schemas, development contract, and lints.
2. Convert the retired v2.5 disagreements into typed, evidence-backed fixtures.
3. Validate the fixtures and run a debate-held-out development replay.
4. Preregister a fresh metadata-selected three-debate sample and every threshold.
5. Validate each local transcript/event/manifest chain.
6. Build, independently review, and where triggered third-review score-blind inventories.
7. Run Pass A and Pass B in different fresh isolated 5.6 Sol tasks using the exact allowlist.
8. Validate every operation, phrase offset, graph lock, and derivation before comparison.
9. Adjudicate every primitive disagreement in a fresh score-blind task while preserving agreements.
10. Calculate aggregate and debate-level reliability, then apply the stop rule.

## Held-out gates

The fresh gate contains 36 moves. Unchanged aggregate gates are:

- component-contact micro exact agreement ≥ `0.90` on preserved responsive targets only;
- responsive target-relation exact agreement ≥ `0.90`;
- all-move target-coverage exact agreement ≥ `0.85` and Cohen's kappa ≥ `0.75`;
- responsive-only target-coverage exact agreement ≥ `0.80`;
- defect-type exact agreement ≥ `0.85`;
- target-impact-explicit exact agreement ≥ `0.90`;
- malformed-demand-explained exact agreement ≥ `0.90`;
- replacement-demand-stated exact agreement ≥ `0.90`;
- contacted-bridge-set exact agreement ≥ `0.80`;
- derived diagnostic and reframe exact agreement ≥ `0.90`, each with at least three adjudicated positives;
- derived burden-relation exact agreement ≥ `0.80` and Cohen's kappa ≥ `0.70`; and
- exact derived-tuple agreement ≥ `0.70`.

Each debate must also achieve at least `0.75` responsive target-relation agreement, `0.80` component-contact micro agreement, and `0.75` responsive target-coverage agreement. These floors prevent aggregate results from concealing a stratum-specific failure.

Contact-operation exact agreement is reported as a diagnostic, not a promotion gate. Multiple accurate operations can preserve the same structural contact result; evidence validity and derived contact are the production-relevant controls.

Hard gates require zero source, graph, target-recency, inventory/review, evidence-offset, derivation, unresolved-attribution, unresolved-adjudication, missing-lock, schema-variant, or prohibited-input violations.

## Numerical and composition stop

No numerical score, scorecard, reconstructed assessment, Overall Commentary, AI Extension, novelty map, ranking, or rendering claim may be produced in v2.6. A failed gate keeps all later stages unauthorized. A passed gate authorizes only preregistration of a complete v2.6 three-debate numerical gate.
