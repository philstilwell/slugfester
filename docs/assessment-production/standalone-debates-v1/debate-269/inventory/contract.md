# Score-blind inventory contract

Produce one JSON object with `motion`, `routes`, `sections`, `moves`, `coverageAudit`, `speakerAttributionReview`, `selectionBalanceAudit`, and `publicationCapacityAudit`. No ratings, scores, winner, critiques, tags, or AI Contribution. Use the identity and exact motion in the packet. The controller supplies transport identity fields and source text mechanically, but every semantic decision must be yours.

Read the complete indexed transcript, source review, source lock, audio supplement, and rubric before choosing anything. Caption wording is immutable. The audio supplement identifies recognition errors, not independently established philosophical facts. Do not silently fix quotes or turn those errors into participant mistakes. No outside factual research, previous assessments, other debates, model sessions, or output of another worker may be read.

Linford's original affirmative on the negative motion becomes `con` on the frozen display question. His burden is epistemic non-acceptance of a cause or beginning, not proving that physical reality is beginningless or uncaused. Loke is `pro`. Do not impose a stronger positive naturalistic burden where Linford only challenges an inference; do assess any positive premises he actually adopts. Cover both opening cases, both rebuttals, the complete extended direct questioning, and both closings. Repetition need not become a second selected move, but a new substantive response or qualification must not be erased. Logistical interjections and the vague Matt Adams meta-question introduce no motion argument.

## Routes and sections

`routes` contains exactly two objects `{side, speaker, bridges}`. Each `bridges` array contains 3–7 unique `{bridgeId, tier, description}` objects: exactly one `motion` tier, at least one `central`, and at least one `subsidiary`. Describe the inferential connection or obligation, not your assessment of its success.

Use 4–7 coherent topical `sections`: `{sectionId, title, weightPercent, rationale}`. IDs must be descriptive lowercase slugs, never s1/s2. Positive integer weights sum to 100 and reflect motion-level importance before judgment, not who seems stronger. Both sides must have a real selected move in each section. Let evidence determine counts and grouping; do not manufacture symmetry. Ordinarily at most three cards per side/section; never more than four. A fourth requires a source-specific pre-judgment explanation of why four distinct, independently assessable, nonmergeable moves belong to that same topic. If both sides have four, explain both sets.

## Moves

Select 8–48 load-bearing moves, in chronological order. Every move contains:

- `moveId`: stable descriptive lowercase slug, unique; never m1/m2.
- `side`, `speaker`, `sectionId`: exact authorized values.
- `moveKind`: `constructive` or `reply`.
- `claim`, `warrant`, `inference`: faithful short explanations separating the proposition, its offered support, and the conclusion it is meant to advance. No rating language.
- `startEvent`, `endEvent`: inclusive zero-based indices in the original full event array. Choose the smallest contiguous passage containing the claim and its essential support, not a broad neighborhood. The controller derives exact timestamps and excerpt.
- `sourceSpanSelectionRationale`: source-specific reason for these boundaries. An excerpt above 2,200 characters requires a compelling argument-completeness justification, not convenience. Prefer a complete but narrow passage.
- `quoteEligibleExactSpans`: one or two clean, exact substrings of that passage, 3–18 words each, preferably 6–14. Preserve case and wording. Avoid garbled names, mistranscribed negatives, incomplete clauses, or words belonging to an interjector.
- `attributionConfidence`: `high`, `medium`, or `low`, plus concrete `attributionRationale` and `audioVerificationReason`. Rapid mixed turns or material unresolved wording must not be labeled high merely to avoid checks. High may be justified by unbroken named presentations or already verified evidence. Every below-high move will receive a separate, explicit audio-verification disposition before adjudication.
- `importance`: integer 1–3, plus `importanceRationale`, reflecting burden importance, not quality.
- `burdenContact`: `{bridgeId, tier, rationale}`, referencing an actual route bridge of the same tier.
- `respondsToIds`: earlier selected move IDs; constructive moves use `[]`.
- `responseComponents`: for a reply, one or more `{targetMoveId, description}` entries identifying the specific challenged premise, comparison, inference, or consequence. Constructive moves use `[]`.

Replies must reference only earlier selected moves and must have at least one component; constructive moves must have no reply target. Do not choose a later response while omitting its load-bearing target. Do not select repeated descriptions of an argument as distinct accomplishments. A substantive concession can be a move; logistics, politeness, or a promptly corrected reading mistake are not automatically substantive failures.

## Complete coverage and count audits

`coverageAudit` should name every major line, its selected move IDs, and why omitted repetitions, minor asides, or logistical spans add no independently assessable burden. Record opening-to-closing coverage, including challenges about observational underdetermination, causal principles and material parity, emergent/nonmetric time, agency/first cause, and order/design insofar as the source actually develops them. Do not force one section per item in this list.

`speakerAttributionReview` explains round boundaries and every selected mixed-turn passage, referring to the locked source/audio evidence and stating remaining uncertainty honestly.

`selectionBalanceAudit`:

```
{
  "thresholds": {"totalAbsoluteDifference": 3, "sectionAbsoluteDifference": 2},
  "totals": {"pro": 0, "con": 0, "absoluteDifference": 0},
  "sections": [{"sectionId": "...", "pro": 0, "con": 0, "absoluteDifference": 0}],
  "rationaleRequired": false,
  "rationale": "Source-grounded explanation; never a target of numerical symmetry."
}
```

Use actual counts, not these placeholders. A rationale is mandatory if total difference is at least 3 or any section difference is at least 2, and must explain why every asymmetric selected move is load-bearing.

`publicationCapacityAudit`:

```
{
  "maximumSelectedMovesPerSidePerSection": 4,
  "sections": [{"sectionId": "...", "pro": 0, "con": 0, "withinCapacity": true, "fourthRowRequired": false, "fourthRowAuthorized": true, "rationale": "..."}],
  "allSectionsWithinCapacity": true,
  "allFourthRowsPreauthorized": true
}
```

The section order must match `sections`. `fourthRowRequired` is true if either count is four. `fourthRowAuthorized` is true for ordinary rows, or only with a specific sufficient preauthorization rationale for a fourth. Independently check all counts before submission; the controller will recompute them too. Do not discard meaningful evidence merely to obtain capacity.

Before writing, send a full-read checkpoint with model identity and the actual inputs read; wait for the controller's authenticated release. The allowed output is a first submission, not a place for recursive unrecorded repairs. Use apply_patch. Do not launch other agents or paid calls.
