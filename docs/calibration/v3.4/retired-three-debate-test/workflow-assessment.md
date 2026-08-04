# v3.4 retired conservative dual-confirmation assessment

## Outcome

**FAIL — stopped before the final lock.** All six isolated Terra/Sol review contexts completed, but none of the six review artifacts satisfied the frozen validator. The zero-retry rule was honored: no model judgment was rerun, no final classification lock was produced, and no participant-performance scores or assessment prose were generated.

This result does not authorize a disjoint retired confirmation, held-out access, scoring, or production mutation.

## Execution record

- Six accepted isolated model contexts completed under ChatGPT subscription authentication.
- API keys were removed; metered API cost was **$0**.
- Model-output retries: **0**.
- One same-request stream recovery occurred after a connection reset; it did not create a second review attempt.
- Before the accepted run, six transports were rejected pre-inference because the response schema lacked an explicit JSON type. No model inference or review output occurred in those transports. The correction and rejection record were frozen before the accepted reviews.
- The frozen transcript, caption-event, source-manifest, and local audio-verification chain was reused; no transcription was purchased or rerun.

## Why the official gate failed

All six artifacts failed at least one invariant. The dominant failure was the boundary-evidence design: the validator required a second `boundaryEvidence` span whenever the example classification was non-`none`, while the manual described that field as an optional way to document why material remained inside the locked target. Reviewers therefore normally supplied `connectionEvidence` for a distinct example and left the redundant boundary span null.

Three Terra cases also retained a `contraryEvidence` span while selecting the default `relevantContraryMaterial=false`. Three other cases selected relevant contrary material while setting original target contact false, even though the inherited annotation invariant requires target contact for contrary material. These are genuine coupled-field failures, not merely JSON formatting differences.

## Semantic-only postmortem

The semantic-only diagnostic deliberately ignores artifact-validation failure to answer a narrower engineering question: would the decisions have passed if evidence-shape problems were overlooked? The answer is still no. This simulation is not an accepted merge or final lock.

- Shared raw errors corrected: **2 of 12**.
- Initially correct shared values harmed: **1**.
- Raw-conflict accuracy: **21 of 33 (63.6%)**.
- Unmapped Terra conflict decisions: **3**, all defect labels.
- Simulated coherent cases: **11 of 13**.
- Simulated final component accuracy: **83.9%**.
- Simulated exact-derived-tuple accuracy: **46.2%**.
- Simulated diagnostic positive recall: **0%**.
- Simulated reframe positive recall: **50%**.
- Classification thresholds passed: **2 of 13** (burden adjustment and burden relevance only).

The dual-confirmation exception did make two useful corrections: it removed an over-propagated component in Debate 62 and recovered the irrelevance diagnosis in Debate 185. It also introduced an incorrect scope narrowing in Debate 185. The three unmapped diagnostic conflicts reveal a second architectural problem: a de novo reviewer can identify a better label that neither raw pass supplied, but the candidate-only conflict rule must reject it. In Debate 154 case 15, both new reviewers selected the gold `invalid-inference` label, yet neither frozen raw candidate contained that value.

## Quality assessment

The conservative idea is sound: preserving shared values by default and requiring independent convergence sharply limits unilateral drift. The v3.4 implementation is not production-ready, however. It asks models to emit too many duplicated coupled fields and evidence states, then tries to enforce coherence after generation. That creates avoidable failure surfaces. More importantly, the semantic thresholds remained far below readiness even in a forgiving postmortem.

## Recommended v3.5 development step

Do not run another model gate yet. First build a deterministic semantic compiler and replay the six frozen v3.4 outputs through it as development fixtures.

1. Make reviewers return one atomic target-disposition bundle. Derive `originalTargetContact`, component coverage, contrary-material eligibility, and their null/default evidence states mechanically rather than asking the model to duplicate them.
2. Use `connectionEvidence` as the evidence for `distinct-connected-example`. Reserve `boundaryEvidence` only for `inside-locked-target`, matching the written manual.
3. Make defect label and consequence one atomic diagnostic bundle. Merge or reject the bundle as a unit so a defect from one source cannot be paired with an incompatible consequence from another.
4. Preserve Terra as the leading raw-conflict arbiter, but permit a third semantic value only when Terra and Sol independently converge on that exact alternative with qualifying evidence. This would recover genuine shared discoveries without allowing unilateral invention.
5. Keep shared burden values locked. For burden conflicts, use a smaller candidate-bound decision card; the full de novo reviews showed poor standalone burden accuracy.
6. Replace model-supplied offsets with exact evidence text and compute offsets deterministically. Reject absent or nonunique text before any merge.
7. Add a remote structured-output compatibility smoke test on a synthetic, gold-free fixture before freezing a paid or subscription model run.
8. Require the compiler to turn all six existing outputs into schema-valid annotations with zero discretionary repair, then run retrospective semantic fixtures. Only after that should a small, disjoint retired-development test be preregistered.

The held-out gate, scoring phase, Debate #1 reconstruction, and rollout to 195 debates remain out of scope until this sequence succeeds.
