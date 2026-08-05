# Slugfester Deterministic Prose Normalization v4.2.15

This retired, code-only recovery normalizes the v4.2.14 Debate 103 correction proposal. Seven AI-authored critiques exceed the 130-word cap by 2–9 words. Every other corrected string is valid, and the proposal completed within the combined finalization runtime budget.

The normalization rule is generic and deterministic. For each critique over 130 words, split the text into sentences. Protect every sentence containing the critique's required strongest-feature, principal-limitation, live-burden, or locked-score explanation. Remove the shortest remaining sentence, using source order as a tie-breaker, only when the result remains at least 105 words. Repeat only if still necessary. Fail closed if the four protected markers or the 105–130 word range cannot be preserved.

Repository code then applies the normalized proposal through the existing v4.2.14 bounded merge and runs the complete unchanged v3.8.8 reconstruction validator. No model is called, no new prose is invented, and no score, identity, section, move selection, summary, Overall Commentary item, novelty record, disclosure, byline, or display field can change.

The runtime projection counts both actual model contexts from v4.2.13 and v4.2.14. A valid combined lane at or below 4.5 minutes authorizes preparation—not execution—of a three-debate retired finalization gate. It does not authorize new scoring, a fresh judgment gate, production mutation, or the 195-debate run.
