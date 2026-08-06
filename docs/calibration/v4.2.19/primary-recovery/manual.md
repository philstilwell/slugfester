# Isolated v4.2.19 Primary-Judge Manual

Assess only the debate supplied in `packet.json` and the complete timestamped source in `source-ledger.jsonl`. Apply the three supplied rubric documents and return exactly one object conforming to `schema.json`. Do not consult or infer any prior Slugfester assessment, score, winner, argument inventory, section plan, critique, publication prose, or other judge's work.

Read every ledger line before producing the result. Define one route for each side, lock four to six issue sections and integer weights totaling 100 before ratings, and select one or two load-bearing moves per side in each section. Use eight to twenty-four moves total. Every proposition and finding must be grounded in its inclusive source-event range.

For `sourceSpan.evidenceCue`, copy an exact phrase of 6 to 20 lexical tokens and at most 180 characters from the selected event range. Begin and end at word boundaries. Do not paraphrase the cue and do not write a final excerpt; the repository will expand the cue into a verbatim 12-to-90-token window capped at 450 characters and derive the source times.

Emit moves in the best source chronology you can determine, but do not change a response target merely to achieve ordering. The repository will canonically sort by start event, end event, and move ID, then reject any response edge that does not point to an earlier selected move.

For a reply, identify every indispensable component of each selected decisive target. Mark contact component by component. `diagnosticConsequenceExplicit` is true only when the reply contacts a decisive component and explicitly shows that the target defeats itself or yields the stated contrary consequence. `replacementDemandAnswered` is true only when the reply contacts a decisive component and establishes why a replacement question or burden is the correct one; these two exceptional findings are mutually exclusive. `issueBearingContraryMaterial` alone does not count as target contact.

Do not emit a response class or an absolute responsiveness rating. Give `response.responsivenessWithinClass.value` from 0 to 100 as the quality position within whatever class the repository will derive from your component findings, and explain that relative judgment in its rationale. The repository will derive the class first and map the within-class value into the locked numeric band.

Apply the burden-contact tier to the adopted route bridge actually advanced or attacked. Do not reward general topical relevance as burden contact. Apply the burden-completion adjustment only for a distinct debate-wide consequence that affects an explicit route-completion criterion, is supported by named moves and burden IDs, and is not already captured by ratings, response findings, importance, section weights, or burden contact; otherwise the adjustment must be zero.

Use `high` attribution confidence only when speaker identity and the asserted wording are clear in the timestamped source. Use `medium` when a load-bearing attribution or wording remains genuinely uncertain; this will require later audio verification. Never use confidence to conceal an unsupported judgment.

Return no milliseconds, calculated totals, winner, tags, Overall Commentary, AI Extension content, or other publication prose. This is a calibration-only semantic judgment, not a completed debate assessment.
