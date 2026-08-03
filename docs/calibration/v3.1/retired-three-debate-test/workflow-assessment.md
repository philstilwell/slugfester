# v3.1 retired three-debate workflow assessment

## Decision

**Reject v3.1 for held-out testing and corpus production.** The execution controls worked, but the focused-verifier architecture did not meet the frozen accuracy thresholds. The AI-only operating assumption remains in force; this result does not recommend human adjudication.

The gate used 3 retired debates, 13 locked response cases, and 161 semantic primitives. It ran two independent full 5.6 Sol passes per debate and four isolated field-family verification contexts per debate. All accepted outputs were produced through subscription-authenticated Codex contexts with API keys removed. The metered API cost was $0.

## Gate result

| Measure | Result | Threshold | Gate |
| --- | ---: | ---: | --- |
| Original-target contact | 100.0% | 95% | Pass |
| Scope | 46.2% | 90% | Fail |
| Burden adjustment | 84.6% | 95% | Fail |
| Component-contact micro accuracy | 74.2% | 90% | Fail |
| Coverage | 61.5% | 85% | Fail |
| Defect type | 38.5% | 85% | Fail |
| Consequence | 69.2% | 90% | Fail |
| Complete diagnostic | 69.2% | 90% | Fail |
| Complete reframe | 76.9% | 90% | Fail |
| Burden relevance | 61.5% | 90% | Fail |
| Exact derived tuple | 7.7% | 80% | Fail |
| Diagnostic-positive recall | 66.7% | 80% | Fail |
| Reframe-positive recall | 100.0% | 100% | Pass |
| Unresolved fields | 0 | 0 maximum | Pass |
| Medium/low-confidence audio verification | 100.0% | 100% | Pass |

Connected-example accuracy, which is monitored but has no separate frozen gate, was 53.8%. Overall, 4 of 15 gates passed and 11 failed.

## What worked

- Every accepted Sol context was fresh, ephemeral, read-only, subscription-authenticated, and restricted to five allowlisted inputs.
- The six raw passes, 12 focused family outputs, disagreement ledgers, final locks, and scoring-input boundaries all validate.
- Semantic conflicts, evidence-only differences, and exact agreements were separated deterministically.
- Every primitive was judged once; the merge produced zero unresolved fields.
- Exact evidence offsets validated, and evidence was canonicalized only after semantic selection.
- The one medium-confidence move was verified against retained audio, for a 100-percent source gate.
- No participant score, Overall Commentary, or AI Extension content entered the classification passes.

These are meaningful operational strengths. They make the failure legible and reproducible, but they do not compensate for semantic inaccuracy.

## Why the architecture failed

### Same-model agreement was not independent evidence

Pass A and Pass B agreed on 145 of 161 primitives, yet 34 of those agreements were wrong: a 23.4-percent shared-error rate. High A/B agreement therefore overstated reliability. In particular, A and B agreed perfectly with each other on defect, consequence, diagnostic, reframe, and burden relevance while remaining materially wrong against the frozen key.

### Authoritative focused verification caused more harm than repair

The focused verifiers overrode 20 shared A/B agreements. Only 5 overrides corrected a shared error; 14 changed a correct agreement into an error, and 1 changed one wrong value into another wrong value. The focused stage corrected only 5 of 34 shared errors, or 14.7 percent.

On the 16 genuine A/B semantic conflicts, at least one raw candidate was correct in all 16 cases. The focused verifier selected the correct result in only 7 cases, or 43.8 percent. Giving that verifier unconditional semantic authority was therefore empirically unjustified.

### The dominant error was over-classification

The focused contexts repeatedly treated ordinary criticism or redirection as a formal scope change, defect, consequence, or reframe. Defect accuracy fell to 38.5 percent; examples included classifying claims of irrelevance, invalid inference, evidential insufficiency, scope mismatch, and contradiction where the frozen rubric required another defect or the default `none`.

The targeting/burden verifier also changed five correct central burden contacts in Debate #154 to `none`, reducing burden-relevance accuracy from v3.0's 100 percent to 61.5 percent. This shows that smaller field-family packets did not reliably preserve debate-route context.

### Improvements were real but insufficient

Relative to v3.0, v3.1 improved component-contact micro accuracy by 9.7 points; coverage, defect, consequence, and diagnostic accuracy each by 7.7 points. It simultaneously reduced burden relevance by 38.5 points and diagnostic-positive recall by 33.3 points. Exact derived-tuple accuracy remained 7.7 percent. The net workflow did not become publishably reliable.

## Quality assessment

- **Execution integrity: high.** Isolation, provenance, evidence validation, audio policy, deterministic merging, and score deferral worked as designed.
- **Classification reliability: low.** Most semantic gates missed by large margins, and exact case-level structural agreement was only 1 of 13 cases.
- **Scoring readiness: not acceptable.** Scores are correctly deferred, but the classifications from which scores would be derived are too unstable.
- **Corpus readiness: no.** Applying v3.1 to 195 debates would create systematic, consistently formatted error rather than consistent assessment.

## Recommended AI-only repair

Develop v3.2 as a conservative, risk-triggered adjudication workflow:

1. Keep two independent full Sol passes and semantic/evidence separation.
2. Deterministically mark as disputed both A/B semantic conflicts and preregistered high-risk agreements. High-risk agreements should include nondefault scope, burden adjustment, defect, diagnostic, and reframe claims, plus default component-contact results when the response contains direct lexical overlap with an indispensable component.
3. Give the third isolated Sol pass only those disputed primitives. Require it to choose between the eligible semantic candidates when A/B disagree; do not permit a novel third label unless neither candidate is structurally eligible.
4. Replace the generic family prompt with field-specific conservative decision cards containing short positive, negative, and near-miss anchors learned from the retired error set. Each card must require a default-first decision and an explicit falsification check before a nondefault value is accepted.
5. Treat shared A/B agreement as the default lock. Permit an override only when the third pass satisfies the field-specific evidence rule and a deterministic override predicate. Do not make the third pass universally authoritative.
6. Preserve a machine-readable uncertainty flag for close AI decisions, but continue to derive the one canonical score only after the adjudicated lock. The uncertainty flag must not create a second scoring path.
7. Rerun the same retired three-debate gate with unchanged gold and thresholds. Do not open another held-out gate unless every frozen gate passes.

This repair preserves AI authorship while responding directly to the measured failure: correlated agreement requires targeted audit, but a third same-model judgment is not reliable enough to overwrite all agreements indiscriminately.
