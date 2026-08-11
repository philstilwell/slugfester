# Slugfester production score-stability policy v2.2 proposal

## Status and boundary

This prospective successor defines how score stability should treat two independent passes that both produce an integer-rounded tie. It is not an active production rule. It does not alter or reclassify the failed v2.1.3 validation cohort, authorize a rerun, change any judgment or adjudication, change the repository score formula, prepare publication, mutate production, or launch another batch.

The v2.1.3 cohort remains failed under its frozen v2.1 rule because Debate 172 moved from two initial rounded ties to a final con result. Promotion of v2.2 requires a new disjoint, score-blind validation cohort selected and frozen before execution.

## Proposed winner-stability rule

Keep every numerical threshold unchanged:

- every score is an integer from 0 through 100;
- mean absolute final-score distance from the two independent passes is at most four points;
- maximum distance from either pass is at most eight points; and
- maximum excursion outside the two-pass range is at most three points.

Apply winner stability only when the independent passes agree on a winning side.

- If both initial passes favor `pro`, the final rounded result may be `pro` or `tie`, but not `con`.
- If both initial passes favor `con`, the final rounded result may be `con` or `tie`, but not `pro`.
- Every final tie produced by integer rounding is permitted, including a sub-point unrounded margin in either direction.
- If both initial passes are rounded ties, they establish no agreed winning direction. The final rounded result may therefore be `pro`, `con`, or `tie`, provided every numerical threshold passes.
- If the initial passes disagree, they likewise establish no agreed winning direction; the numerical thresholds remain the applicable stability control.

Unrounded adjusted totals and their direction remain diagnostic only. The public `score` and `winner` fields remain outputs of the unchanged repository formula. The policy never adds an offset, changes rounding, forces a winner, or sends calculated scores back into judgment or adjudication.

## Rationale

A rounded tie means that the score formula found no integer-level winning margin in that pass. Two such ties agree that neither side won at the published precision; they do not agree that later field-level adjudication must be prevented from resolving the underlying balance. Requiring the final ledger to remain tied can turn a coarse rounding category into a constraint on independently adjudicated evidence. The unchanged numerical limits continue to prevent large movement, while the agreed-side rule continues to reject a final win for the opposite side when both initial passes favored the same side.

## Validation requirement

The v2.1.3 result motivated this proposal after its score gate was observed, so that cohort is retrospective evidence only. Promotion requires:

1. a newly selected disjoint cohort of ten dyadic debates, excluding every calibration, production-canary, and prior validation debate already observed, including all ten v2.1.3 debates;
2. a frozen manifest before any model execution, preserving 5.6 Sol/low, ChatGPT-subscription authentication, score blindness, and every existing source, audio, isolation, retry, timing, and cost stop rule;
3. one deterministic repository score pass after final-ledger lock;
4. prospective application of this exact rule with no threshold tuning or automatic rerun; and
5. an explicit readiness decision before policy promotion, publication preparation, or production mutation.

Until those conditions pass, v2.2 is unpromoted and the remaining production campaign is unauthorized.
