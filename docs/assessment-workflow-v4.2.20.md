# Slugfester Source-Span Evidence Rendering v4.2.20

This code-only recovery implements the evidence and topology design authorized by the preserved v4.2.19.3 diagnosis. It makes no model call, accepts no prior failed output, derives no score, and does not authorize Pass B, adjudication, audio verification, production mutation, or the 195-debate run.

## Evidence allocation

The model selects only an inclusive `startEvent` and `endEvent` for each move. It emits no quotation, cue, timestamp, or excerpt. The source span remains a substantive judgment: it must contain the evidence for the proposition and associated findings.

The repository renders a contiguous verbatim excerpt from that locked span. It enumerates every whole-word candidate from 12 to 90 lexical tokens and no more than 450 characters. Candidate salience uses a frozen stop-word list and unique-token weights of 4 for the proposition, 2 for `evidenceBasis`, and 2 for the response rationale. Ties resolve by matched-anchor count, proposition overlap, distance from 380 characters, token count, and earliest source position, in that order. The original event range never changes.

This allocation removes punctuation copying, caption-disfluency reproduction, and quote-length control from the model while preserving its semantic responsibility to identify the correct source range. A span with fewer than 12 lexical tokens or no bounded whole-word window fails.

## Response topology

Repository chronology remains `startEvent`, `endEvent`, then `moveId`. Every reply target must be a selected move that is earlier in that order. The schema and manual explicitly prohibit anticipating a later move. A future or unknown target fails; the repository never drops, reverses, substitutes, or reclassifies the edge.

The response-class and responsiveness allocation from v4.2.19 remains unchanged: the model supplies component and exceptional findings plus only a within-class quality position, while the repository derives the class and maps that position into its locked band.

## Verification boundary

Synthetic re-encodings of the preserved v4.2.19.2 raws show that Debates 110 and 194 pass the full validator once evidence rendering is repository-owned. Debate 147 remains rejected for its genuine future-target edge. These are compiler fixtures only and do not revise the 0-of-3 gate result.

A passing code-only design authorizes selection and preparation of a new disjoint sample. It does not authorize model execution. A new run requires frozen sources, a no-retry manifest, and a fresh cost estimate.
