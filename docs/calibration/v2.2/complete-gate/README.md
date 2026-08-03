# v2.2 three-debate remediation gate

This calibration-only gate reruns Debates #05, #81, and #95 with the same locked sections, moves, importance values, and gate thresholds used in v2.1. Its purpose is to isolate the effect of the v2.2 rubric anchors, common scoring-pass schema, burden-adjustment exclusion rule, and medium-confidence audio verification.

The sequence is preregistration, audio verification, schema-valid isolated Pass A and Pass B scoring, threshold-only adjudication, mechanical calculation, reliability analysis, complete scorecard and AI Extension composition if numerical gates pass, rendering QA, and a comparison with v2.1.

Nothing in this directory alters production scorecards or rankings. Passing can authorize only a later ten-debate gate.

## Result

The v2.2 gate did not pass. See `reliability-analysis.json` and `workflow-assessment.md`.

- Every one of the 14 medium-confidence moves was audio verified before scoring; two source-QA errors were corrected and logged.
- All six isolated scoring passes used the single exact v2.2 schema and passed hash, audio, score, section, overall, and burden-eligibility validation.
- All 79 moves and six side-level totals were mechanically reproduced with zero calculator mismatches.
- Overall agreement improved: the maximum pass delta fell from four points to two, with zero winner-classification differences and perfect rank stability.
- Move-level reliability did not improve: 26 of 79 moves again required adjudication (32.91%), above the locked 25% threshold.
- Response-class disagreement occurred on 20 moves and accounted for 13 of the 26 adjudications; responsiveness triggers increased from eight in v2.1 to seventeen in v2.2.
- Because the numerical reliability gate failed, the preregistered sequence stopped before complete scorecard, AI Extension, novelty-map, and rendering composition.

The result authorizes neither the ten-debate expansion nor corpus-wide reassessment.
