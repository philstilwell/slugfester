# v2.1 Varied-Debate Pilot Analysis

## Decision

**Mechanics: pass. Corpus-wide production: no-go.**

The repository-backed workflow successfully acquired and hashed all ten sources, generated score-blind benchmark packets, preserved two scoring passes, triggered and preserved adjudications, recalculated every total, reviewed tags after scoring, and kept every result out of production rankings. The test does **not** validate a corpus-wide rescore because it sampled only one known move per side, reused legacy move locations, did not isolate the two model passes, and did not audio-check speaker attribution.

## Pilot scope

- 10 debates spanning long/medium/short formats, philosophy, religion, morality, mind, logic, public reason, multi-person structure, and technical science.
- 10 targeted sections and 20 moves.
- One exact caption excerpt per side, selected from a stable legacy move location while legacy scores, critiques, tags, and commentary were excluded from the benchmark inputs.
- Assessment model: 5.6 Sol.
- Pass independence: **same model, same context, procedural separation only**.

## Quantitative results

- Caption acquisition: **10/10**; all tracks were English auto-generated captions.
- Speaker attribution: 19 medium-confidence moves and 1 low-confidence move; **0 audio-checked**.
- Mean absolute dimension difference between passes: **2.22** points; maximum **11**.
- Mean move-score difference: **2.25** points; maximum **4**.
- Required move adjudications: **3/20 (15%)**.
- Mean agreement-range width: **6.25** points. This is a heuristic agreement range, not a statistical confidence interval.
- Tag candidates reviewed after scoring: **4**; 2 accepted and 2 rejected. Tags produced no extra deduction.

The small pass deltas confirm that the code handles comparison and thresholds consistently. They should not be read as independent-rater reliability because Pass B was produced in the same active model context.

## Legacy benchmark comparison

| Debate | Pro legacy → v2.1 | Con legacy → v2.1 | Pair ordering | Stable? |
| --- | ---: | ---: | --- | --- |
| 01 | 82 → 76 | 82 → 78 | tie → con | no |
| 03 | 77 → 71 | 90 → 77 | con → con | yes |
| 05 | 61 → 54 | 88 → 80 | con → con | yes |
| 34 | 84 → 80 | 84 → 83 | tie → con | no |
| 68 | 68 → 64 | 89 → 85 | con → con | yes |
| 81 | 73 → 76 | 83 → 84 | con → con | yes |
| 95 | 78 → 74 | 84 → 83 | con → con | yes |
| 104 | 77 → 73 | 82 → 82 | con → con | yes |
| 156 | 67 → 67 | 78 → 77 | con → con | yes |
| 189 | 77 → 75 | 65 → 78 | pro → con | no |

Across the 20 sampled moves, v2.1 scores averaged **2.6 points lower** than the legacy move scores; mean absolute change was **4.3** points and the range was -13 to +13. Within-pair ordering was stable in **7/10** cases.

This comparison is diagnostic, not an apples-to-apples rescore. The pilot scored a bounded 90-word caption excerpt. A legacy move score may have reflected a wider presentation summarized in the scorecard. The largest reductions occurred where a high legacy score depended on technical or methodological development outside the sampled excerpt. The result shows that v2.1 needs an explicit evidence-window rule; it does not show that the legacy debate winner or overall score should change.

## What improved

- Formula drift is removed: calculators and validators import one scoring module.
- Double counting is reduced: section scores are importance-weighted move means, and the only overall correction is a capped burden-completion adjustment independently scored by both passes.
- Provenance is much stronger: source, normalized transcript, blind packet, and excerpt hashes are retained.
- Burdens and response relationships use stable IDs; unpaired moves no longer require artificial counterpart claims.
- Disagreement rules are executable and preserve original pass judgments.
- Tagging is a post-score review with explicit accept/reject rationales and no numerical surcharge.
- Calibration results are structurally isolated from published scorecards and rankings.

## What failed or remains untested

1. **True independence.** Same-task passes are susceptible to memory and shared framing.
2. **Blind argument discovery.** Stable legacy locations were reused to make the benchmark feasible with unlabeled captions.
3. **Complete coverage.** One section cannot test section weights, burden completion, overall winner stability, or rankings.
4. **Attribution QA.** One window crossed a likely speaker transition, and no central excerpt was audio-checked.
5. **AI Extension novelty.** The requirement and schema are implemented, but a full extension was outside this targeted scoring pilot.
6. **Preregistration.** Quantitative acceptance thresholds were not locked before scoring; this pilot is exploratory.

## Recommendation

Do not redo the corpus yet. Preregister a second gate and run three complete debates—one close analytic debate, one lopsided burden debate, and one technical or multi-person debate—in separately isolated 5.6 Sol tasks. Require audio verification of central quotes and speaker turns, complete argument inventories, locked section weights, full burden adjustments, and AI Extension novelty maps. If that succeeds, run ten complete varied debates and measure actual overall/winner/ranking stability before promoting v2.1.
