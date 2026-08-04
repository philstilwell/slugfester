# v3.8.8 Coverage Consensus Assessment

## Outcome

**PASS — section-and-weight lock preregistration authorized.**

The three score-free debate inventories are complete, internally coherent, and traceable to local transcript evidence. All 572 final coverage fields have two-vote support, all 81 retained moves satisfy the closed role and response invariants, all 30 accepted bridges remain represented, and the one medium-confidence attribution received completed local audio verification. No score, winner, assessment prose, Overall Commentary, or AI Extension entered the coverage stage.

This result authorizes only the next frozen section-and-weight-lock stage. It does not authorize burden-contact model execution, participant scoring, prose generation, production mutation, the ten-debate gate, or the 195-debate rollout.

## Results

| Measure | Debate 55 | Debate 103 | Debate 161 | Total |
| --- | ---: | ---: | ---: | ---: |
| Final moves | 28 | 25 | 28 | 81 |
| Pro / con moves | 15 / 13 | 13 / 12 | 16 / 12 | 44 / 37 |
| Final two-vote fields | 199 | 170 | 203 | 572 |
| Represented bridges | 10 | 10 | 10 | 30 |
| Consequential omissions | 0 | 0 | 0 | 0 |
| Included missing moves | 2 | 3 | 1 | 6 |
| Excluded proposed candidates | 2 | 0 | 1 | 3 |
| Completed audio verifications | 0 | 1 | 0 | 1 |

The 117 primary disagreements were resolved in three isolated Sol contexts. All three transports were clean. One conditional proposition context and one cross-field atomic-bundle context were also clean. Across all five adjudication contexts there were zero retries, zero recoverable stream events, zero invalid outputs, zero model-supplied score fields, and zero metered API or transcription cost.

## Audit findings and repairs

The deterministic merge exposed two process defects before allowing a final inventory:

1. A candidate rejected by the independent reviewer but restored by validity adjudication lacked an adjudicated proposition because the original comparator had conditionally skipped its semantic fields. Four matching semantic fields were recovered from the saved passes, the closed role-kind invariant supplied one dependent role, and one anonymous proposition-only adjudication resolved the remaining field.
2. Independent field adjudication classified one Debate 103 move as constructive while separately treating it as a represented concession. The merger stopped. A fresh adjudicator received the two original coherent semantic-and-audit bundles and selected one bundle as a whole, resolving all five dependent fields without component mixing.

These repairs improved the final artifact, but they also show that validity-dependent fields and concession dependencies should be atomic before the next broader gate. Future packet construction should compare speaker, proposition, attribution, kind, and response data even when a reviewer rejects a candidate; route any revived candidate's still-live fields automatically; and adjudicate role, kind, response links, and concession audit as one dependency bundle whenever they differ. The cross-field validator should remain a mandatory pre-merge stop rule.

## Quality assessment

The final locked inventory is **A-level for source traceability, isolation, schema enforcement, audio handling, and internal coherence**. The original fieldwise consensus design is **B+ as a reusable workflow** because it needed two narrowly scoped repairs that were not anticipated in its initial phase lock. Both defects were detected mechanically, preserved rather than hidden, and resolved without scoring leakage or discretionary post hoc rewriting.

The workflow is ready to proceed to a separately frozen section-and-weight lock for these three debates. Before any ten-debate or 195-debate use, the conditional-field and atomic-dependency rules should be incorporated prospectively into the standard packet builder and dry fixtures so the repair paths are tested before model execution rather than discovered during merge.
