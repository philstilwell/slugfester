# v2.4 Held-Out Gate Workflow Assessment

## Decision

The v2.4 workflow is not ready for numerical scoring, the ten-debate gate, or deployment across all 195 debates. The classification-only held-out gate did not pass. The stop rule therefore blocks scorecards, reconstructed debate prose, Overall Commentary, AI Extensions, novelty maps, and rendering work.

This is a useful failure rather than a process failure. All source, isolation, inventory, schema, adjudication, and preservation controls passed. The test isolated the remaining unreliability to mechanism identification and burden-level classification instead of conflating it with target selection or numerical scoring.

## Preregistered results

| Gate | Required | Observed | Result |
|---|---:|---:|---|
| Target-coverage exact agreement | ≥ 0.85 | 0.8611 | Pass |
| Target-coverage Cohen's kappa | ≥ 0.75 | 0.8125 | Pass |
| Diagnostic exact agreement | ≥ 0.90 | 0.8333 | Fail |
| Diagnostic positive instances | ≥ 3 | 11 | Pass |
| Reframe exact agreement | ≥ 0.90 | 0.8333 | Fail |
| Reframe positive instances | ≥ 3 | 6 | Pass |
| Burden-relation exact agreement | ≥ 0.80 | 0.8056 | Pass |
| Burden-relation Cohen's kappa | ≥ 0.70 | 0.6622 | Fail |
| Exact complete-tuple agreement | ≥ 0.70 | 0.5833 | Fail |

All hard gates passed: 36 moves, zero final atomicity violations, zero final target-packet violations, zero source-hash mismatches, zero unresolved speaker attributions, zero unresolved annotation disagreements, zero missing locks, one annotation schema, and zero prohibited-input contamination.

## Debate-level profile

| Debate | Coverage | Diagnostic | Reframe | Burden | Complete tuple | Disputed fields |
|---|---:|---:|---:|---:|---:|---:|
| #35 — science and religion, four speakers | 0.8333 | 0.5833 | 0.7500 | 0.7500 | 0.5000 | 13 |
| #150 — resurrection evidence | 0.8333 | 1.0000 | 0.8333 | 0.9167 | 0.6667 | 5 |
| #190 — souls and personal identity | 0.9167 | 0.9167 | 0.9167 | 0.7500 | 0.5833 | 6 |

The multi-party #35 debate is the principal mechanism stress case. #190 shows that mechanism agreement can be high while the central-versus-subsidiary burden boundary remains unstable.

## What improved

### Evidence integrity

The complete local transcript/event/manifest chains validated for all three debates. Debate #150 used human captions; #35 and #190 used complete auto-caption chains. No paid transcription call was needed. Medium- or low-confidence spans were excluded because no local audio verification was supplied.

### Inventory quality

Independent review was materially necessary. Reviewers recorded 18 findings and made 13 repairs before classification. Repairs included non-earliest sampling, mixed-speaker boundaries, target contamination, burden omissions, and one excerpt boundary whose draft wording reversed the apparent meaning. After repair, every inventory hard gate was zero.

### Target coverage

The orthogonal coverage model passed both preregistered reliability gates. Five of 36 coverage calls differed: two `partial`/`substitution`, two `full`/`partial`, and one `relevant-nonanswer`/`substitution`. This is a substantial improvement over the v2.3 mutually exclusive response taxonomy and is adequate for another held-out test without relaxing its thresholds.

### Failure localization

Separating coverage, mechanism, and burden fields worked as intended. The workflow now shows whether annotators disagree about structural contact, the argumentative mechanism, or motion-level contribution. The v2.3 schema could not make that distinction cleanly.

## Remaining defects

### Diagnostic and reframe tests remain too interpretive

Each mechanism had six disagreements. The directions were balanced: four `false -> true` and two `true -> false` for both diagnostic and reframe. This is not merely one classifier being systematically permissive. Annotators still differ over whether an implication is explicit enough to count as a defect-to-target connection or a corrected demand.

The current binary definitions compress two judgments into one. `diagnostic` asks both whether a defect is identified and whether its consequence for the target is made explicit. `reframe` asks both whether the demand is shown malformed and whether a replacement demand is stated. Classifiers can agree on the passage while disagreeing over whether the second condition is sufficiently expressed.

### Burden relation needs a route model

Seven burden calls differed. Five were the boundary between `advances-central` and `advances-sub-burden`; one was `advances-central` versus `completes`; one was `advances-sub-burden` versus `topical-peripheral`. The final distribution was also concentrated in the two middle categories: 17 central and 16 sub-burden moves, with only three moves elsewhere. Exact agreement narrowly passed, but kappa failed because the dominant boundary was not operationally stable.

The strengthened exclusion rule prevented unsupported completion, but it does not give annotators a shared representation of the remaining motion-level bridges.

### Tuple reliability compounds field errors

Fifteen of 36 moves differed on at least one field, producing only 0.5833 exact-tuple agreement. The tuple gate correctly blocks downstream numerical constraints: individually plausible fields are not enough if the combined annotation packet is unstable.

## Quality assessment

| Workflow layer | Assessment | Production readiness |
|---|---|---|
| Local source chain and hash preservation | Strong | Ready |
| Speaker-confidence/audio exclusion rule | Strong | Ready |
| Atomic inventory after independent review | Strong, but review-intensive | Ready only with review retained |
| Target packets and target coverage | Reliable in this gate | Provisionally ready |
| Diagnostic mechanism | Insufficiently reliable | Not ready |
| Reframe mechanism | Insufficiently reliable | Not ready |
| Burden relation | Close on exact agreement; inadequate chance-corrected agreement | Not ready |
| Full annotation packet | Below gate | Not ready |
| Numerical scoring and composed assessment | Correctly untested | Not authorized |
| 195-debate operational scale | Too review- and adjudication-intensive at current reliability | Not ready |

Overall, v2.4 is a high-integrity calibration workflow but not yet a reliable production assessment workflow. Its strongest achievement is that it failed safely and diagnostically.

## Recommendations for v2.5

1. **Decompose mechanisms into observable subfields and derive the flags.** Replace one `diagnostic` judgment with `defectType` plus `targetImpactExplicit`; derive diagnostic true only when both qualify. Replace one `reframe` judgment with `malformedDemandExplained` plus `replacementDemandStated`; derive reframe true only when both are true.
2. **Require cited phrase-level evidence for every positive mechanism subfield.** The cited words must be inside the locked atomic move. A validator should reject a positive without evidence text and its source offset.
3. **Represent burden progress as a preregistered route graph.** For every adopted burden, lock its motion-level conclusion, central bridges, and subsidiary bridges. Annotators should record which bridge the act supplies or attacks and which required bridges remain; the relation label should then be calculator-derived.
4. **Keep the present coverage model and thresholds.** Do not change the five coverage labels or lower their gates. Add an explicit component-contact array so `full`, `partial`, and zero-contact outcomes can be derived from the locked target components.
5. **Retire these 36 moves to development data.** Use the 24 disputed fields and adjudicated rationales to improve v2.5, but never treat the same debates as a new held-out test.
6. **Run a fresh classification-only held-out gate before any scores.** Preregister a new metadata-selected three-debate sample, the derived-field schema, unchanged reliability thresholds, exact allowlists, and the same stop rule.
7. **Retain independent inventory review and add a triggered third check.** A third source review should be required when the first reviewer changes meaning, sampling eligibility, speaker ownership, or a target packet; purely clerical hash repairs do not need it.
8. **Do not run a numerical or composition pass until the new annotation gate passes.** In particular, do not create scorecards or AI Extensions as part of v2.5 taxonomy development.

## Promotion status

- Complete v2.4 three-debate numerical gate: **not authorized**
- Preregistered ten-debate gate: **not authorized**
- All 195 debates: **not ready**
