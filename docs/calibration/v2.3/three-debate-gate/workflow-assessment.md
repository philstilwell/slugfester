# v2.3 three-debate gate assessment

## Verdict

The v2.3 gate **did not pass**. It is not ready for the preregistered ten-debate gate and is not ready for corpus-wide use.

The workflow is a strong audit and provenance system, and locking a common response class materially improved average numerical agreement. Its response taxonomy is not reproducible, however, and move-level numerical reliability still misses the unchanged gate. The stop rule therefore correctly prevented scorecard prose, AI Extensions, novelty maps, and rendering claims from being produced.

## Gate results

| Measure | Preregistered requirement | Observed | Result |
| --- | ---: | ---: | --- |
| Exact response-class agreement | ≥ 0.85 | 0.5949 | Fail |
| Response-class disagreement | ≤ 0.15 | 0.4051 | Fail |
| Cohen's kappa | ≥ 0.75 | 0.5191 | Fail |
| Mean absolute dimension delta | ≤ 5 | 2.924 | Pass |
| Move-adjudication rate | ≤ 0.25 | 0.2911 | Fail |
| Maximum overall pass delta | ≤ 5 | 1 | Pass |
| Winner difference across v2.3 passes | ≤ 0.20 | 0 | Pass |
| Minimum pass rank correlation | ≥ 0.90 | 0.866 | Fail |
| Medium/low attribution audio verification | 100% | 14/14 | Pass |
| Missing locks or adjudications | 0 | 0 | Pass |
| Locked classes altered during scoring | 0 | 0 | Pass |
| Burden-adjustment violations | 0 | 0 | Pass |
| Calculator mismatches | 0 | 0 | Pass |

The final v2.3 totals are #05 `52–87`, #81 `76–82`, and #95 `76–74`. Both numerical passes agreed on the winner of every debate and never differed by more than one overall point for either side.

## What v2.3 improved

1. **It isolated the actual response-taxonomy problem.** Response classification was completed twice without scores, all 32 exact class disagreements and 14 target-set disagreements were preserved, and every class-or-target mismatch was independently resolved before scoring.
2. **A common response lock reduced numerical variance.** Mean absolute dimension delta fell from `3.517` in v2.2 to `2.924`; mean move-score delta fell from `2.646` to `1.823`; triggered moves fell from `26` to `23`; maximum overall pass delta fell from `2` to `1`.
3. **Responsiveness became much more consistent.** Only 2 moves crossed the >8 responsiveness trigger, down from 17 in v2.2. This is the clearest evidence that a shared structural response judgment can help.
4. **Calibration and charity became auditable.** The two components were separately rated and mechanically averaged; no scorer could conceal a charity judgment inside a general calibration score.
5. **The strengthened burden residual worked.** All six pass-level adjustments were zero, no adjustment adjudication was needed, and the validator found no eligibility violation.
6. **Source integrity remained complete.** All 79 moves were unchanged from the v2.2 controlled inventory; every transcript, event chain, manifest, audio source, speaker reference, clip, and diarized artifact matched its local hash. No new transcription call was made and no new fee was incurred.

## Why the classification gate failed

The mutually exclusive taxonomy combines two different questions:

- **coverage:** full answer, partial answer, relevant counterargument, or weaker substitution; and
- **mechanism:** diagnostic defeat or justified reframe.

A move can be both a diagnosis and a full or partial answer, or both a reframe and a full or partial answer. Forcing those properties into one exclusive label created avoidable boundary choices. The most frequent disagreement pairs were:

- full answer vs partial answer: 5;
- partial answer vs relevant counterargument: 5;
- full answer vs justified reframe: 4;
- diagnostic defeat vs full answer: 2; and
- diagnostic defeat vs relevant counterargument: 2.

The disagreement was not mainly caused by target selection. Only 14 of 79 target sets differed, while 32 response classes differed. Classifier A also used `diagnostic-defeat` 18 times and `full-answer` 8 times; Classifier B used them 13 and 14 times. This indicates different interpretations of the decision-tree priority, not missing transcript access.

Per-debate exact class agreement was `0.7692` for #05, `0.5200` for #81, and `0.5000` for #95. The taxonomy performed worst in analytically dense and multi-party exchanges, precisely where corpus-wide consistency matters most.

## Why the numerical gate still failed

The common lock largely solved responsiveness variance but did not solve other judgment variance. The >8 trigger counts were:

| Dimension | v2.2 | v2.3 |
| --- | ---: | ---: |
| Logical coherence | 3 | 4 |
| Evidence/warrant | 4 | 5 |
| Responsiveness | 17 | 2 |
| Relevance/burden | 7 | 8 |
| Precision/clarity | 1 | 2 |
| Calibration/charity | 8 | 6 |

Debate #05 produced 13 of the 23 triggered moves, compared with 3 for #81 and 7 for #95. Several #05 units contain rapid dialogue, interleaving, or broad condensations; even with correct speaker attribution, they ask scorers to evaluate more than one atomic argumentative act. This amplifies disagreement outside responsiveness.

Relevance/burden is now the largest residual numerical problem: mean delta `3.722` and 8 threshold triggers. The rubric tells scorers what different score bands mean but does not lock the move's observable burden relation before numerical scoring. Scorers can therefore agree on the response target yet disagree on whether the move completes a burden, advances a central burden, advances only a sub-burden, or remains peripheral.

The four moves locked as `weaker-substitution` all triggered numerical adjudication. This is a small sample, but it shows that a responsiveness ceiling alone does not stabilize evidence, precision, calibration, or burden judgments for defective replies.

## Aggregate stability is not sufficient

Within v2.3, overall totals are very stable. That does not make the workflow production-ready because unstable move judgments can cancel during aggregation.

The cross-version comparison also changes the final winner of #95:

| Debate | v2.2 | v2.3 | Winner change |
| --- | ---: | ---: | --- |
| #05 | 56–85 | 52–87 | No |
| #81 | 76–81 | 76–82 | No |
| #95 | 73–75 | 76–74 | Yes |

The #95 change is not automatically an error; the v2.3 rubric and locked classifications legitimately differ. It does demonstrate that a two-point close result is sensitive to workflow interpretation. Because the classification gate itself failed, v2.3 does not supply enough reliability evidence to treat this flip as production-grade.

## Quality assessment

| Component | Assessment |
| --- | --- |
| Transcript and audio provenance | Excellent |
| Schema, hashing, and mechanical calculation | Excellent |
| Isolation and contamination controls | Excellent |
| Burden-adjustment exclusion | Excellent |
| Response-taxonomy reproducibility | Poor |
| Move-level numerical reliability | Promising but below threshold |
| Overall-score stability | Strong within this run |
| Winner stability across workflow versions | Insufficient for close debates |
| Scalability to 195 debates | Not ready |

Overall, v2.3 is a **high-quality calibration harness but a not-yet-reliable production assessment method**. Its controls are worth preserving. Its substantive annotation model needs redesign before expansion.

## Required v2.4 remediation

1. **Replace the seven-way exclusive class with orthogonal fields.** Lock `interactionMode` as constructive or responsive. For responsive moves, separately lock `coverage` as full, partial, relevant-nonanswer, or substitution. Record `diagnostic` and `reframe` as independent mechanism flags. Mechanism must not compete with coverage for one label.
2. **Prelock the target packet in the inventory.** Before classification, record the strongest target, exact target span, and the indispensable components on which it succeeds. Classifiers should judge coverage of that packet, not infer the packet independently. A separate blind target-map check can measure target reliability.
3. **Make move units atomic.** Split mixed-speaker, compound, or interleaved spans into one speaker's one argumentative act before weights lock. A move may respond to several targets, but its scored content should not combine a question, opponent answer, and follow-up into one unit.
4. **Lock an observable burden relation before scoring.** Use a nonnumeric field such as `completes`, `advances-central`, `advances-sub-burden`, `topical-peripheral`, or `unadopted/irrelevant`, tied to burden IDs and success criteria. Then constrain relevance/burden to the corresponding band, just as the response lock constrains responsiveness.
5. **Use the 32 class disagreements as development data, not as the next promotion gate.** Resolve them into examples and counterexamples for the revised annotation contract. Because these three debates are now exposed training material, preregister a new held-out classification microgate before another complete scoring gate.
6. **Run a classification-only held-out gate first.** Do not spend full scoring and adjudication effort until the revised response and burden annotations meet the same `≥0.85` agreement and `≥0.75` kappa requirements on varied unseen debates.
7. **Keep the successful v2.3 controls unchanged.** Preserve the local transcript/audio chain, medium/low audio prerequisite, exact schemas, calculator, no-legacy allowlists, two isolated score passes, zero-default burden residual, stop rule, and post-reliability AI Extension/novelty/rendering sequence.
8. **Do not raise the 25% scoring threshold.** After annotation reliability passes, rerun a complete held-out three-debate gate and require the existing numerical thresholds. The present `29.11%` result is close enough to justify remediation, not close enough to waive the rule.

## Readiness decision

- Preregistered ten-debate gate: **not authorized**.
- All 195 debates: **not authorized**.
- Production scorecards, AI Extensions, or ranking changes from v2.3: **not authorized**.
- A v2.4 annotation redesign and held-out classification microgate: **recommended next step**.
