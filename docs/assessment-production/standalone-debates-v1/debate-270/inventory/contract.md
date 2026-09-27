# Score-blind inventory contract

Produce one JSON object with `motion`, `routes`, `sections`, `moves`, `coverageAudit`, `speakerAttributionReview`, `selectionBalanceAudit`, and `publicationCapacityAudit`. No ratings, scores, winner, critiques, fallacy/bias tags, or AI Contribution. Use the exact identity and motion in the packet. Every semantic selection and burden decision must be yours; the controller supplies transport identity and source text mechanically.

Read the complete indexed transcript, source lock, approved scope, source notes, and rubric before selecting moves. The indexed transcript is the entire **approved** source, not the full recording: the user expressly excluded all audience Q&A and its answers. Its event indices refer to the canonical, approved-scope events array. A large timestamp gap is intentional. Never bridge that gap with an evidence excerpt, fill it from memory, or treat an excluded answer as silence. No outside research, other debates, scores, judgments, session logs, credentials, or unlisted source files may be read.

Trent Horn is `pro` on “Does the Christian God exist?”; Dan Barker is `con`. Distinguish Barker's evidential criticism from positive denials or moral claims he actually adopts. Do not impose proof of all naturalism merely because he disputes Horn's case. Cover both openings, both rounds of rebuttals, both cross-examinations, and both closings. A closing may rely only on retained formal-round evidence or premises it independently states; no audience premise or answer may supply hidden support.

## Source and attribution

The transcript is timestamped Whisper output with no automatic named-speaker attribution. Preserve source wording. Do not silently improve verse references, names, Greek terms, negatives, or numbers; do not turn a likely recognition error into a participant error. The source notes identify verified substitutions. Unbroken named presentations can support high confidence. In direct cross-examination, inspect the complete turn sequence and identify the actual speaker rather than assuming that the questioner speaks every line. Promptly corrected slips must be read with their correction. Mark material uncertainty honestly; below-high moves require explicit audio verification before adjudication. Stop and report any unresolved source problem that prevents a complete inventory, without writing an invented reconstruction.

## Routes and sections

`routes` contains exactly two objects `{side, speaker, bridges}`. Each `bridges` array contains 3–7 unique `{bridgeId, tier, description}` objects: exactly one `motion` tier, at least one `central`, and at least one `subsidiary`. Describe the obligation or inferential connection, not its success.

Use 4–7 coherent topical sections `{sectionId, title, weightPercent, rationale}`. IDs are unique descriptive lowercase slugs, never s1/s2. Positive integer weights sum to 100 and reflect motion-level importance before judgment. Both sides must have a genuine selected move in each section. Ordinary capacity is three selected moves per side per section; never exceed four. A fourth requires a source-specific pre-judgment explanation of why four distinct, independently assessable, nonmergeable moves belong to that same topic. When both sides have four, explain both sets. Do not force symmetry or discard material evidence to fit the display.

## Moves

Select 8–48 load-bearing moves in chronological order. Every move contains:

- `moveId`: unique descriptive lowercase slug, not m1/m2.
- `side`, `speaker`, `sectionId`: exact authorized values.
- `moveKind`: `constructive` or `reply`.
- `claim`, `warrant`, `inference`: faithful descriptions separating proposition, support, and inferential consequence; no rating language.
- `startEvent`, `endEvent`: inclusive zero-based canonical event indices. Choose the smallest contiguous passage containing the claim and necessary support; do not take an entire speech or broad neighborhood.
- `sourceSpanSelectionRationale`: explain these particular boundaries. An excerpt above 2,200 characters needs a compelling argument-completeness reason, not convenience.
- `quoteEligibleExactSpans`: one or two clean, exact substrings of the chosen passage, 3–18 words each, preferably 6–14; preserve wording and case, and avoid interjectors or garbled terminology.
- `attributionConfidence`: `high`, `medium`, or `low`, with `attributionRationale` and `audioVerificationReason`.
- `importance`: integer 1–3, plus `importanceRationale`, reflecting burden importance, not quality.
- `burdenContact`: `{bridgeId, tier, rationale}`, referencing the same tier in the relevant side's route.
- `respondsToIds`: earlier selected move IDs, or `[]` for a constructive move.
- `responseComponents`: for replies, nonempty `{targetMoveId, description}` entries specifying the challenged premise, inference, comparison, or consequence; otherwise `[]`.

A reply must target an earlier selected move. Do not select a later rebuttal while omitting its load-bearing target. Repeated recitations are not separate accomplishments, but substantive new replies or qualifications must not disappear. Treat diagnostic questions as challenges, not unargued contrary theories.

## Coverage and count audits

`coverageAudit` identifies every major retained line, the selected move IDs covering it, and source-specific reasons for omitting repetitions, minor asides, or logistical material. Include openings through closings, with explicit attention to causation/change/contingency, resurrection and textual evidence, scriptural morality and interpretation, evil/hiddenness and epistemic tests, moral grounding, and institutional conduct wherever the source actually develops them. This is a coverage checklist, not a required section template.

`speakerAttributionReview` explains the round boundaries and every selected mixed-speaker passage. State any remaining uncertainty. Verify that the corrected apology reversal is not scored as an uncorrected concession. Explain why no closing selection depends on the excluded Q&A.

`selectionBalanceAudit` uses actual recomputed counts:

```
{
  "thresholds": {"totalAbsoluteDifference": 3, "sectionAbsoluteDifference": 2},
  "totals": {"pro": 0, "con": 0, "absoluteDifference": 0},
  "sections": [{"sectionId": "...", "pro": 0, "con": 0, "absoluteDifference": 0}],
  "rationaleRequired": false,
  "rationale": "Source-grounded explanation, never a numerical symmetry target."
}
```

A rationale is required when the total difference is at least 3 or any section difference is at least 2. Explain why each asymmetric selected move is load-bearing.

`publicationCapacityAudit`:

```
{
  "maximumSelectedMovesPerSidePerSection": 4,
  "sections": [{"sectionId": "...", "pro": 0, "con": 0, "withinCapacity": true, "fourthRowRequired": false, "fourthRowAuthorized": true, "rationale": "..."}],
  "allSectionsWithinCapacity": true,
  "allFourthRowsPreauthorized": true
}
```

Use section order. `fourthRowRequired` is true if either side has four. `fourthRowAuthorized` is true for ordinary rows, or for a fourth only with the required specific rationale. Independently count every array; the controller will recompute all counts.

Before writing, send a complete-reading checkpoint and wait for the controller's authenticated release. After release, use apply_patch to create the one allowed absolute output path once. Do not overwrite or revise a saved first submission, launch other agents, make paid calls, or inspect any unlisted input.
