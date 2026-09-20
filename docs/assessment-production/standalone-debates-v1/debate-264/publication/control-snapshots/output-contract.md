# Slugfester Reassessment Output Contract

## Source and provenance

- Assess the complete substantive transcript, not highlights or commentary about the debate.
- Prefer timestamped YouTube captions or a supplied transcript. Cross-check uncertain wording, speaker changes, and central claims against a second public transcript or the audio when practical.
- Preserve the stable debate `id`, `number`, URL, speaker identity, and side ordering unless the source proves them wrong.
- Set the displayed render date to the reassessment date.
- Update `sourceNote` to identify the sources actually used and distinguish direct quotes from condensed summaries.

## Assessment attribution

- Set `assessmentModel` to the exact model that generated the reassessment.
- Set `assessmentRubric` to `Slugfester Reassessment Rubric v2` only when the scorecard was fully produced under the promoted adjudicated-consensus workflow.
- Never change model attribution without replacing the scored prose and ledger with work actually produced by that model.
- Keep the scoring note explicit that scores are AI-generated estimates of transcript performance.

## Argument selection and prose

- Use 4–7 topical sections and enough linked or unpaired moves to represent the load-bearing exchange without manufacturing symmetry.
- Cover every load-bearing argument, major direct rebuttal, and important concession. Exclude moderator logistics and audience assertions unless a speaker substantively adopts or answers them.
- Keep each `argument.words` to 8–55 words and make it a direct short quote or faithful transcript-grounded condensation.
- Target 112–118 words and keep each critique within 105–130 words and at least 880 characters. Use exactly four sentences in this order: `Strongest feature:`, `Principal limitation:`, `Live burden:`, `Locked score:`. Require terminal punctuation and reject unexpected script or replacement-character artifacts.
- Prefer an empty tag list to a forced label. Add a fallacy or bias tag only when the defect materially affects the inference and the contextual note is precise.
- Target 6–14 words for representative quotations. Accept only 3–18 word exact substrings from quote-eligible locked source spans.

## Overall Commentary

- Use the computed overall score.
- Give at least three concrete `Landed` items and at least one material `Whiffed` item per side.
- Base these on the locked section-weighted record, not on minor exchanges or an unweighted mean.
- Link only genuinely applicable named fallacies or biases.

## AI Extension

Always include the visibly labeled, default-collapsed `AI Extension` after Overall Commentary.

For each side provide:

- A `thesis` clearly framed as the AI's steelman.
- Four to six explicit premises that strengthen the side's final case and answer the strongest objections exposed by the transcript.
- A proportionate conclusion that does not claim more than the premises support.
- Two to four genuinely new reinforcing arguments, each 45–130 words, that were not merely restatements of the speaker's live points.

Add a ledger novelty map that identifies, for every extension item, the transcript move IDs it extends or repairs. Use an empty source-move list plus an explanation for a genuinely new line. Do not score AI-added material as participant performance.

The extension must state that it is AI-generated, not transcript content and not wording attributable to either speaker. Do not describe either position as immune to objection or use language claiming rational invulnerability in displayed copy. Strengthen both positions against the strongest live criticisms while keeping their conclusions proportionate.

Display exactly: `Assessments made by 5.6 Sol. — Rubric: Slugfester Reassessment Rubric v2.` Do not use the word `unassailable` in the AI Extension.

Use a native `details` accordion, collapsed by default, immediately after Overall Commentary. Give the section a visibly distinct background or text treatment and verify pointer and keyboard operation.

## Reassessment ledger

- Save calibration ledgers under the active versioned calibration root. Save production ledgers under `docs/assessment-ledgers/` only after the complete per-debate production gate passes.
- Keep stable move IDs aligned with the move order in the debate object.
- Use the calculator output without manual score overrides.

## Verification

- Run the repository ledger calculator and compare every computed score with the debate object.
- Verify both scoring passes, required adjudications, burden links, response links, hashes, tag review, and AI Extension novelty map.
- Run the repository's syntax, schema, design, and generated-artifact checks.
- Inspect the rendered debate on desktop and mobile.
- Test the AI Extension accordion closed, open, and keyboard-focusable.
- Review the final diff for accidental changes to other debates and for unsupported model relabeling.
