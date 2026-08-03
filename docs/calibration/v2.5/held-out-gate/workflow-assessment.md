# v2.5 Held-Out Gate Workflow Assessment

## Decision

The v2.5 workflow is not ready for numerical scoring, a ten-debate gate, or reassessment of all 195 debates. The classification-only held-out gate did not pass, so the preregistered stop rule blocks scorecards, reconstructed debate prose, Overall Commentary, AI Extension, novelty mapping, and rendering.

The gate nevertheless validates the central v2.5 repair. Decomposing mechanism and burden judgments into observable primitives and deriving their labels converted every v2.4 failure in those areas into a pass. The remaining reliability defect is now localized to component contact and the target-coverage label derived from it.

## Preregistered results

| Gate | Required | Observed | Result |
|---|---:|---:|---|
| Component-contact micro exact agreement | ≥ 0.90 | 0.8182 (45/55) | **Fail** |
| Target-preservation exact agreement | ≥ 0.90 | 0.9167 | Pass |
| Defect-type exact agreement | ≥ 0.85 | 0.9167 | Pass |
| Target-impact-explicit exact agreement | ≥ 0.90 | 0.9722 | Pass |
| Malformed-demand-explained exact agreement | ≥ 0.90 | 0.9444 | Pass |
| Replacement-demand-stated exact agreement | ≥ 0.90 | 0.9722 | Pass |
| Contacted-bridge-set exact agreement | ≥ 0.80 | 0.8611 | Pass |
| Derived target-coverage exact agreement | ≥ 0.85 | 0.8333 | **Fail** |
| Derived target-coverage Cohen's kappa | ≥ 0.75 | 0.7736 | Pass |
| Derived diagnostic exact agreement | ≥ 0.90 | 0.9722 | Pass |
| Adjudicated diagnostic positives | ≥ 3 | 16 | Pass |
| Derived reframe exact agreement | ≥ 0.90 | 0.9444 | Pass |
| Adjudicated reframe positives | ≥ 3 | 7 | Pass |
| Derived burden-relation exact agreement | ≥ 0.80 | 0.9722 | Pass |
| Derived burden-relation Cohen's kappa | ≥ 0.70 | 0.9560 | Pass |
| Exact derived-tuple agreement | ≥ 0.70 | 0.7222 | Pass |

All hard gates passed: 36 moves, zero final inventory atomicity, target-packet, burden-route, source-hash, evidence-offset, derivation, speaker-attribution, unresolved-disagreement, missing-lock, schema-variant, or prohibited-input violations. All three local transcript chains were used, and no paid transcription call was needed.

## Debate-level profile

| Debate | Component contact | Target preserved | Coverage | Diagnostic | Reframe | Bridge set | Burden | Tuple | Primitive disputes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| #184 — four-speaker moral realism | 0.9333 | 0.7500 | 0.7500 | 1.0000 | 0.8333 | 1.0000 | 1.0000 | 0.5833 | 14 |
| #130 — resurrection/history | 0.6800 | 1.0000 | 0.8333 | 1.0000 | 1.0000 | 0.7500 | 0.9167 | 0.7500 | 17 |
| #185 — free will/responsibility | 0.9333 | 1.0000 | 0.9167 | 0.9167 | 1.0000 | 0.8333 | 1.0000 | 0.8333 | 15 |

The component-contact failure is concentrated in #130: eight of the ten component disagreements occurred there. The target-preservation and coverage weakness is concentrated in #184: all three target-preservation disagreements occurred there, and coverage agreement was 0.7500.

## What v2.5 fixed

### Mechanism identification

The v2.4 diagnostic and reframe exact-agreement rates were both 0.8333. In v2.5 they rose to 0.9722 and 0.9444 while retaining substantial positive counts. Exact cited phrases and calculator-derived flags successfully removed most disagreement about whether a move performed a diagnostic or reframe.

### Burden relation

The v2.4 burden result was 0.8056 exact agreement with kappa 0.6622. The locked route graph and contacted-bridge derivation raised those figures to 0.9722 and 0.9560. Only one of 36 derived burden labels differed. The burden-adjustment exclusion rule is no longer the principal reliability bottleneck.

### Complete annotation packet

Exact derived-tuple agreement improved from 0.5833 in v2.4 to 0.7222 and passed its gate. Ten moves differed on at least one derived field, down from fifteen. This is meaningful progress even though the independent component-contact and coverage gates correctly block promotion.

### Evidence and process integrity

All exact evidence offsets, derivations, source hashes, isolation declarations, and final locks validated. Forty-six primitive disagreements were explicitly adjudicated with none unresolved. The workflow failed semantically rather than procedurally.

## Remaining defects

### `addressed` still compresses several judgments

The ten component disagreements expose the same kind of compression that v2.5 removed from mechanisms. `addressed` currently combines whether the act identifies the component, what operation it performs on that component, and whether a collective or inferential challenge counts as contact.

The clearest stress case was #130. One pass treated an attack on a factual conjunction's comparative implication as contact with each fact in the conjunction; the other treated it as contact only with the inferential component. Both readings are compatible with the present broad verbs—accepts, denies, distinguishes, qualifies, explains, or undermines—so exact leaf-level contact is not yet operationally determined.

### Component architecture mixes premises and inferences

Several target packets place factual premises beside an inference or burden conclusion as parallel indispensable components. A response can attack the inference while leaving the premises untouched, or refer to the premises collectively without separately evaluating them. The current schema does not type those nodes or represent their dependency, which makes component granularity and indirect contact unstable.

### Contact is recorded even after target substitution

Coverage mechanically becomes `substitution` when `targetPreserved` is false, yet classifiers still annotate every component contact. Two of the ten contact disagreements occurred on a #130 move both passes already classified as non-preserving. Those judgments cannot affect coverage but still count against the primitive gate. The next schema should make their applicability explicit instead of measuring an unused field.

### Aggregate passes can conceal a stratum weakness

Target preservation passed overall at 0.9167, but #184 achieved only 0.7500. The four-speaker format and rapid target shifts remain a distinct risk. A future preregistration should include debate-level guardrails selected from development evidence, not rely only on aggregate rates.

### Inventory preparation remains review-intensive

The first reviews made 17 repairs, and all three debates triggered third review. The #184 third review found three additional repairs. The 20 total repairs included sampling, speaker ownership, atomicity, target packets, meaning, and burden routes or tiers. Third review was therefore necessary, but a six-fresh-task classification pipeline per debate is not yet economical for 195 debates.

## Quality assessment

| Workflow layer | Assessment | Production readiness |
|---|---|---|
| Local transcript/event/manifest chain | Strong | Ready |
| Hash, isolation, schema, and derivation controls | Strong | Ready |
| Speaker-confidence and audio rule | Strong | Ready |
| Inventory after two reviews | Strong but expensive | Retain; optimize before scale |
| Target preservation | Aggregate pass; weak in one stratum | Provisional only |
| Component contact | Below gate; definition underdetermined | Not ready |
| Derived target coverage | Kappa passed; exact agreement failed | Not ready |
| Diagnostic and reframe derivation | Strong | Ready for another held-out test |
| Burden-route derivation | Strong | Ready for another held-out test |
| Complete derived tuple | Passed | Provisional, subordinate to failed fields |
| Numerical scoring and composed assessment | Correctly untested | Not authorized |
| All-195 operational scale | Too review-intensive and semantically incomplete | Not ready |

As a calibration and failure-localization system, v2.5 is high quality. As a production debate-assessment workflow, it is not ready because responsiveness still depends on an unstable component-contact primitive.

## Recommended v2.6 work

1. **Decompose component contact.** Replace binary `addressed` with a nullable observable operation such as `accepts`, `denies`, `distinguishes`, `qualifies`, `explains`, or `undermines`, plus an exact supporting phrase. Derive `addressed` from a qualifying operation and valid evidence.
2. **Type and graph target components.** Mark nodes as factual premise, rule/comparison, inference, burden, modality, or conclusion, and record dependency edges. A challenge to an inference should not mechanically contact its premises; a collective reference should count only under a written range rule.
3. **Make contact applicability explicit.** Decide target preservation first. If it is false, either make component contacts `not-applicable` or exclude them from contact reliability and derivation. Preregister that choice before another held-out run.
4. **Add non-overlap and immediate-target linting.** Automatically flag duplicate/entailed components, non-immediate responsive targets, mixed-speaker spans, and eligible bridges that do not belong to the locked primary route. Keep both human reviews until a fresh gate shows a lower repair rate.
5. **Convert this sample to development data.** Use the ten contact disagreements, six coverage disagreements, three preservation disagreements, and their final locks as v2.6 examples. These debates must never be reused as held-out evidence.
6. **Add stratum-aware diagnostics and preregistered debate-level floors.** Use development results to choose floors before sample selection, especially for multi-speaker debates. Do not invent or relax thresholds after seeing a held-out result.
7. **Run another fresh classification-only gate.** Select three new debates from metadata, preserve the present mechanism and burden rules, and test only the revised target/contact layer plus all unchanged gates. Do not run numerical scoring in parallel.
8. **Measure operational cost before scale.** Record builder, first-review, third-review, two-pass, and adjudication time per debate. Require an acceptable repair and task-hour profile before a ten-debate or 195-debate commitment.

## Promotion status

- Complete v2.5 three-debate numerical gate: **not authorized**
- Preregistered ten-debate gate: **not authorized**
- All 195 debates: **not ready**

