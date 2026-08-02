# Slugfester Reassessment Workflow v2.1

This is the canonical workflow for new Slugfester reassessments. Version 2 remains the production baseline for Debate #1; v2.1 stays calibration-only until the pilot gate in this document is passed and explicitly accepted.

## What v2.1 changes

- One repository-owned scoring module is the source of truth for both calculators and validators.
- The transcript, source hashes, motion, neutral side labels, and burdens are locked in a score-blind packet before any legacy assessment is consulted.
- Argument discovery and scoring are separate stages. Existing scores, critiques, tags, and commentary are prohibited inputs to the scoring passes.
- Two scoring passes independently score every selected move. Large disagreements require a documented adjudication.
- Section scores are importance-weighted move means. Overall scores are locked section-weighted means plus only a small, explicit burden-completion adjustment. The v2 coverage/coherence/global meta-scores are removed to reduce double counting.
- Move evidence, stable identifiers, burden links, response links, quote status, speaker-attribution confidence, and audio-check status are recorded in the ledger.
- Fallacy/bias tags are reviewed only after scoring. AI Extension novelty is reviewed only after the assessment is complete.
- Calibration scores are stored outside production ledgers and never enter rankings automatically.

## Version and provenance contract

Every ledger must identify:

- `schemaVersion: "2.1"`
- `workflowVersion: "Slugfester Reassessment Workflow v2.1"`
- `rubricVersion: "Slugfester Reassessment Rubric v2.1"`
- the exact assessment model label;
- source-manifest and blind-packet hashes;
- both scoring-pass completion times and context-isolation method;
- whether the result is calibration-only;
- the actual independence level of the passes.

Never call same-context, same-model passes independent. Use a label such as `same-model-sequential` and keep that limitation visible. Production promotion requires genuinely isolated passes or a documented exception accepted by the editor.

## Required order of operations

1. **Lock the sample or target.** Record why the debate was selected before looking at legacy score differences.
2. **Acquire the full source.** Store timestamped transcript text locally, save retrieval metadata and SHA-256 hashes, and record caption limitations. Cross-check central wording and speaker changes against audio or a second transcript.
3. **Build the blind packet.** Include the motion, neutral side labels, and full transcript. Exclude all prior scores, critiques, tags, winner labels, Overall Commentary, and AI Extension material.
4. **Define burdens.** For each side, give each constructive or critical burden a stable ID, a plain-language description, and observable success criteria. A critic is not assigned the burden of proving the contrary unless the critic actually adopts it.
5. **Inventory arguments.** Map all load-bearing claims, replies, concessions, and unanswered objections chronologically. An argument may stand alone; never create a fake counterpart merely to make columns line up.
6. **Lock weights and evidence anchors.** Select 4–7 production sections, set section percentages totaling 100, give each move importance `1`, `2`, or `3`, and record rationales before scoring begins. Retain the complete local context for scoring, but commit only a 30–90 word exact excerpt with start/end timestamps as the auditable anchor.
7. **Score Pass A.** Apply the v2.1 dimensions and write a concise evidence-based rationale for every move. Do not compute or view legacy comparisons.
8. **Score Pass B in an isolated context.** Use the identical packet, burden map, move inventory, and locked weights, but no Pass A scores or rationales.
9. **Adjudicate only triggered disagreements.** Adjudication is required when any dimension differs by more than 8 points or a computed move differs by more than 4 points. A burden adjustment differing by more than 2 points also requires adjudication. Preserve both original passes.
10. **Calculate mechanically.** Run `node scripts/calculate-reassessment.mjs <ledger.json> --write`. Never hand-edit a calculated total.
11. **Draft the scorecard.** Critiques must explain the strongest feature, the principal limitation, the live burden, and why the performance belongs in its score band.
12. **Review tags.** Add a fallacy or bias tag only when a named defect materially affected an inference already reflected in the dimensions. Empty tag lists are normal.
13. **Draft and audit AI Extension.** Place it after Overall Commentary in a default-collapsed accordion with visually distinct styling. Explicitly identify it as AI-generated, avoid rational-invulnerability language, strengthen both sides proportionately, and map each new argument against the transcript inventory to demonstrate novelty.
14. **Run QA and render checks.** Validate hashes and schema, recompute all totals, compare ledger scores with displayed scores, inspect desktop/mobile rendering, and test the accordion closed, open, keyboard-focused, and with reduced motion.
15. **Promote deliberately.** Calibration artifacts remain under `docs/calibration/`. Moving a result into `docs/assessment-ledgers/`, updating the debate object, or changing rankings requires explicit editorial acceptance of the method and that debate's full reassessment.

## Score formulas

The six move dimensions retain these weights:

`move = round(.25 logical coherence + .20 evidence/warrant + .20 responsiveness + .15 relevance/burden + .10 precision/clarity + .10 calibration/charity)`

Within a section, each selected move has importance 1–3:

`section = round(sum(move score × importance) / sum(importance))`

Across the debate, section percentages total 100:

`overall = round(weighted section mean + burden-completion adjustment)`

The burden-completion adjustment is an integer from −5 to +5. It corrects only for consequential full-debate burden completion not already captured in selected moves. It must not reward style, re-score coherence, or duplicate a move-level defect. Each pass assigns it independently.

The displayed confidence range is an agreement range, not a statistical confidence interval: two points below the lowest pass/final score through two points above the highest, bounded to 0–100.

## Adjudication and audit gates

A production candidate fails QA if any of the following is true:

- transcript or blind-packet hashes are missing;
- a central direct quote has low speaker-attribution confidence and no audio check;
- burdens, section weights, or move importance were changed after scores were visible;
- a triggered disagreement lacks adjudication;
- a displayed score differs from calculator output;
- a tag supplies a new numerical penalty;
- the AI Extension is attributed to a participant or simply restates transcript arguments;
- either scoring pass had access to legacy scores or the other pass's scores;
- `calibrationOnly` is cleared without editorial promotion.

## Pilot gate

Before corpus-wide adoption, copy `docs/calibration/v2.1/promotion-gate-template.json`, fill every threshold and provenance field, and commit it before scoring. Then test at least ten debates spanning topic, duration, format, burden posture, participant count, and legacy score shape. Report:

- source-acquisition and attribution success;
- mean and maximum pass disagreement by dimension and move;
- adjudication rates;
- score-band and winner stability for complete-debate reassessments;
- tag acceptance/rejection rates;
- AI Extension novelty-review results;
- time and manual-audio-review burden;
- known dependence or anchoring limitations.

The mechanics may pass while production adoption remains blocked. A targeted move benchmark tests rubric reliability; it does not establish full-debate coverage, rankings stability, or winner stability.
