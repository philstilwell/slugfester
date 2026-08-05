# v3.8.11 retired three-debate gate assessment

## Decision

**Fail. Do not reconstruct assessment prose, open another held-out gate, or apply this workflow to the 195 debates.**

The v3.8.11 execution architecture worked as designed, but the underlying score judgments were not repeatable enough. Both formal scoring gates must be preserved: the two passes produced a materially disputed scalar-field rate of **165/567 = 0.291005**, above the formal maximum of **0.25**, and their six side/debate totals had Spearman rank correlation **0.885714**, below the required **0.90**.

No `Overall Commentary`, `AI Extension`, or other publication prose was generated. The failure occurred before reconstruction authorization.

## What passed

| Check | Result |
| --- | --- |
| Exact scoring-schema and packet preflight | Pass, one attempt |
| Independent scoring contexts | Pass, 6/6 first attempt |
| Move judgments | 162/162 valid |
| Scoring retries | 0 |
| Dispute-only adjudication contexts | Pass, 3/3 first attempt |
| Disputed moves decided | 76/76 |
| Anonymous candidate choices | 243/243 |
| Adjudication retries | 0 |
| Medium-confidence disputed moves | 17/17 carried inherited audio verification |
| Third candidate values invented | 0 |
| Final-ledger fields independently checked | 567/567 |
| Burden-adjustment exclusion | All final adjustments remained zero |
| Winner classifications | Identical across Pass A, Pass B, and final for all three debates |
| Maximum overall Pass A/B delta | 4, within maximum 5 |
| Metered model API cost | $0; ChatGPT subscription authentication |
| New transcription cost | $0 |

These results are a substantial procedural improvement over v3.8.9 and v3.8.10. Packet-aware validation, removal of lexical rationale tests, one-attempt execution, isolation, audio evidence, deterministic disagreement extraction, and score-after-adjudication ordering are all working.

## What failed

| Gate | Observed | Required | Result |
| --- | ---: | ---: | --- |
| Material scalar-dispute rate | 0.291005 | no greater than 0.25 | Fail |
| Held-out authorization scalar rate | 0.291005 | no greater than 0.23 | Fail |
| Spearman rank correlation across six side totals | 0.885714 | at least 0.90 | Fail |
| Maximum overall pass delta | 4 | no greater than 5 | Pass |
| Identical winner classifications | 3/3 | 3/3 | Pass |

The final calculated scores, retained only as calibration evidence, were:

| Debate | Pro | Con | Classification |
| --- | ---: | ---: | --- |
| 55 | 71 | 81 | Con |
| 103 | 76 | 67 | Pro |
| 161 | 68 | 78 | Con |

## Instability diagnosis

The problem is concentrated in dimensions that still require judges to invent structural interpretations during the scoring pass.

| Dimension | Material-dispute rate | Mean absolute delta | Maximum delta |
| --- | ---: | ---: | ---: |
| Precision/clarity | 0.432099 | 5.123457 | 19 |
| Epistemic calibration | 0.419753 | 5.246914 | 20 |
| Responsiveness | 0.395062 | 5.358025 | 23 |
| Logical coherence | 0.271605 | 3.592593 | 13 |
| Representational charity | 0.271605 | 4.209877 | 18 |
| Evidence/warrant | 0.197531 | 3.271605 | 18 |
| Relevance/burden | 0.049383 | 2.000000 | 8 |

The locked burden-contact system is highly repeatable. The main remaining weakness is the open-ended classification work inside responsiveness, precision, calibration, and charity.

The debate-level split confirms that this is not merely uniform random noise:

| Debate | Material-dispute rate | Response-tuple disputes | Disputed moves |
| --- | ---: | ---: | ---: |
| 55 | 0.193878 | 11 | 24/28 |
| 103 | 0.394286 | 11 | 24/25 |
| 161 | 0.295918 | 9 | 28/28 |

Debate 103 is the clearest stress failure. A workflow suitable for a heterogeneous 195-debate corpus cannot rely on Debate 55's stronger result while performing this inconsistently on the other formats.

## Required v3.8.12 remediation

1. **Prelock response-component inventories.** For every permitted response target, the coverage stage must assign stable component IDs and exact indispensable-component text. Scoring passes should mark contacted component IDs; repository code should derive component counts and the response class. Judges should no longer independently reconstruct the component inventory.
2. **Prelock whether charity is tested.** Treat `charityTested` as a source/structure classification completed before scoring. A scoring judge evaluates charity only when the locked flag is true; otherwise repository code fixes the value at 75.
3. **Replace broad precision scoring with observable subanchors.** Require closed findings for proposition recoverability, term stability, scope stability, and qualification explicitness, then map the finding pattern to the permitted score band. Truth, warrant, and responsiveness defects remain excluded.
4. **Replace broad calibration scoring with claim-strength matching.** Lock the move's strongest asserted modal/epistemic force and require closed findings for hedging, evidential fit, and acknowledged uncertainty before mapping to a score band.
5. **Derive responsiveness only after the structural response decision.** Once component contact and class are fixed, the permissible responsiveness band should be mechanically constrained. The judge may choose within that band only for the quality of the contact already established.
6. **Add boundary fixtures from all three failed dimensions.** The synthetic preflight must include actual-shaped cases spanning full versus partial answer, relevant nonanswer versus diagnostic defeat, clear-but-unsound versus unclear, and hedged possibility versus asserted necessity. Fixtures must test both sides of every band boundary without exposing legacy scores.
7. **Keep all existing thresholds.** Do not lower the 0.90 Spearman floor or raise the 0.25 scalar ceiling. v3.8.12 must pass the same retired three-debate gate cleanly before reconstruction resumes.

## Quality assessment

The workflow is **procedurally strong but psychometrically not ready**.

- Execution and provenance integrity: **high**.
- Transcript/source access and audio controls: **high**.
- Isolation and no-retry enforcement: **high**.
- Deterministic ledger and calculator integrity: **high**.
- Inter-pass scoring repeatability: **insufficient**.
- Readiness for another held-out gate: **no**.
- Readiness for the 195-debate rollout: **no**.

The next authorized action is to implement v3.8.12's structural locks and closed subanchors, then rerun this same retired three-debate gate from fresh isolated contexts. Reconstruction, including the toggleable `AI Extension`, remains downstream of a clean reliability pass.
