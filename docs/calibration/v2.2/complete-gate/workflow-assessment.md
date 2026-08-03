# v2.2 three-debate gate assessment

## Verdict

The v2.2 remediation gate did **not** pass. The workflow is materially stronger for source integrity, schema uniformity, calculation control, burden-adjustment exclusion, overall-score stability, and winner stability. It remains insufficiently reliable at the move level and is therefore not ready for the ten-debate gate or all 195 debates.

The preregistered sequence stops composition after a numerical reliability failure. Complete prose scorecards, AI Extensions, novelty maps, and rendering QA were therefore not produced in this run; completing them could not change the blocking 32.91% adjudication rate.

## Controlled result

| Metric | v2.1 | v2.2 | Change | Gate |
| --- | ---: | ---: | ---: | --- |
| Moves | 79 | 79 | 0 | controlled |
| Triggered moves | 26 | 26 | 0 | fail |
| Move-adjudication rate | 32.91% | 32.91% | 0.00 pp | maximum 25% |
| Mean absolute dimension delta | 3.367 | 3.517 | +0.150 | pass, maximum 5 |
| Mean absolute move-score delta | 2.165 | 2.646 | +0.481 | diagnostic |
| Maximum move-score delta | 11 | 16 | +5 | diagnostic |
| Maximum overall pass delta | 4 | 2 | −2 | pass, maximum 5 |
| Winner-classification differences | 1/3 | 0/3 | −1 | pass |
| Minimum pass rank correlation | 1.0 | 1.0 | 0 | pass |
| Medium/low moves audio verified | 0/14 | 14/14 | +14 | pass |
| Burden-adjustment eligibility violations | not structurally excluded | 0 | improved | pass |
| Pass-schema variants | multiple | 1 exact schema | improved | pass |

Final v2.2 shadow totals were #05 **56–85**, #81 **76–81**, and #95 **73–75**. All three passes and final results favored the con side; no winner classification changed between Pass A and Pass B.

## What worked

### Source integrity

Audio verification resolved every medium-confidence move before scoring and exposed two real v2.1 inventory errors:

- D05-M022 was questioning by unidentified audience member(s), not a Matt Dillahunty turn.
- M23's source span ended before Graham Oppy began answering; the anchor was extended to include his verified response.

The full local transcript chain remained available for every pass. Apart from those documented repairs, all burdens, section definitions, weights, move IDs, sides, importance values, and source spans were preserved.

### Structural and mechanical consistency

All six pass files used the same exact key structure. The validator checked every source hash, inventory move, side, importance value, timestamp, span, response-class ceiling, move score, section score, overall score, audio record, and burden-adjustment eligibility claim. All 79 canonical moves and all six overall pass totals were recomputed with zero mismatches.

### Burden-adjustment exclusion

Both passes assigned zero to both sides in all three debates. No adjustment dispute or adjudication occurred, and no already-scored defect leaked back into an overall total. The strengthened exclusion rule solved the v2.1 duplicate-adjustment risk in this sample.

### Overall stability

The maximum Pass A/B overall delta fell from four points to two. Winner classifications were identical in all three debates, and pass rank correlations remained 1.0. For readers who see only final debate totals, v2.2 looks stable.

## What did not work

### Response-class ambiguity replaced band ambiguity

The two passes selected different response classes on 20 of 79 moves (25.32%). Thirteen of those 20 moves triggered adjudication, meaning response-class disagreement occurred in half of all triggered moves.

The ceiling mechanism amplifies a classification difference. For example, the same turn may be classified as a diagnostic question with a ceiling of 74, a relevant counterargument with a ceiling of 69, or a topic shift with a ceiling of 49. The numerical anchors are clearer once a class is fixed, but v2.2 did not make the classes mutually exclusive enough for two scorers to fix the same class.

### Responsiveness became less reliable

| Dimension with a >8-point trigger | v2.1 | v2.2 | Change |
| --- | ---: | ---: | ---: |
| Logical coherence | 3 | 3 | 0 |
| Evidence/warrant | 6 | 4 | −2 |
| Responsiveness | 8 | 17 | +9 |
| Relevance/burden | 11 | 7 | −4 |
| Precision/clarity | 5 | 1 | −4 |
| Calibration/charity | 9 | 8 | −1 |

The new burden and precision anchors helped, and evidence disagreement also declined. Those gains were entirely offset by nine additional responsiveness triggers. Constructive openings also remained underspecified: both passes could agree that a move was a constructive opening yet differ substantially on what motion-level responsiveness that warranted.

### Calibration and charity remain bundled

Eight moves still crossed the charity/calibration trigger. The dimension asks two different questions—whether confidence is proportionate and whether the alternative is represented strongly. A move can perform well on one and poorly on the other, leaving scorers latitude to choose which dominates the single number.

### Aggregate stability still masks editorial load

The final totals are stable, but 26 move adjudications across only three debates are not scalable to 195 debates. Debate #81 illustrates the problem: its overall pass deltas were zero and one, yet its move triggers increased from two to six. A workflow that is stable only after frequent adjudication is not ready for unattended corpus production.

## Quality assessment

| Component | Assessment | Reason |
| --- | --- | --- |
| Transcript acquisition and local retention | Excellent | Complete local source chains and hashes for all debates. |
| Attribution QA | Excellent | 14/14 medium-confidence moves verified; two consequential defects caught before scoring. |
| Schema and calculator controls | Excellent | One exact pass format and zero arithmetic mismatches. |
| Burden-adjustment control | Excellent | No duplicate or ineligible adjustment survived. |
| Overall-score repeatability | Strong | Maximum pass delta 2; winners and ranks stable. |
| Move-level rubric reliability | Insufficient | 26/79 moves triggered; mean dimension disagreement slightly worsened. |
| Editorial scalability | Not ready | One adjudication for roughly every three moves is too expensive and invites inconsistency. |

The workflow is trustworthy as an auditable research prototype with human adjudication. It is not yet a production scoring system for the full corpus.

## Recommended v2.3 remediation

1. **Separate response classification from numerical scoring.** Run two blind response-relation classifiers first, adjudicate class disagreements, and lock one class per move before either numerical scoring pass. Report classification agreement as its own gate rather than hiding it inside score deltas.
2. **Replace the response-class table with a decision tree.** Give mutually exclusive tests for constructive opening, full answer, partial answer, diagnostic defeat, relevant counterargument, justified reframe, and weaker substitution. Include explicit rules for compound objections and rapid dialogue spans.
3. **Add class-specific numerical anchors.** Once a class is locked, define what the lower, middle, and upper portion of that class permits. Add a dedicated constructive-opening anchor tied to the motion and adopted burden.
4. **Separate calibration from charity internally.** Score two 0–100 subanchors and mechanically average them into the existing 10% dimension, preserving the aggregate weight while removing the choice of which concept dominates.
5. **Keep the successful v2.2 controls unchanged.** Preserve the exact pass schema, audio prerequisite, source-QA correction log, adjustment exclusion, calculators, and isolation allowlists.
6. **Rerun the same three debates before expansion.** Do not raise the disagreement thresholds to manufacture a pass. Add a preregistered response-class agreement threshold, retain the 25% move-adjudication ceiling, and require improvement in both classification and numerical agreement.

Only after that controlled gate passes should the workflow complete the three prose scorecards and AI Extension rendering QA, followed by the preregistered ten-debate gate. No current result authorizes reassessing all 195 debates.
