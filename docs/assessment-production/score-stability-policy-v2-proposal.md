# Slugfester production score-stability policy v2 proposal

## Status and boundary

This is a prospective policy proposal, not an active production rule. It does not reclassify the failed v1 canary, authorize a rerun, alter a judgment, change a calculated score, prepare publication, mutate production, or launch another batch.

The v1 canary remains failed because Debate 64 violated its frozen exact rounded-winner preservation rule. Any v2 promotion requires a fresh, disjoint, score-blind validation cohort selected and frozen before execution.

## Proposed winner-stability rule

Keep every existing numerical stability threshold unchanged:

- every score is an integer from 0 through 100;
- mean absolute final-score distance from the two independent passes is at most four points;
- maximum distance from either pass is at most eight points;
- maximum excursion outside the two-pass range is at most three points.

When Pass A and Pass B agree on `pro` or `con`, require the final unrounded adjusted total to avoid an opposite-side reversal. The adjusted total is the repository-owned weighted section mean plus the eligible burden-completion adjustment, before final integer rounding.

- If both initial passes favor `pro`, the final unrounded adjusted pro total must be greater than or equal to the con total.
- If both initial passes favor `con`, the final unrounded adjusted con total must be greater than or equal to the pro total.
- A final rounded tie is therefore permitted only when the unrounded result does not reverse the agreed direction.
- A final unrounded tie is permitted because it is a collapse of direction, not an opposite-side reversal.
- If both initial passes are rounded ties, the final rounded classification must remain a tie.

The public `score` and `winner` fields remain derived from the unchanged repository formula. The policy never adds an offset, changes rounding, forces a winner, or sends scores back into judgment or adjudication.

## Rationale

Independent field-level adjudication can legitimately combine selected candidates into a final record whose sub-point margin is narrower than either initial pass. Exact rounded-label preservation treats a display-boundary tie as equivalent to an opposing-side reversal. The proposed rule retains the substantive safeguard—consensus cannot favor the opposite side—without making hidden initial integer scores a target for semantic adjudication.

## Validation requirement

Retrospective evaluation may diagnose behavior but cannot promote this proposal. Promotion requires:

1. a fresh disjoint cohort of ten dyadic debates, excluding every calibration and production-canary debate already observed;
2. a frozen manifest before any model execution, with 5.6 Sol/low, ChatGPT-subscription authentication, score blindness, and all existing source, audio, isolation, retry, timing, and cost stop rules;
3. one deterministic repository score pass after final-ledger lock;
4. prospective application of this rule with no threshold tuning or automatic rerun; and
5. an explicit readiness decision before publication preparation or production mutation.

Until those conditions pass, v2 is unpromoted and the remaining production campaign is unauthorized.
