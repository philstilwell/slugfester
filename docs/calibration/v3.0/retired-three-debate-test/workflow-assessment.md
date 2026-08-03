# v3.0 retired three-debate consensus assessment

## Decision

The adjudicated-consensus workflow executed cleanly but failed the retired accuracy gate. It is not ready for a held-out gate, numerical scoring, or application to the 195 debates.

This is a substantive reliability failure, not a provenance or tooling failure. Six raw 5.6 Sol passes and three dispute-only adjudications validated. All 71 extracted disputes were resolved, no nondisputed field was altered, all local transcript hashes matched, and the only medium-confidence source-control move was audio verified. The final locks nevertheless passed only 7 of 16 frozen gates.

## Results

| Measure | Raw A/B agreement | Final vs. gold | Gate |
| --- | ---: | ---: | --- |
| Original-target contact | 1.000 | 1.000 | Pass |
| Scope | 0.846 | 0.462 | Fail |
| Burden adjustment | 0.846 | 0.846 | Fail |
| Component contact | 0.871 | 0.645 | Fail |
| Coverage | 0.769 | 0.538 | Fail |
| Defect type | 0.538 | 0.308 | Fail |
| Consequence | 0.769 | 0.615 | Fail |
| Diagnostic | 0.769 | 0.615 | Fail |
| Reframe | 0.846 | 0.769 | Fail |
| Burden relevance | 1.000 | 1.000 | Pass |
| Exact derived tuple | 0.538 | 0.077 | Fail |
| Diagnostic-positive recall | — | 1.000 | Pass |
| Reframe-positive recall | — | 1.000 | Pass |

The source, merge, and stop-rule gates also passed: audio verification was 1/1, unresolved disputes were zero, and nondisputed alterations were zero.

## Why the design failed

### Shared same-model errors bypass dispute-only adjudication

Across 161 scoring-relevant semantic judgments, the raw passes agreed on 136. Thirty-three of those agreements—24.3 percent—were wrong against the independently constructed pre-v3.0 gold key. Because the third pass was restricted to disagreements, it could not inspect or repair any of them.

The shared errors concentrated in the exact fields that have resisted earlier rubric revisions: connected-example overclassification, scope shifts, component contact, defect type, stated consequence, and reframe primitives. Original-target contact and burden tier remained fully accurate.

### The adjudicator chose poorly when a correct option was present

Only 25 of the 71 compound disputes represented different semantic values; the other 46 concerned evidence-span selection alone. On the 25 semantic conflicts, the final adjudicator matched gold 7 times, or 28 percent. Yet A or B supplied the gold-matching value in 23 of those 25 conflicts, or 92 percent. The failure therefore lies mainly in selection, not candidate generation.

One likely contributor is cognitive dilution: 64.8 percent of the adjudication queue consisted only of competing exact evidence spans. The long mixed queues asked one context to alternate among scope, components, diagnostics, reframes, burdens, and span boundaries. The adjudicator also selected B 42 times, A 28 times, and a novel value once, indicating a possible preference for B's generally broader, more detailed positive classifications.

### Adjudication amplified rather than repaired error

The final exact-tuple accuracy fell to 0.077 even though raw A/B exact-tuple agreement was 0.538. Similar declines occurred in component contact, coverage, defect type, consequence, and diagnostic classification. This demonstrates that adjudication is not inherently accuracy-improving; it needs its own validated decision design.

## Lane finding

Removing three-plus-speaker debates is still not warranted. Both lanes failed. Dyadic final accuracy was 0.571 for coverage and 0.286 for defect type; multi-speaker accuracy was 0.500 and 0.333 respectively. Both lanes retained perfect target-contact and burden-relevance accuracy. The dominant problem is shared semantic overclassification and adjudicator selection, not participant count.

## What worked

- The subscription-only launch path incurred no metered API or transcription charge.
- Complete local transcript chains were available and hash-valid.
- Medium-confidence audio verification was enforced and exercised.
- Pass A and Pass B were genuinely separated by ephemeral allowlisted workspaces.
- Disagreement extraction was deterministic and exhaustive.
- The adjudicators saw only disputed compound fields and relevant locked case context.
- The merge was deterministic, preserved both raw passes, and changed no agreed field.
- Scoring inputs could not be built until final locks existed; after the gate failed, no numerical participant score was generated.
- The stop rule prevented held-out access and production changes.

## Required v3.1 repair

The exact requested architecture should not be sent unchanged to a held-out gate. A retired-material v3.1 should make four targeted changes:

1. **Separate semantic adjudication from evidence canonicalization.** Send only different semantic values to Sol. After the semantic value is fixed, select the shortest valid candidate evidence span mechanically, escalating only when neither candidate supports the final value.
2. **Add a high-risk agreement verification control.** A dispute-only third pass cannot correct correlated agreement. Audit every positive or nondefault agreement for connected example, non-same scope, burden reassignment/replacement, component contact, non-none defect, stated consequence, and both reframe primitives. This is a necessary relaxation of the “disputed fields only” constraint.
3. **Adjudicate one field family at a time.** Use small, explicitly phrased, label-blinded packets with randomized candidate order and repeated default-presumption reminders. Do not expose raw-pass rationales unless the adjudicator first records an independent field judgment.
4. **Retest the same retired sample.** Keep the v3.0 manifest and results immutable. Build a new v3.1 manifest, reuse these three retired debates and gold keys, and require improvement over v3.0 plus all absolute thresholds before preparing any held-out gate.

If the editor wishes to preserve an absolute rule that the third pass may inspect only A/B disagreements, then AI-only consensus should be abandoned for this project: the 33 shared errors prove that such a rule cannot meet the current accuracy target. The defensible alternative is a human review of every high-risk positive agreement and semantic disagreement before scoring.

## Readiness

| Component | Assessment |
| --- | --- |
| Source fidelity and local access | Excellent |
| Audio-verification enforcement | Excellent |
| Pass isolation and auditability | Excellent |
| Deterministic extraction and merge integrity | Excellent |
| Raw target and burden-tier reliability | Excellent on this sample |
| Shared-error detection | Inadequate by design |
| Dispute adjudication accuracy | Poor |
| Post-adjudication score boundary | Correctly enforced |
| Ready for held-out gate | No |
| Ready for 195 debates | No |

