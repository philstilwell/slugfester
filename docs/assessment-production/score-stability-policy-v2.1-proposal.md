# Slugfester production score-stability policy v2.1 proposal

## Status and boundary

This prospective successor records the explicit policy decision that ties in scores after integer rounding are acceptable. It is not an active production rule. It does not alter the frozen v2 proposal or its closed validation record, reclassify the failed v1 canary, authorize a rerun, change a judgment, change the score formula, prepare publication, mutate production, or launch another batch.

The v1 canary remains failed under its frozen exact rounded-winner preservation rule. The closed v2 cohort remains failed at inventory. Promotion of v2.1 requires a new disjoint, score-blind validation cohort selected and frozen before execution.

## Proposed winner-stability rule

Keep every existing numerical stability threshold unchanged:

- every score is an integer from 0 through 100;
- mean absolute final-score distance from the two independent passes is at most four points;
- maximum distance from either pass is at most eight points; and
- maximum excursion outside the two-pass range is at most three points.

When Pass A and Pass B agree on `pro` or `con`, require the final published integer-rounded result to preserve that side or collapse to a tie.

- If both initial passes favor `pro`, the final rounded result may be `pro` or `tie`, but not `con`.
- If both initial passes favor `con`, the final rounded result may be `con` or `tie`, but not `pro`.
- Every final tie produced by integer rounding is permitted, including a sub-point unrounded margin in either direction.
- If both initial passes are rounded ties, the final rounded classification must remain a tie.

The unrounded adjusted totals and their direction remain in the audit record as diagnostics, but they do not override an integer-rounded tie. The public `score` and `winner` fields remain derived from the unchanged repository formula. The policy never adds an offset, changes rounding, forces a winner, or sends scores back into judgment or adjudication.

## Rationale

Independent field-level adjudication can legitimately combine selected candidates into a final record whose sub-point margin is narrower than either initial pass. Exact winner-label preservation rejects a valid published tie, while an unrounded-direction rule gives sub-point precision precedence over the integer scores readers actually see. This proposal accepts any genuine integer-rounded tie while continuing to reject a published result for the opposite side.

## Validation requirement

The user’s policy decision fixes the rule prospectively; it does not make the already observed data prospective evidence. Promotion still requires:

1. a newly selected disjoint cohort of ten dyadic debates, excluding every calibration, production-canary, and failed-v2-validation debate already observed;
2. a frozen manifest before any model execution, with 5.6 Sol/low, ChatGPT-subscription authentication, score blindness, and all existing source, audio, isolation, retry, timing, and cost stop rules;
3. one deterministic repository score pass after final-ledger lock;
4. prospective application of this exact rule with no threshold tuning or automatic rerun; and
5. an explicit readiness decision before publication preparation or production mutation.

Until those conditions pass, v2.1 is unpromoted and the remaining production campaign is unauthorized.
