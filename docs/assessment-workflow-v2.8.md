# Slugfester Reassessment Workflow v2.8

This classification-only workflow responds to both failed v2.7 held-out lanes. It preserves the v2.7 source, inventory, graph, ownership, burden, isolation, adjudication, and fail-closed controls while making target, component-operation, and diagnostic decisions more deterministic.

Version 2 remains the production baseline. v2.8 cannot authorize numerical scoring. A lane that passes v2.8 classification may only preregister its own numerical gate.

## Immutable development evidence

The complete v2.7 dual-lane gate is frozen as failed development evidence. Its six debates and all earlier v2.1–v2.7 development or gate debates are permanently retired from future held-out selection. No v2.7 pass, lock, threshold, reliability result, or source digest may be changed to improve v2.8.

v2.8 development uses the v2.7 disagreements only to define rules and challenge cases. Fresh held-out debate transcripts remain unopened until every v2.8 executable branch passes preflight and the next manifest is committed.

## Required decision order

For each responsive move:

1. identify the target proposition's subject, referent, comparison class, baseline, question type, strength, modality, and live demand;
2. apply the target-object identity test;
3. apply scope only to the same mapped proposition;
4. apply burden only to the live demand;
5. derive target disposition and its single substitution cause;
6. if preserved, classify each indispensable component independently;
7. derive coverage;
8. apply the diagnostic eligibility sequence;
9. apply malformed-demand and replacement-demand tests; and
10. classify burden-bridge contact.

Annotators may not work backward from coverage, diagnostic, reframe, or burden labels.

## Target-object identity test

Start with `same`. Choose `changed` only when the response's asserted answer cannot be substituted into the target proposition without changing at least one of:

- the subject whose property is at issue;
- the referent of a key term or pronoun;
- the compared alternatives or comparison class;
- the baseline against which a comparison is evaluated; or
- the question type, such as existence versus explanation, prediction versus moral adequacy, or truth versus usefulness.

Topic overlap is insufficient for `same`. A new example is not automatically `changed`: it remains the same object when the speaker expressly maps it as a counterexample, analogy, instance, or rival model of the target proposition.

The shortest complete clause showing the changed element is required. Pronoun-only evidence is insufficient when a later or slightly longer clause names the referent explicitly.

## Scope and burden precedence

Scope is evaluated only after object identity:

- restriction of time, population, condition, strength, or quantification → `narrowed`;
- adoption of a materially stronger version → `strengthened`;
- change among possibility, probability, actuality, necessity, or certainty → `modality-shift`;
- otherwise → `same`.

Object and scope may both change; object change controls substitution. Scope never repairs an object change.

Burden is `retained` unless the response expressly transfers the live demand to another party or states a materially different success condition. A rhetorical question, countercharge, or topical redirection is not enough. `reassigned` transfers the same demand; `replaced` states a new demand.

The derived substitution cause is exactly one of `none`, `object-change`, `burden-reassignment`, or `burden-replacement`, with object change taking precedence when more than one primitive changes. Cascade disagreements downstream of object identity are reported separately from independent component disagreements.

## Component classification

For a preserved target, annotate every indispensable component separately. First decide contact; then apply the first satisfied operation in this precedence order:

1. `denies`: expressly asserts the component is false;
2. `accepts`: expressly grants or relies on the component;
3. `qualifies`: limits its range, strength, modality, population, time, or conditions;
4. `distinguishes`: separates meanings, cases, referents, or comparison classes within it;
5. `undermines`: attacks its warrant, inference, baseline, or evidential force without denying it;
6. `explains`: supplies a mechanism or reason while treating the component as a datum; or
7. null: none of the operations is expressly performed.

One primary operation is recorded per component. The rationale may note secondary effects, but they receive no additional coverage credit. Contact never propagates through graph edges. Collective language contacts multiple nodes only when its grammatical scope expressly covers each credited component.

Evidence uses the shortest complete clause that retains controlling negation, modality, quantifier, comparison, and condition. When two complete spans are semantically equivalent, choose the shorter; if tied, choose the earlier. Semantic operation agreement and evidence-boundary agreement are reported separately.

## Coverage derivation

- constructive → `not-applicable`;
- changed object, reassigned burden, or replaced burden → `substitution`;
- every indispensable component contacted → `full`;
- some but not all contacted → `partial`;
- no contact plus exact relevant contrary material → `relevant-nonanswer`;
- no contact and no qualifying contrary material → `nonanswer`.

Relevant contrary material must bear on the target without itself accepting, denying, qualifying, distinguishing, undermining, or explaining a locked component.

## Diagnostic eligibility sequence

Diagnostics apply only to preserved responsive targets.

1. Identify an exact criticism cue in the responding move.
2. Select the narrowest permitted defect type.
3. Select the target packet only when the criticism concerns the argument as a whole; otherwise select the single component actually criticized.
4. Identify impact separately.

The defect types and permitted objects are:

| Defect | Required expressed cue | Permitted component kinds |
| --- | --- | --- |
| `contradiction` | jointly asserted commitments cannot all be true | packet; exceptionally a compound inference or conclusion |
| `missing-premise` | a necessary supporting proposition is absent | packet, inference, burden, or conclusion |
| `ambiguity` | a term, scope, reading, or referent is unstable | packet or affected component |
| `invalid-inference` | the conclusion does not follow even if premises are granted | packet, inference, or conclusion |
| `unsupported-comparison` | the baseline or rival comparison is missing or nontransferable | packet, rule-comparison, inference, or conclusion |
| `irrelevance` | the consideration does not bear on the target conclusion or burden | packet, burden, or conclusion |
| `evidential-insufficiency` | the cited support is expressly said not to warrant the claim | packet, fact-premise, inference, or conclusion |
| `scope-mismatch` | the demand or conclusion exceeds the relevant scope | packet, rule-comparison, burden, modality, or conclusion |
| `attribution-error` | the respondent expressly disowns the attributed claim | packet or attributed component |

If no listed cue is expressly present, select `none`. A counterexample, alternative explanation, ridicule, disagreement, or competing characterization is not itself a diagnostic cue.

Impact is:

- `none`: no evaluative or inferential result is stated;
- `verdict`: bare judgment such as wrong, absurd, inadequate, or unpersuasive; or
- `inferential-consequence`: an exact clause states that the target object, inference, conclusion, comparison, explanation, attribution, or burden fails, is not established, does not transfer, or exceeds its scope.

The diagnostic flag remains derived and true only for a non-none eligible defect and object plus an explicit inferential consequence.

## Rare-feature challenge

Random held-out samples test agreement only on observed applicable cases. They do not fail merely because diagnostic or reframe positives are absent.

Before preregistration, fresh isolated passes must complete a retired-case development challenge containing at least:

- three diagnostic positives and three diagnostic negatives;
- three reframe positives and three reframe negatives;
- positive and negative cases for object change, component contact, operation labels, verdict, and inferential consequence; and
- dyadic and multi-speaker cases.

Challenge performance is implementation preflight, not held-out promotion evidence. Its cases remain permanently excluded from future gates.

## Multi-speaker interaction map

Every inventory locks an opponent map before annotation:

- every burden-bearing participant and side;
- permitted opponent edges;
- same-side exchanges excluded from opponent-responsive credit;
- speaker-only ownership as the default;
- exact adoption records required before teammate ownership transfers; and
- the target-recency route for each responsive move.

Format routing follows interaction structure, not headcount. A nominally multi-person event may use the dyadic lane only when exactly two people bear substantive burdens and every other participant is preclassified as a moderator or nonargumentative host.

## Development and preflight

Before any held-out manifest is frozen:

1. extract all v2.7 semantic disagreements with source and artifact hashes;
2. validate the development input/key split and confirm the key is absent from each pass allowlist;
3. run two fresh 5.6 Sol challenge passes;
4. validate every schema, evidence offset, component set, eligibility rule, and derivation;
5. report semantic agreement separately from evidence-span agreement and cascade disagreement;
6. replay stable burden, reframe, graph, ownership, and source fixtures with zero regression;
7. test every executable write, no-write, stale-artifact, malformed-input, and complete-validation branch; and
8. freeze workflow, rubric, schemas, scripts, thresholds, selection rules, and source hashes before opening selected transcripts.

## Fresh lane gates

Each lane retains the v2.7 aggregate and per-debate semantic thresholds. No threshold may be lowered in response to v2.7:

- target-object exact ≥ 0.90;
- target-scope exact ≥ 0.85;
- target-burden exact ≥ 0.90;
- component-contact micro exact ≥ 0.90;
- responsive coverage exact ≥ 0.85 and kappa ≥ 0.75;
- defect-type exact ≥ 0.85;
- diagnostic-object exact ≥ 0.85;
- impact-mode exact ≥ 0.90;
- derived diagnostic exact ≥ 0.90;
- malformed-demand, replacement-demand, and reframe exact ≥ 0.90;
- bridge-set exact ≥ 0.80;
- burden exact ≥ 0.80 and kappa ≥ 0.70; and
- exact derived-tuple agreement ≥ 0.70.

Per-debate floors remain target object 0.75, component contact 0.80, responsive coverage 0.75, and impact mode 0.75. Operation-label and evidence-span agreement are reported diagnostics.

Hard gates require zero source, graph, opponent-map, ownership/adoption, recency, inventory-review, audio-verification, evidence-offset, derivation, contamination, unresolved-adjudication, missing-lock, schema-variant, or review-chain violations.

## Stop and promotion

- Any failed lane remains classification-only and is frozen as a failed attempt.
- A new attempt requires a new version, fresh seed, and disjoint debates.
- Adjudication never replaces original-pass reliability.
- A passing classification lane authorizes only preregistration of that lane's numerical gate.
- Production batches require the corresponding numerical gate.
- Corpus-wide authorization requires both lane numerical gates and a final mixed-format audit.

No score, reconstructed scorecard, Overall Commentary, AI Extension, ranking, or production-page mutation is authorized by v2.8 classification work.
