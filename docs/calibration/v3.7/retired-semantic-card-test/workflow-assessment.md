# v3.7 retired semantic-card model comparison assessment

## Decision

**FAIL — benchmark audit required.** The preregistered comparison does not qualify either 5.6 Terra or 5.6 Sol for a larger retired replication, a held-out gate, numerical scoring, assessment prose, or production mutation.

This is not a clean finding that one model is inadequate and the other is suitable. Both models missed the absolute semantic thresholds, and both repeatedly converged on the same alternative to the retired expected label. The retired fixtures must therefore be audited before they are reused as promotion evidence.

## Execution result

- All eight isolated subscription-authenticated contexts completed in eight attempts.
- No model-output retries or same-request stream recoveries occurred.
- API keys were removed; metered API and transcription cost were **$0**.
- Seven of eight outputs passed deterministic validation.
- Terra's diagnostic output failed because `linkCueText: "because"` was not unique in Debate 154 case 15's source excerpt. The zero-retry rule was preserved.
- No participant scores, assessment prose, Overall Commentary, AI Extension, held-out access, or production mutation occurred.

## Preregistered semantic outcome

| Measure | 5.6 Terra | 5.6 Sol | Required |
| --- | ---: | ---: | ---: |
| All semantic fields | 35/45 (77.8%) | 32/45 (71.1%) | at least 41/45 each |
| Target-family fields | 21/26 | 20/26 | at least 23/26 each |
| Non-target fields | 14/19 | 12/19 | at least 18/19 each |
| Burden fields | 3/4 | 3/4 | 4/4 each |
| Cross-model agreement | \- | 39/45 (86.7%) | at least 41/45 |
| Valid output contexts | \- | 7/8 | 8/8 |

Terra scored three more retired-label matches than Sol, so it satisfied the relative no-more-than-two-behind-Sol rule. That relative result has no promotion value because Terra failed every absolute semantic threshold and one of its four outputs was invalid. Sol's valid serialization also does not compensate for its lower semantic result.

## Why the benchmark now needs review

The deterministic audit extraction found three distinct problems:

1. **Eight consensus-against-gold fields.** Terra and Sol independently selected the same value, and that shared value differed from the retired expected value. These include the Debate 154 component boundary, the Debate 185 diagnostic relation, a Debate 185 reframe relation, and a burden-candidate choice.
2. **Six model-vs-model disputes.** These are genuine unresolved judgment fields, concentrated in Debate 62 target boundaries, Debate 154 diagnostic type, and Debate 185 reframe detection.
3. **One structural failure.** Terra selected a plausible evidence cue but failed the exact-substring uniqueness contract. This is an output-compliance failure independent of whether its semantic label was right.

The shared divergences do not prove the models are correct. They do show that treating the retired labels as infallible would confound benchmark quality with model quality. The exact disputes, source excerpts, candidate values, hashes, and stop controls are frozen in `gold-audit-disagreements.json`.

## Workflow-quality assessment

| Component | Assessment |
| --- | --- |
| Isolation, provenance, and contamination control | Strong |
| Cost and retry control | Strong |
| Deterministic evidence validation | Strong, with one correctly rejected output |
| Model agreement | Below threshold |
| Agreement with retired fixtures | Poor for both models |
| Retired-fixture trustworthiness | Unresolved; material audit signal |
| Model-selection evidence | Insufficient |
| Production readiness | Not ready |

Operationally, v3.7 is a good calibration harness: it kept gold sealed, enforced isolated contexts, caught an exact-evidence defect, preserved zero retries, and prevented scoring or prose after failure. Measurement quality is not yet adequate because the expected semantic decisions themselves now have concentrated, independently reproduced challenges.

## Required next step

Run a narrow **AI-only, gold-blind v3.7.1 benchmark audit** before changing any expected card or testing more debates:

1. Limit the audit to the 14 extracted disputed fields; do not rescore uncontested fields.
2. Convert each field into anonymous, counterbalanced candidates so the judge cannot infer which value came from retired gold, Terra, or Sol.
3. Use two isolated 5.6 Sol audit passes. Deterministically extract their disagreements and use a third isolated 5.6 Sol pass only on those disagreements, consistent with the adjudicated-consensus policy.
4. Require exact source evidence and family-specific rationale, but derive evidence offsets and coupled fields mechanically.
5. Keep the retired expected labels unchanged unless the adjudicated audit selects an alternative under the frozen v3.7 rubric.
6. After any corrections, replay both model outputs against the audited key. Preregister the acceptance thresholds before opening the candidate seals.
7. Authorize a new retired semantic comparison only if the audited benchmark is internally coherent and both the correction rule and replay thresholds were frozen in advance.

The current evidence does not justify choosing Terra merely because it is cheaper, nor continuing with Sol merely because it serialized all four families. The benchmark must first become reliable enough to measure that choice.
