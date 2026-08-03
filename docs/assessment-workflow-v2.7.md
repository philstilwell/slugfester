# Slugfester Reassessment Workflow v2.7

This classification-only workflow responds to the v2.6 held-out non-pass without excluding multi-speaker debates. It creates independently promotable dyadic and multi-speaker lanes while retaining the successful v2.6 source, graph/contact, burden, reframe, isolation, adjudication, and stop-rule controls.

Version 2 remains the production baseline. v2.7 cannot authorize numerical scoring until a fresh lane-specific classification gate passes. Passing one lane does not authorize the other.

## Orthogonal target model

For every responsive move, classify three independent features before component contact:

1. `targetObjectRelation`: `same` or `changed`. A changed object answers a different subject, referent, comparison class, baseline, or question type.
2. `targetScopeRelation`: `same`, `narrowed`, `strengthened`, or `modality-shift`. Scope change alone does not make the target unavailable for component annotation.
3. `targetBurdenRelation`: `retained`, `reassigned`, or `replaced`.

Constructive moves use `not-applicable` for all three.

Target disposition is calculator-derived. A responsive move is `substituted` only when its object is changed or its burden is reassigned/replaced. A same-object, retained-burden answer remains `preserved` even when it narrows, strengthens, or changes modality. Every non-default axis requires the shortest exact evidence phrase.

For a preserved target, annotate every typed component using the v2.6 operation set: `accepts`, `denies`, `distinguishes`, `qualifies`, `explains`, `undermines`, or null. Scope change requires at least one directly corresponding `qualifies` or `distinguishes` operation. Contact remains node-specific and never propagates through graph edges.

## Coverage derivation

Coverage is calculator-derived:

- constructive → `not-applicable`;
- changed object or reassigned/replaced burden → `substitution`;
- qualifying operation on every component → `full`;
- qualifying operation on some components → `partial`;
- preserved target, no operation, cited relevant contrary material → `relevant-nonanswer`; and
- preserved target, no operation, no relevant contrary material → `nonanswer`.

The explicit `nonanswer` label prevents a zero-contact response from being mislabeled as target substitution. Responsive-only coverage is the promotion metric. All-move coverage remains descriptive and cannot compensate with constructive `not-applicable` agreement.

## Diagnostic-object and impact-link model

Diagnostic classification is applicable only to responsive moves. Constructive moves use `not-applicable` and are excluded from diagnostic agreement denominators.

A defect judgment requires:

- one defect type: `contradiction`, `missing-premise`, `ambiguity`, `invalid-inference`, `unsupported-comparison`, `irrelevance`, `evidential-insufficiency`, `scope-mismatch`, or `attribution-error`;
- a locked diagnostic object: the target packet or one target component;
- exact defect evidence from the responding move; and
- an impact mode: `none`, `verdict`, or `inferential-consequence`, with exact evidence for a non-null impact.

`verdict` means the move merely declares a claim wrong, inadequate, absurd, or unpersuasive. `inferential-consequence` requires an expressed link explaining what the defect does to the identified target object, inference, conclusion, or burden. Analogy, ridicule, omission language, or a bare adequacy verdict is not an inferential consequence by itself.

The diagnostic flag is true only when the move identifies a non-null defect and object and states an exact inferential consequence. The removed `other` category cannot absorb unclassified criticism.

## Stable retained modules

The v2.6 typed component DAG, no-propagation rule, collective-reference rule, exact evidence offsets, burden routes and tiers, malformed-demand/replacement-demand reframe, source hashes, speaker verification, pass isolation, primitive adjudication, and zero-tolerance hard gates remain unchanged unless a lane-specific rule below expressly strengthens them.

## Dyadic lane

The dyadic classification gate uses three fresh two-speaker debates and 12 moves per debate:

- two constructive moves per side;
- eight responsive moves total;
- at least four moves per side; and
- one fresh inventory review, with a triggered third review after any protected-field repair.

A dyadic pass may authorize only preregistration of a dyadic numerical gate.

## Multi-speaker lane

The multi-speaker classification gate uses three fresh debates with three or four interlocutors and 16 moves per debate:

- two constructive moves per side;
- twelve responsive moves total;
- at least six moves per side;
- at least three moves per interlocutor, including at least one constructive and two responsive moves; and
- individual move credit separated from side-level burden contribution.

Every target packet locks both `targetSpeaker` and `targetSide`. A teammate's claim is `speaker-only` unless another teammate explicitly adopts it. Team adoption requires an exact, timestamped adoption record; side membership alone never transfers argument ownership.

Every multi-speaker inventory receives two fresh independent semantic reviews even when the first makes no repair. A further fresh review is mandatory if the second review changes meaning, sampling, speaker ownership, adoption, burden route/tier, atomicity, target packet, component graph, or target recency.

A multi-speaker pass may authorize only preregistration of a multi-speaker numerical gate.

## Development separation

The three v2.6 debates and all 36 moves are permanently retired from held-out use. Their 15 disagreement cases—covering target axes, coverage, defect type, impact, diagnostic, component contact, and operation labels—become v2.7 development fixtures. Stable v2.6 contact, burden, and reframe cases remain regression fixtures.

Development may refine rules and examples only before either v2.7 gate is preregistered. Each lane's sample, schemas, thresholds, denominator rules, allowlists, and stop rule must be committed before any selected transcript is opened.

## Development tests

Before preregistration:

1. extract every retired disagreement with immutable source hashes;
2. convert it into an evidence-backed v2.7 fixture;
3. validate axes, component sets, diagnostic objects, evidence offsets, and derivations;
4. replay every stable v2.6 contact/burden/reframe fixture and require zero rule-induced regression;
5. run leave-one-debate-out deterministic replay with zero rule changes; and
6. document that replay tests implementation consistency, not independent-rater reliability.

## Lane-specific classification gates

Each lane applies the same aggregate minima to its applicable denominators:

- target-object exact agreement ≥ `0.90`;
- target-scope exact agreement ≥ `0.85`;
- target-burden exact agreement ≥ `0.90`;
- component-contact micro exact agreement ≥ `0.90` where both passes derive a preserved target;
- responsive coverage exact agreement ≥ `0.85` and Cohen's kappa ≥ `0.75`;
- defect-type exact agreement ≥ `0.85`;
- diagnostic-object exact agreement ≥ `0.85`;
- impact-mode exact agreement ≥ `0.90`;
- derived diagnostic exact agreement ≥ `0.90`, with at least three adjudicated positives;
- malformed-demand and replacement-demand exact agreement ≥ `0.90`;
- derived reframe exact agreement ≥ `0.90`, with at least three adjudicated positives;
- contacted-bridge-set exact agreement ≥ `0.80`;
- derived burden-relation exact agreement ≥ `0.80` and Cohen's kappa ≥ `0.70`; and
- exact derived-tuple agreement ≥ `0.70`.

Each debate must achieve target-object agreement ≥ `0.75`, component-contact micro agreement ≥ `0.80`, responsive coverage agreement ≥ `0.75`, and impact-mode agreement ≥ `0.75`.

Operation-label exact agreement and all-move coverage are reported diagnostics, not promotion gates.

Hard gates require zero source, graph, ownership/adoption, target-recency, inventory/review, evidence-offset, derivation, unresolved-attribution, unresolved-adjudication, missing-lock, schema-variant, or prohibited-input violations.

## Promotion and stop rules

No score, scorecard, reconstructed assessment, Overall Commentary, AI Extension, novelty map, ranking, or production-page change may be generated in v2.7 classification work.

- A failed dyadic gate blocks dyadic numerical scoring.
- A failed multi-speaker gate blocks multi-speaker numerical scoring.
- A passed lane authorizes only preregistration of that lane's complete numerical gate.
- Corpus-wide reassessment requires both lane-specific numerical gates plus a final mixed-format audit.

Lane authorization does not permit silent transfer. Dyadic production may proceed in controlled batches while multi-speaker debates remain held only after the dyadic numerical gate—not merely this classification gate—passes.
