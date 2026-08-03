# v2.2 adjudication output contract

Adjudication reads only the v2.2 workflow, rubric, gate manifest, one locked inventory and audio audit, that debate's local transcript/event/manifest chain, and the two schema-valid v2.2 scoring passes. It never reads v2.1 or production scores.

Output exactly this shape:

```json
{
  "schemaVersion": "2.2-adjudication",
  "workflowVersion": "Slugfester Reassessment Workflow v2.2",
  "rubricVersion": "Slugfester Reassessment Rubric v2.2",
  "debateId": "...",
  "debateNumber": "...",
  "model": "5.6 Sol",
  "calibrationOnly": true,
  "adjudicatedAt": "ISO-8601 timestamp",
  "isolation": {
    "method": "fresh-adjudication-model-task",
    "legacyMaterialAvailable": false,
    "statement": "..."
  },
  "moveAdjudications": [
    {
      "moveId": "...",
      "side": "pro",
      "passAScore": 0,
      "passBScore": 0,
      "scoreDelta": 0,
      "maxDimensionDelta": 0,
      "triggeredDimensions": {"responsiveness": 9},
      "responseClass": "partial-direct-answer",
      "dimensions": {
        "logicalCoherence": 0,
        "evidenceWarrant": 0,
        "responsiveness": 0,
        "relevanceBurden": 0,
        "precisionClarity": 0,
        "calibrationCharity": 0
      },
      "moveScore": 0,
      "rationale": "Transcript-supported resolution under the v2.2 anchors."
    }
  ],
  "burdenAdjustmentAdjudications": {
    "pro": {
      "value": 0,
      "rationale": "Required only when the two pass values differ by more than two.",
      "eligibility": {
        "distinctDebateWideConsequence": false,
        "affectsBurdenCompletion": false,
        "notAlreadyScored": false,
        "relatedMoveIds": [],
        "distinctConsequence": "none"
      }
    }
  },
  "audit": {
    "passASha256": "64 lowercase hex characters",
    "passBSha256": "64 lowercase hex characters",
    "triggeredMoveCount": 1,
    "resolvedMoveCount": 1,
    "missingRequiredAdjudications": 0,
    "nonTriggeredMovesAltered": 0
  }
}
```

`moveAdjudications` contains every and only move for which any dimension differs by more than 8 or the computed move score differs by more than 4. `triggeredDimensions` contains only dimensions whose delta exceeds 8; it may be empty when only the move-score rule triggers. The response class must obey the v2.2 responsiveness ceiling.

`burdenAdjustmentAdjudications` contains a side key only when its pass adjustment values differ by more than 2. A nonzero adjudicated value must independently pass every v2.2 exclusion condition. Do not adjudicate or alter non-triggered moves.
