# Slugfester Recovery Primary Failure Diagnosis v4.2.19.3

This code-only stage diagnoses the preserved 0-of-3 v4.2.19.2 gate. It makes no model call, changes no raw output, accepts no counterfactual, derives no score, and does not authorize Pass B, adjudication, audio verification, production mutation, or the 195-debate run.

The routing recovery succeeded operationally: all three contexts completed between 3.90 and 4.37 minutes, including the 1,798-event, 144 KB stress context, with no timeout or transport failure. This is runtime evidence only because none of the outputs passed the unchanged semantic validator.

All three validators first stopped at the exact-character evidence-cue rule. Across 30 moves, 19 cues were character-exact. Seven additional cues preserved the exact contiguous lexical-token sequence but omitted or altered transcript punctuation. Three Debate 110 cues had complete bag-of-words and ordered coverage but differed in repeated caption disfluencies. One Debate 147 cue was complete in the full transcript but crossed the selected source-span boundary by one lexical item. These results reject exact character copying as an operationally reliable model responsibility.

In-memory counterfactuals replace each cue with the best source-exact phrase from the already-selected span solely to expose later failures. Under that non-accepted test, Debates 110 and 194 pass the complete validator. Debate 147 next fails because `pro-mind-1`, sourced at events 481–497, targets `con-mind-1`, sourced later at events 503–518. The repository chronology guard correctly rejects that response edge. No target is deleted, reversed, or reclassified.

The next recovery design should remove source-quotation mechanics from model output. Given a model-selected inclusive event span and proposition, the repository should choose a bounded verbatim evidence window by a frozen lexical-salience algorithm, with deterministic tie-breaking and the same 12-to-90-token and 450-character ceilings. The model's span remains a semantic judgment; the repository's quotation becomes a mechanical rendering of that locked span.

Chronology and response-target rejection must remain strict. A target that is later in source order is a semantic topology error, not a formatting defect. The recovery design may strengthen the schema and prompt so each reply identifies only a previously encountered move, but it may not automatically drop the edge or convert the move to constructive. Another model execution requires a new code-only fixture, a frozen disjoint sample, and a fresh cost estimate.
