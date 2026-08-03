# v2.6 held-out workflow assessment

## Decision

The v2.6 annotation gate did **not pass**. Numerical scoring, reconstructed assessments, Overall Commentary, AI Extension, the ten-debate gate, and corpus-wide reassessment remain unauthorized.

The result is informative rather than a process failure. The preregistration remained immutable, all three full local transcript chains validated, two independent annotation passes were preserved, every disagreement was adjudicated, and all hard gates passed. The stop rule worked as intended.

## Gate results

| Gate | Required | Observed | Result |
| --- | ---: | ---: | --- |
| Component-contact micro exact | 0.90 | 0.9000 (36/40) | Pass |
| Responsive target relation | 0.90 | 0.8750 (21/24) | **Fail** |
| All-move coverage exact | 0.85 | 0.8611 (31/36) | Pass |
| All-move coverage kappa | 0.75 | 0.8158 | Pass |
| Responsive-only coverage exact | 0.80 | 0.7917 (19/24) | **Fail** |
| Defect type exact | 0.85 | 0.7500 (27/36) | **Fail** |
| Target-impact-explicit exact | 0.90 | 0.8056 (29/36) | **Fail** |
| Derived diagnostic exact | 0.90 | 0.8056 (29/36) | **Fail** |
| Malformed-demand exact | 0.90 | 1.0000 | Pass |
| Replacement-demand exact | 0.90 | 1.0000 | Pass |
| Contacted-bridge-set exact | 0.80 | 1.0000 | Pass |
| Derived reframe exact / positives | 0.90 / 3 | 1.0000 / 3 | Pass |
| Derived diagnostic positives | 3 | 9 | Pass |
| Burden exact / kappa | 0.80 / 0.70 | 1.0000 / 1.0000 | Pass |
| Exact derived tuple | 0.70 | 0.7222 | Pass |

Contact-operation exact agreement was `0.8000` (32/40). As preregistered, it is diagnostic only.

Every hard gate passed: 36 moves, 24 responsive moves, one schema variant, and zero source-hash, atomicity, target-packet, burden-route, component-graph, component-overlap, target-recency, inventory-review, evidence-offset, derivation, attribution, adjudication, missing-lock, or contamination violations.

## Debate-level results

| Debate | Target relation | Component contact | Responsive coverage | Floor result |
| --- | ---: | ---: | ---: | --- |
| #129 Plantinga–Law | 1.0000 | 0.8462 | 0.8750 | Pass |
| #173 Onaiyekan/Widdecombe–Fry/Hitchens | 0.7500 | 0.9286 | 0.6250 | **Fail: coverage** |
| #192 Tour–Swamidass | 0.8750 | 0.9231 | 0.8750 | Pass |

The #173 public, four-speaker debate contributed 41 of the 71 field-level primitive disagreements, compared with 6 for #129 and 24 for #192. That count includes evidence-bearing fields and is not itself an agreement rate, but the concentration is corroborated by #173's low defect-type (`0.5833`), target-impact (`0.5000`), diagnostic (`0.5000`), responsive-coverage (`0.6250`), and tuple (`0.4167`) agreement.

## What succeeded

1. **The component-contact repair worked at the preregistered boundary.** Contact improved from the retired v2.5 sample's `0.8182` to `0.9000` on the fresh v2.6 sample. Because the samples differ, this is evidence of generalization, not a controlled causal estimate. The result has no safety margin: it is exactly at threshold and is based on 40 comparable component judgments.

2. **Typed component graphs and exact operation evidence improved structural discipline.** All graph, overlap, and evidence-offset hard gates passed. Only four component-contact judgments disagreed, even though operation labels disagreed eight times. This supports the decision to derive production-relevant contact from operation presence while treating the specific operation label diagnostically.

3. **All-move coverage recovered.** Exact agreement rose from `0.8333` in v2.5 to `0.8611`, with kappa `0.8158`. The new responsive-only metric correctly revealed that the four trivially agreeing constructive `not-applicable` labels per debate partly conceal responsive instability.

4. **Burden and reframe layers remained stable.** Bridge sets, burden relation, malformed-demand, replacement-demand, and reframe judgments all achieved perfect exact agreement, with adequate positive power for reframes.

5. **Source and review controls worked.** All transcripts were already stored locally and validated; paid transcription calls were `0`. Independent inventory review changed two of three inventories. Both changes triggered third review, and the #192 third reviewer found seven additional semantic/atomic defects. The final inventories nevertheless cleared every hard audit.

6. **The stop rule and one-schema discipline worked.** All passes used one schema; no scores or presentation prose were generated; no failed metric was repaired after seeing results; and the final validator reproduced the analysis and decision.

## Why the gate failed

### 1. Target qualification and target substitution still overlap

The taxonomy allows a response that narrows strength, modality, temporal scope, or burden to be described either as a preserved-target `qualifies` operation or as a `strength`, `modality`, or `burden` substitution. Two #173 disagreements illustrate the collision: rejection of a mystical rationale for limbo and restriction of the motion to the Church's present goodness. Both passes could cite the same words while choosing different levels of the taxonomy.

The result was three `preserved` versus `substituted` disagreements, aggregate target-relation agreement of `0.8750`, and three downstream `partial` versus `substitution` coverage disagreements.

### 2. Responsive coverage missed by one judgment but failed materially in one stratum

Aggregate responsive coverage was `19/24`, one agreement below the `0.80` gate. This near miss should not be rounded or waived. More importantly, #173 achieved only `5/8`; its debate-level failure shows the aggregate miss is not mere threshold noise.

### 3. The unchanged diagnostic mechanism did not generalize

v2.6 intentionally carried forward v2.5's defect-type and explicit-impact rules. The fresh sample exposed a systematic liberal-versus-strict reading:

- all seven target-impact disagreements ran in the same direction (`true` in Pass A, `false` in Pass B);
- defect types disagreed nine times, including `none` versus `other`, `none` versus `missing-premise`, and alternative specific defect types; and
- most instability arose in analogies, alleged omissions, scope objections, and rhetorical adequacy verdicts in #173.

The current rule does not sharply distinguish an expressed criticism (for example, an analogy or “not good enough”) from an explicit inferential consequence for a locked target node. Because the diagnostic flag is conjunctively derived from defect type and explicit impact, those primitive disagreements propagated directly to diagnostic agreement.

### 4. Inventory validators enforce form better than semantic sufficiency

The draft inventories all passed structural validation, yet independent reviewers made 15 first-review repairs across #173 and #192, and the #192 third reviewer made seven more. The review system caught the defects, but the initial builder contract still permits excerpts or target graphs that are formally valid while semantically incomplete.

### 5. The sample remains small

Exact threshold results based on 24 responsive moves and 40 comparable components have substantial sampling uncertainty. Passing at exactly `0.90` is not yet evidence of a comfortable production margin. Debate-level floors appropriately exposed format sensitivity that an aggregate-only decision would have missed.

## Recommended v2.7 development contract

1. **Retire all three v2.6 debates from future held-out use.** Convert only their disagreement cases into development fixtures. Preserve the immutable v2.6 gate as evidence; do not relabel its results.

2. **Keep the successful graph/contact, burden, reframe, source, isolation, evidence, and hard-gate machinery unchanged.** Reopening stable modules would create unnecessary degrees of freedom.

3. **Replace the single target-relation judgment with orthogonal primitives.** At minimum classify:

   - target object: `same` or `changed`;
   - commitment/scope: `same`, `narrowed`, or `strengthened`; and
   - burden: `retained`, `reassigned`, or `replaced`.

   Derive substitution only from a changed object or replaced burden. A narrower direct answer can remain node-annotatable instead of competing arbitrarily with `qualifies`. Validate this proposal against every retired relation and coverage disagreement before freezing it.

4. **Make diagnostic objects explicit.** A positive defect judgment should identify a locked component, inference, burden bridge, demand, or explicitly stated opposing claim. Constructive moves need an identified diagnostic object rather than an implicit generalized opponent.

5. **Separate criticism evidence from impact-link evidence.** Derive `targetImpactExplicit` only when an exact phrase states what the defect does to the identified object or conclusion. Analogy, ridicule, omission language, or a bare adequacy verdict should not count unless the inferential consequence is verbally linked. Add contrast cases for every one of the seven directional impact disagreements.

6. **Remove or constrain `other`.** Prefer a small public-reason supplement—such as irrelevance, evidential insufficiency, scope mismatch, or attribution error—or require `other` to carry a locked object and a normalized defect proposition. Development replay must show that the refinement reduces, rather than merely redistributes, disagreements.

7. **Make responsive-only coverage the primary coverage promotion metric.** Continue reporting all-move coverage and kappa, but do not let constructive `not-applicable` agreement compensate for unstable responses.

8. **Strengthen inventory semantic review.** Require an explicit “minimum complete meaning unit” check for each source and target excerpt, and a target-claim/component entailment check. Keep triggered third review; additionally require a second review for every calibration inventory in a multi-speaker debate or whenever the first reviewer changes any meaning-bearing field.

9. **Run development tests before another gate.** Build fixtures from the 3 target-relation, 5 coverage, 9 defect-type, and 7 impact disagreements; perform leave-one-debate-out replay; require zero rule-induced regressions on the stable contact/burden/reframe fixtures; and freeze all denominator and derivation code before selecting new metadata.

10. **Use a larger fresh classification gate.** Prefer five debates (60 moves), including at least two multi-speaker or public-reason formats, so the workflow must generalize beyond analytic dyads. Keep debate-level floors and the no-score stop rule. Only a clean pass should authorize a numerical gate.

## Readiness assessment

The workflow is **not ready for numerical reassessment or application to 195 debates**. Its operational controls are strong, its transcript access is adequate, and the component-contact repair is promising. The remaining blocker is classification reliability: target-scope/burden changes and diagnostic explicitness are not yet mutually exclusive or consistently anchored across debate formats.

The next logical step is a v2.7 development-only revision focused on those two boundaries, followed by a newly preregistered fresh classification gate. No production debate content should be changed before that gate passes.
