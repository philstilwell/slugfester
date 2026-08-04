# Workflow v3.3 retired bake-off assessment

## Decision

Workflow v3.3 did **not** pass the retired three-debate gate. Neither 5.6 Terra nor 5.6 Sol qualified, so no model was selected and no disjoint retired confirmation, held-out gate, numerical scoring, production prose, or production-debate mutation is authorized.

The experiment nevertheless separated operational reliability from semantic reliability cleanly. Its isolation, schema, evidence, provenance, and stop controls worked; its adjudication policy did not produce sufficiently accurate final classifications.

## Execution audit

- Reused the frozen v3.2 source chain, gold keys, audio audit, and two accepted raw passes without rerunning transcription or raw annotation.
- Froze 41 dependency bundles and 137 routed decisions across 13 cases in three varied retired debates.
- Counterbalanced sealed X/Y provenance 69/68; candidate seals were never model-visible.
- Completed six of six subscription-authenticated contexts in six attempts with zero resampling retries and $0 metered API cost.
- Validated every output against packet order, canonical semantic allowlists, exact source substrings, and reconstructed complete-annotation invariants.
- Preserved all 24 unrouted burden agreements per variant with zero unflagged alterations.
- Verified the sole medium-confidence move against retained audio; source-gate coverage remained 100 percent.
- Kept participant scores and production prose absent.

## Accuracy outcome

| Metric | Raw Terra | v3.2 final | v3.3 Terra | v3.3 Sol | Required |
| --- | ---: | ---: | ---: | ---: | ---: |
| Target contact | 92.3% | 100.0% | 100.0% | 100.0% | 95% |
| Scope | 92.3% | 84.6% | 84.6% | 76.9% | 90% |
| Component micro | 80.6% | 80.6% | 74.2% | 61.3% | 90% |
| Coverage | 69.2% | 69.2% | 61.5% | 53.8% | 85% |
| Defect type | 61.5% | 61.5% | 61.5% | 69.2% | 85% |
| Consequence | 76.9% | 76.9% | 76.9% | 76.9% | 90% |
| Diagnostic | 76.9% | 76.9% | 76.9% | 76.9% | 90% |
| Reframe | 100.0% | 69.2% | 92.3% | 76.9% | 90% |
| Burden relevance | 84.6% | 92.3% | 92.3% | 92.3% | 90% |
| Exact derived tuple | 53.8% | 46.2% | 30.8% | 30.8% | 80% |
| Diagnostic positive recall | — | 33.3% | 0.0% | 66.7% | 80% |
| Reframe positive recall | — | 0.0% | 100.0% | 50.0% | 100% |

Terra cleared target contact, burden relevance, reframe exactness, and reframe-positive recall. Sol cleared target contact and burden relevance. Both missed the central component, coverage, diagnostic, and exact-tuple thresholds by large margins.

## What the anonymous comparison established

Terra was materially better at selecting among raw conflicts: 22 of 33 conflict fields were correct (66.7 percent), compared with 15 of 33 for the v3.2 Sol adjudicator and 13 of 33 for the v3.3 Sol blind variant. Terra was especially stronger on component conflicts (6/7), targeting conflicts (5/7), and reframe conflicts (8/10). Its weakness was diagnostic conflict classification (2/7).

Sol was stronger on diagnostic conflicts (4/7) and diagnostic-positive recall (2/3), but it was weak on component conflicts (1/7) and reframe conflicts (3/10). It also produced two valid third labels on raw diagnostic conflicts—`scope-mismatch` and `invalid-inference`—that could not map to either sealed candidate, correctly triggering the zero-unmapped stop rule.

The decisive failure came from treating every fragile shared agreement as open to de novo replacement. Terra corrected only 2 of 12 shared raw errors while making six previously correct shared values wrong. Sol corrected 1 of 12 and likewise made six previously correct shared values wrong. The shared-agreement falsification stage therefore had negative net value for both models.

A diagnostic-only retrospective that restores all shared raw agreements while retaining each model's conflict choices raises Terra's exact-tuple result from 30.8 to 53.8 percent and Sol's from 30.8 to 46.2 percent. Those are still far below the 80-percent gate. This means harmful shared overrides explain part, but not all, of the failure; the remaining bottleneck is field semantics, especially diagnostic detection and proposition-level component contact.

## Variation by debate

| Debate | Lane | Terra exact tuple | Sol exact tuple | Terra component | Sol component |
| --- | --- | ---: | ---: | ---: | ---: |
| #62 | straightforward dyadic | 0.0% | 0.0% | 66.7% | 44.4% |
| #185 | difficult dyadic/reframe | 50.0% | 25.0% | 87.5% | 62.5% |
| #154 | multi-speaker | 33.3% | 50.0% | 71.4% | 71.4% |

The multi-speaker debate was not the unique failure mode: both variants performed worst on exact tuples in the supposedly straightforward dyadic debate #62. The evidence does not support removing three-or-more-speaker debates from the workflow.

## Workflow-quality assessment

**Operational and audit quality: strong.** The workflow made model identity blindness real, kept candidate mapping post-context, eliminated offset-generation failures, completed large packets without retries, preserved the transcript/audio chain, and enforced stop rules automatically.

**Measurement quality: inadequate.** The current semantic cards and de novo override authority do not reliably distinguish component-level assent, relevant contrary material, eligible defects, consequences, and complete reframes. Valid structure and exact evidence did not imply correct classification.

**Production readiness: not ready.** Applying v3.3 to 195 debates would create consistent-looking but materially unreliable assessments. The workflow should not advance to another held-out gate or production scoring.

## Recommended next development step

Freeze v3.3 as failed and conduct a narrow v3.4 retired-development experiment, not a new confirmation gate:

1. Preserve shared raw agreement by default; do not grant a single de novo judge unilateral override authority.
2. Retain anonymous Terra as the leading conflict-arbitration candidate for targeting, component, and reframe fields, but do not treat its overall output as authoritative.
3. Replace the diagnostic pair with a staged decision: explicit defect cue present/absent, eligible defect label, then a separately quoted defect-linked consequence. Require the consequence evidence to be a distinct clause.
4. Tighten component-contact instructions for broad assent: an unqualified global assent may contact a component only when the response language licenses that specific proposition; it cannot propagate automatically through a component graph.
5. Treat connected examples and relevant contrary material as mutually audited boundary decisions, with an explicit explanation of whether the proposed example is already inside the locked target.
6. Run deterministic retrospective fixtures first, then a small new retired AI test. Do not open held-out material unless the revised workflow clears the existing thresholds without post hoc model blending.

The most promising model allocation remains Terra for lower-cost general work and conflict adjudication, with Sol reserved for narrowly defined diagnostic review only if a future preregistered policy demonstrates that the combination improves complete-lock accuracy.
