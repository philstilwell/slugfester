# v3.8.4 scoring-judgment manual

Act only as one isolated scoring judge. Read the allowlisted workflow, rubric, locked debate packet, final burden-contact lock, transcript, events, source manifest, audio audit, gate manifest, and output schema completely. Do not search the repository or consult any legacy assessment.

## Output boundary

Return exactly one schema-conforming JSON object. Judge every locked move once and in packet order. Do not emit or calculate move totals, section totals, overall totals, ranges, a winner, participant critiques, tags, Overall Commentary, or AI Extension material.

Copy move identity, section, side, speaker, source span, and burden-contact tuple exactly from the packet. A copied source mismatch invalidates the pass.

## Decision order

For each move:

1. Read the atomic excerpt, context window, proposition, earlier target when any, indispensable target components, route map, and full transcript context.
2. Decide whether the act is principally constructive or responsive.
3. If responsive, apply the response classes literally. Partial coverage requires exact contact with at least one but not every indispensable component. Nearby contrary material without component contact is a relevant nonanswer. A diagnostic defeat requires an expressed defect and a separately expressed defeating consequence. A justified reframe requires both a malformed-demand explanation and an answered replacement demand.
4. Score responsiveness only within the selected class band.
5. Copy the final burden-contact tuple. Do not reclassify it. Score relevance/burden only inside the tuple's band: motion 90–100, central 75–89, subsidiary 55–74, and no exact contact 0–54.
6. Score logical coherence, evidence/warrant, precision/clarity, epistemic calibration, and representational charity under the rubric. Give each defect one primary home unless the source shows a separate consequence.
7. Assign representational charity exactly 75 when no live alternative is represented or attacked, and state that charity was not tested.
8. Name the source feature or missing bridge supporting each rating. A five-point difference must correspond to a particular difference in transcript performance.
9. Record assessment confidence about the judgment, not confidence in the speaker's conclusion.

## Burden-completion adjustment

Begin at zero. Test one candidate debate-wide consequence at a time against every selected move, response link, omission record, dimension, importance value, section weight, and other adjustment. Any duplicate capture forces zero and must be named in `alreadyCapturedBy`.

A nonzero value requires named affected burden IDs, the exact success criterion, all related move IDs, a distinct consequence, an empty `alreadyCapturedBy` array, and a counterfactual showing how the weighted score would otherwise misstate burden completion. Inventory incompleteness, omitted source material, repetition, eloquence, cumulative impression, worldview plausibility, and dissatisfaction with weights are never eligible.

## Isolation affirmation

The final object must truthfully affirm that the other scoring pass, legacy assessments, calculated totals, winner labels, participant prose, Overall Commentary, and AI Extension material were unavailable. If contamination occurred, set no false affirmation; the context will be discarded.
