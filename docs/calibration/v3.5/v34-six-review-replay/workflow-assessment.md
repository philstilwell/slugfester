# v3.5 deterministic semantic-compiler replay assessment

## Outcome

**COMPILER PASS — SEMANTIC READINESS FAIL.** The v3.5 compiler successfully converted all six frozen v3.4 review artifacts into valid annotations and built valid retrospective replay locks. It used no model context, transcription, API billing, discretionary repair, fallback, score, or production mutation.

The replay does not authorize another model gate. Its final classifications still miss most frozen semantic thresholds and retain three unresolved atomic diagnostic bundles.

## Structural result

- Compiled artifacts: **6 of 6 valid**.
- Compiled review cases: **26 of 26 valid**.
- Replay-lock cases: **13 of 13 valid**.
- Exact evidence texts resolved and offsets derived: **115**.
- Inactive redundant evidence values discarded under preregistered null/default rules: **3**.
- Review target dispositions mechanically derived from positive contrary material: **3**.
- Final-lock projection changes after arbitration: **0**.
- Discretionary repairs: **0**.
- Fallback cases: **0**.
- Medium/low-confidence moves audio verified: **1 of 1**.
- Model contexts, paid transcription, and metered API cost: **0 / 0 / $0**.

This establishes that the v3.4 serialization failures were avoidable. Distinct-example evidence, inside-target boundary evidence, target/contrary coupling, null defaults, evidence offsets, and final annotation coherence can all be handled deterministically.

## Semantic result

Only **2 of 14** readiness conditions passed: burden adjustment and burden relevance.

| Measure | v3.5 replay | Required |
| --- | ---: | ---: |
| Original target contact | 92.3% | 95% |
| Scope | 84.6% | 90% |
| Burden adjustment | 100% | 95% |
| Component contact | 83.9% | 90% |
| Coverage | 76.9% | 85% |
| Defect type | 61.5% | 85% |
| Consequence | 69.2% | 90% |
| Diagnostic | 69.2% | 90% |
| Reframe | 84.6% | 90% |
| Burden relevance | 92.3% | 90% |
| Exact derived tuple | 46.2% | 80% |
| Diagnostic-positive recall | 0% | 80% |
| Reframe-positive recall | 50% | 100% |
| Unresolved fields | 3 | 0 |

The replay corrected **2 of 12** shared raw errors and harmed **1** initially correct shared value, matching the central v3.4 tendency. Raw-conflict accuracy was **19 of 33 (57.6%)**. The atomic-bundle rule correctly refused to mix diagnostic pieces, but that conservative behavior reduced conflict accuracy from the looser v3.4 semantic simulation.

All three unresolved fields were diagnostic bundles in Debate 154:

- Case 09: Terra chose `unsupported-comparison`; Sol chose `scope-mismatch`.
- Case 12: Terra chose `scope-mismatch`; Sol chose `ambiguity`.
- Case 15: both chose `invalid-inference`, but they disagreed on whether a separate consequence was stated. Because defect and consequence are atomic, this was not exact dual convergence.

## Quality assessment

The workflow is now **structurally reliable but semantically inadequate**. The deterministic compiler should be retained: it eliminated every artifact-validity failure without hiding any unresolved judgment. Its zero-change final projection also shows that coherence was constructed before validation rather than recovered by fallback.

The remaining bottleneck is classification judgment, especially diagnostics, consequences, reframes, and component boundaries. Reusing the same full de novo reviews cannot solve that problem. Relaxing atomic diagnostics or the unresolved-field gate would make the numbers look better by admitting cross-source combinations that neither reviewer actually endorsed; that would reduce audit quality.

## Recommended next step

Build a **v3.6 targeted semantic-decision stage** before any new debate-level model gate:

1. Preserve the v3.5 compiler unchanged as the mandatory serialization layer.
2. Replace the complete de novo review with small family-specific cards: target/component/example, diagnostic bundle, reframe bundle, and burden conflict.
3. For diagnostics, ask first for exact defect-cue text, then exact consequence-cue text, and derive eligibility before requesting a label. A consequence proposal must identify the explicit connective between the defect and what fails.
4. Use minimal candidate-bound cards for burden conflicts; keep shared burden values locked.
5. Create synthetic contrast fixtures plus the retired diagnostic and reframe cases. Require exact bundle agreement and the existing positive-recall thresholds before opening a disjoint retired debate.
6. Run a remote structured-output smoke test on one gold-free synthetic fixture before any subscription model batch. Freeze schema compatibility and retry rules before the test.
7. Keep scoring, Overall Commentary, AI Extension generation, held-out access, and production mutation blocked until a later disjoint retired test passes.

The immediate next implementation should therefore be the zero-cost v3.6 decision-card schema, deterministic cue/link validator, and synthetic/retired fixture suite. Only its final model execution would require a fresh cost estimate and explicit approval.
