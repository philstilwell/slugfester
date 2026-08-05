# Slugfester Lean Production Workflow v4.0.1

This amendment inherits the complete v4.0 workflow except where stated here. It responds prospectively to the failed v4.0 schema preflight; it does not repair, retry, or normalize that frozen output.

## Repository-derived precision and calibration

The model no longer supplies `precisionClarity` or `epistemicCalibration` scalar values. It supplies only the closed findings and a source-grounded rationale for each. Repository code derives the values before the move formula is applied:

| Closed precision band | Derived value |
| --- | ---: |
| 90–100 | 95 |
| 80–89 | 85 |
| 70–79 | 75 |
| 50–69 | 60 |
| 0–49 | 35 |

| Closed calibration band | Derived value |
| --- | ---: |
| 90–100 | 95 |
| 80–89 | 85 |
| 70–79 | 75 |
| 50–69 | 60 |
| 0–49 | 35 |

All other ratings remain raw model judgments. The primary output still contains no move, section, overall, range, or winner totals. Repository code inserts the two derived dimension values only while calculating the provisional ledger.

This removes two redundant scalar choices, makes the tightened subanchors operational, and prevents a category/value contradiction from requiring a retry or universal adjudication. The same mapping must be used in primary scoring, triggered Pass B, adjudication, validation, and publication calculation.

## Protocol identity

- `schemaVersion: 4.0.1-lean-primary-output`
- `protocolId: v4.0.1-lean-risk-triggered-consensus`
- assessment model: `5.6 Sol`

Every other v4.0 trigger, source, audio, burden-adjustment, consensus, AI Extension, compute-budget, and promotion rule remains unchanged.
