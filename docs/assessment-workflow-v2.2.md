# Slugfester Reassessment Workflow v2.2

This calibration workflow is a controlled remediation of v2.1. It keeps the formulas, disagreement thresholds, and promotion thresholds fixed while sharpening ambiguous rubric anchors, enforcing one scoring-pass schema, excluding duplicate burden adjustments, and requiring audio verification before any medium- or low-confidence move may be scored.

Version 2 remains the production baseline. v2.2 is not authorized for the corpus until the three-debate remediation gate and a later ten-debate gate pass and the editor explicitly approves promotion.

## Version and provenance contract

Every canonical ledger must identify:

- `schemaVersion: "2.2"`;
- `workflowVersion: "Slugfester Reassessment Workflow v2.2"`;
- `rubricVersion: "Slugfester Reassessment Rubric v2.2"`;
- the exact assessment model label;
- source-manifest, transcript, event, inventory, audio-verification, and scoring-pass hashes;
- both scoring-pass completion times and isolation methods;
- whether the result is calibration-only;
- the actual independence level of the passes.

Every scoring pass must conform exactly to [`scoring-pass-schema.json`](calibration/v2.2/scoring-pass-schema.json). Alternative arrays, nested section layouts, renamed fields, omitted audit fields, and extra top-level fields are invalid even when semantically equivalent.

## Required order of operations

1. **Preregister the target and thresholds.** Record the sample, frozen comparison controls, and promotion rule before source review or scoring.
2. **Acquire the full source.** Store timestamped `transcript.txt`, `events.json`, and `manifest.json` locally under `.assessment-cache/captions/<videoId>/`. Save hashes and source/model provenance. A missing file or hash mismatch blocks the inventory.
3. **Build the blind packet.** Include the motion, neutral side labels, and full transcript. Exclude every legacy score, critique, tag, winner label, Overall Commentary, AI Extension, prior scoring pass, and adjudication.
4. **Define burdens.** Give each adopted constructive or critical burden a stable ID, plain-language description, and observable success criteria. A critic is not assigned the positive contrary burden unless the critic adopts it.
5. **Inventory arguments.** Map every load-bearing claim, reply, concession, and unanswered objection. Record stable move IDs, response links, burden links, importance, exact source span, quote status, speaker-attribution confidence, and audio status.
6. **Verify speaker attribution.** Before scoring, verify every move marked `medium` or `low` against the source audio. Save the paid-transcription or manual-audio artifact locally, its SHA-256 hash, the verification method/model, the resolved speaker, and the result. `audioChecked: true` without a matching successful verification record is invalid. An unresolved medium- or low-confidence move must be repaired, removed before weights lock, or block scoring.
7. **Lock sections, weights, and anchors.** Select 4–7 sections, set percentages totaling 100, assign importance 1–3, and lock 30–90 word anchors. In a controlled rerun, preserve the prior inventory and weights except for source-verification metadata.
8. **Score Pass A.** In a fresh isolated task, use only the allowlisted workflow, rubric, pass schema, gate manifest, inventory, audio-verification audit, and full local transcript/event/manifest chain. Produce exactly one schema-valid pass file.
9. **Score Pass B.** In a different fresh isolated task, use the identical allowlist but no Pass A output or rationale. Produce the same schema with `pass: "B"`.
10. **Validate before comparison.** Run `node scripts/validate-scoring-pass-v2.2.mjs <pass.json> <inventory.json> <gate-manifest.json>`. Invalid output is returned to its original pass task for repair; it never enters adjudication.
11. **Adjudicate only triggers.** Adjudicate when any dimension differs by more than 8 or the computed move score differs by more than 4. A burden adjustment differing by more than 2 also triggers. Preserve both passes.
12. **Calculate mechanically.** Run `node scripts/calculate-reassessment.mjs <ledger.json> --write`; never hand-edit computed totals.
13. **Draft the scorecard.** Explain each side's strongest feature, principal limitation, live burden, and score band. Use only audio-verified wording for representative quotations.
14. **Review tags.** Add a fallacy or bias label only after scoring and only when the named defect materially affected an inference already reflected in the dimensions.
15. **Draft and audit AI Extension.** Place it after Overall Commentary in a default-collapsed, visually distinct accordion. Explicitly identify it as AI-generated, strengthen both sides proportionately, avoid rational-invulnerability language, and map every proposed extension against the transcript inventory to distinguish synthesis from novelty.
16. **Run QA and rendering checks.** Validate all hashes and schemas, recompute every total, compare ledger and display values, and inspect desktop/mobile accordion behavior, keyboard focus, and reduced motion.
17. **Promote deliberately.** Calibration artifacts remain under `docs/calibration/`. Production changes require explicit editorial acceptance after all required gates.

## Scoring-pass isolation

The pass allowlist is exhaustive. It may contain only the v2.2 workflow, rubric, scoring schema, gate manifest, one locked inventory, its audio-verification record, and that debate's canonical transcript, events, and caption manifest. Broad repository searches are prohibited. A pass must affirm that it accessed neither legacy assessments nor the other pass. Contaminated work is discarded and rerun in a fresh task.

The validator requires the same exact key set, order-independent, in every pass. Every inventory move appears exactly once; move ID, side, importance, timestamp, and source span must match. Every dimension is an integer from 0–100 and every recorded move score must equal the repository calculator. The section and overall audit totals must also recompute exactly.

## Score formulas

The six move dimensions retain these weights:

`move = round(.25 logical coherence + .20 evidence/warrant + .20 responsiveness + .15 relevance/burden + .10 precision/clarity + .10 calibration/charity)`

Within a section, each selected move has importance 1–3:

`section = round(sum(move score × importance) / sum(importance))`

Across the debate, section percentages total 100:

`overall = round(weighted section mean + burden-completion adjustment)`

The displayed confidence range remains an agreement range, not a statistical confidence interval: two points below the lowest pass/final score through two points above the highest, bounded to 0–100.

## Burden-completion adjustment exclusion rule

The default adjustment is zero. A nonzero integer from −5 to +5 is eligible only when all of the following are true:

1. the rationale identifies a specific debate-wide consequence rather than a local move quality;
2. that consequence affects whether an adopted locked burden is completed;
3. the consequence is not already represented in any scored move dimension, score, importance, or section weight;
4. `relatedMoveIds` identifies every move considered when testing for duplication; and
5. the rationale explains why the consequence remains distinct after those moves are considered.

If every cited success or incompletion maps to one or more scored moves, the adjustment must be zero. A nonzero adjustment is invalid when it re-scores evidence, coherence, responsiveness, relevance, calibration, style, section coverage caused by inventory selection, or the cumulative importance of already scored moves. Closeness between Pass A and Pass B does not cure ineligibility. Adjudication may choose a nonzero value only under the same eligibility test.

Each pass and any adjudication records:

```json
{
  "value": 0,
  "rationale": "No distinct debate-wide consequence remains outside the scored moves.",
  "eligibility": {
    "distinctDebateWideConsequence": false,
    "affectsBurdenCompletion": false,
    "notAlreadyScored": false,
    "relatedMoveIds": [],
    "distinctConsequence": "none"
  }
}
```

The calculator rejects a nonzero value unless all three booleans are true, at least one valid related move is named, and `distinctConsequence` is substantive. It also rejects any zero adjustment that claims all eligibility conditions are true, forcing the scorer to state the actual exclusion decision. When the pass values do not trigger adjudication, a nonzero final adjustment survives only if both passes independently identify the same eligible consequence with the same sign. Otherwise the final adjustment is zero; a small numerical delta cannot smuggle an ineligible or disputed adjustment into the total.

## Gate rules

A calibration candidate fails QA if:

- a full local transcript or required hash is missing;
- any medium- or low-confidence move lacks successful audio verification;
- a representative quote lacks audio or independent-transcript verification;
- the two passes do not use the single v2.2 pass schema;
- burdens, section weights, move importance, or source spans changed after scores were visible;
- a triggered disagreement lacks adjudication;
- a burden adjustment violates the exclusion rule;
- a displayed score differs from calculator output;
- a tag supplies a new numerical penalty;
- the AI Extension is attributed to a participant or restates transcript material as novel;
- either pass accessed legacy material or the other pass; or
- `calibrationOnly` is cleared without editorial promotion.

The three-debate remediation gate keeps the v2.1 review thresholds fixed for a controlled comparison: mean absolute dimension delta at most 5, move-adjudication rate at most 0.25, maximum overall pass delta at most 5, winner-classification review threshold 0.20, and minimum rank correlation 0.90. Passing this gate can authorize only a preregistered ten-debate gate—not all 195 debates.
