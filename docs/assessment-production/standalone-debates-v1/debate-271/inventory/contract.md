# Score-blind inventory contract

Produce one JSON object containing motion, routes, sections, moves, coverageAudit, speakerAttributionReview, selectionBalanceAudit, and publicationCapacityAudit. Do not generate ratings, totals, a winner, critiques, tags, or AI Contribution. The controller mechanically adds identity and source excerpts; every semantic selection and burden decision must be yours.

Read the entire approved indexed transcript, source lock, editor scope, source notes, rubric, and this contract. Source event indices are zero-based indices into the canonical full events array, not line numbers in the approved transcript. Only the approved formal turns are eligible. Do not read excluded audience material or outside sources. No other debates, scores, judgments, publication, session logs, credentials, or unlisted source files may be read.

William Lane Craig is pro and Massimo Pigliucci con on the exact motion “Does the Christian God exist?”. Distinguish Pigliucci’s evidential criticism from positive denials or moral claims he actually adopts. Do not impose proof of all naturalism merely because he disputes Craig’s case. Cover both openings, both first rebuttals, both second rebuttals, and both closings. The moderator’s later third-position interlude and the entire audience Q&A are excluded, including all answers. Excluded material supplies neither support nor an alleged unanswered challenge.

## Source fidelity

Preserve transcription wording and exact timestamps. Do not silently correct names, verse references, scientific terms, negatives, or numbers, or turn a likely recognition error into a participant’s defect. Formal uninterrupted speaker turns and named references can support high attribution confidence; this is distinct from the truth of a claim. Inspect complete context around every boundary. Material uncertainty must be marked below high and needs audio verification before adjudication. Stop and report a source problem rather than inventing missing content.

## Routes and sections

Routes: exactly two objects {side, speaker, bridges}. Each bridges array has 3–7 unique {bridgeId, tier, description} objects: exactly one motion tier, at least one central and one subsidiary. Describe burdens or inferential links, not success.

Sections: 4–7 coherent topical objects {sectionId, title, weightPercent, rationale}. IDs are unique descriptive lowercase slugs, never s1/s2. Positive integer weights sum to 100 and reflect motion-level importance before judgment. Every section must contain a genuine selected move from each side. Three moves per side per section are ordinary; four is the absolute limit. A fourth requires a source-specific explanation that all four are distinct, independently assessable, nonmergeable, and semantically belong together. Explain both sides if both have four. Do not manufacture symmetry or omit a material move to fit the display.

## Moves

Select 8–48 load-bearing moves in chronological order. Each move includes:

- moveId: unique descriptive lowercase slug, never m1/m2.
- side, speaker, sectionId: exact authorized values.
- moveKind: constructive or reply.
- claim, warrant, inference: separate faithful descriptions without rating language.
- startEvent, endEvent: inclusive canonical event indices; choose the smallest contiguous passage containing the claim and its necessary support.
- sourceSpanSelectionRationale: explain these particular boundaries. Excerpts above 2200 characters need a compelling argument-completeness reason. Do not pad evidence with a speech or broad neighborhood.
- quoteEligibleExactSpans: one or two exact substrings of the selected excerpt, 3–18 words each, preferably 6–14. Preserve case and wording; avoid corrupt terms or another speaker.
- attributionConfidence: high, medium, or low, with attributionRationale and audioVerificationReason.
- importance: integer 1–3, with importanceRationale based on burden significance, not quality.
- burdenContact: {bridgeId, tier, rationale}, referring to the same side’s bridge and matching tier.
- respondsToIds: earlier selected move IDs; [] for constructive moves.
- responseComponents: replies require nonempty {targetMoveId, description} objects naming challenged premises, inferences, comparisons, or consequences; constructive moves require [].

A reply must target an earlier selected move. Do not omit its load-bearing target. Repeated recitations are not independent accomplishments, but new replies and qualifications must not disappear. Diagnostic questions are challenges, not unargued contrary theories.

## Coverage and count audits

coverageAudit must cover every major retained line, its selected move IDs, and source-specific reasons for omitting repetition, minor asides, or logistics. Inspect the motion’s Christian specificity and allocation of burdens; origin and causality; fine-tuning; moral objectivity, adaptation, divine goodness, and biblical interpretation; resurrection evidence and alternative explanations; and religious experience wherever actually argued. These are a coverage checklist, not imposed sections. Cover the whole approved record through both closing statements.

speakerAttributionReview explains round boundaries and any mixed-speaker spans and remaining uncertainty. All substantive retained presentations are formal named turns, while timekeeping and applause are unscored.

selectionBalanceAudit: {thresholds:{totalAbsoluteDifference:3,sectionAbsoluteDifference:2},totals:{pro:N,con:N,absoluteDifference:N},sections:[{sectionId,pro:N,con:N,absoluteDifference:N}],rationaleRequired:boolean,rationale:string}. Derive actual counts, in section order. Rationale is required if total difference is at least 3 or any section difference is at least 2; explain why every asymmetric selected move is load-bearing.

publicationCapacityAudit: {maximumSelectedMovesPerSidePerSection:4,sections:[{sectionId,pro:N,con:N,withinCapacity:boolean,fourthRowRequired:boolean,fourthRowAuthorized:boolean,rationale:string}],allSectionsWithinCapacity:boolean,allFourthRowsPreauthorized:boolean}. fourthRowRequired is true if either side has four; fourthRowAuthorized is true for ordinary rows or a fourth with the specific justification. Controller independently recomputes every count and flag before freeze.

Confirm the allowed absolute destination before writing. First read every required input without truncation and send a complete-reading checkpoint. Wait for controller authentication and release. Then make the one allowed first submission, once, to the absolute output path using apply_patch. Do not revise saved bytes, spawn agents, make paid calls, or inspect unlisted inputs.
