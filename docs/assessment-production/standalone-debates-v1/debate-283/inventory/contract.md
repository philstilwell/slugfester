# Score-blind inventory contract

Produce one JSON object with motion, routes, sections, moves, coverageAudit, speakerAttributionReview, selectionBalanceAudit, and publicationCapacityAudit. Generate no ratings, totals, winner, critiques, tags or AI Contribution. The controller mechanically adds identity and exact source excerpts; semantic selection, burden mapping and importance decisions are yours.

Read every packet allowedInput completely in manageable untruncated chunks. The indexed transcript contains the complete supplied recording. Canonical event indices are zero-based. Only listed files may be read; no other debates, prior assessments, judgments, publication, session logs, credentials or outside sources. Events JSON is lookup-only. Source notes restrict transcription-based inferences.

Dinesh D'Souza is pro (God exists), and Dan Barker is con (Belief in God is not warranted), on the exact motion “Does God exist?”. Preserve their adopted burdens and qualifications in the complete transcript and source notes. Cover both openings, rebuttals, direct questioning, substantive audience answers and both closings. Moderator/audience questions are unscored context; their premises do not automatically belong to a debater. No substantive primary-speaker interval is excluded. Repeated upload passages count only once. The supplied source notes identify mixed-speaker event boundaries requiring exact ownership.

## Source fidelity

Preserve exact caption text and timestamps. Never silently correct names, technical terms, negations, numbers or citations, or convert recognition uncertainty into a speaker’s flaw. Check complete context around speaker boundaries. Mark materially uncertain attribution below high with a specific audio-verification reason; do not force high confidence to avoid a check. Mixed-speaker spans must identify which words support the selected speaker’s claim; an opponent’s quoted words must not become that speaker’s commitment. No move-specific audio verification has yet occurred.

## Routes and sections

Exactly two routes {side,speaker,bridges}. Each bridges array contains 3–7 unique objects {bridgeId,tier,description}, exactly one motion tier and at least one central and one subsidiary tier. IDs are globally unique. Describe burdens or inferential links, not achievements.

Use 4–7 coherent topical sections {sectionId,title,weightPercent,rationale}. Unique descriptive lowercase slug IDs; no generic s1/s2. Positive integer weights total 100 and reflect motion-level importance before judgment. Every section must include genuine selected moves from each side. Three moves per side per section are ordinary; four is the maximum. A fourth requires a specific rationale for distinct, independently assessable, nonmergeable moves belonging together. Do not force symmetry or drop load-bearing evidence to make the display fit.

## Moves

Select 8–48 load-bearing moves in chronological order. Each move has:
- moveId: unique descriptive lowercase slug, not m1/m2.
- side, speaker, sectionId: exact authorized identity and section.
- moveKind: constructive or reply.
- claim, warrant, inference: separate source-faithful descriptions without scoring language.
- startEvent,endEvent: inclusive canonical indices for the smallest complete contiguous supporting passage.
- sourceSpanSelectionRationale: source-specific boundary reason; evidence above 2200 characters needs a compelling complete-argument rationale.
- quoteEligibleExactSpans: one or two exact excerpt substrings, 3–18 words, preferably 6–14, without corrupted terms or another speaker’s words.
- attributionConfidence: high, medium or low; attributionRationale; audioVerificationReason.
- importance: integer 1–3; importanceRationale from burden importance, not quality.
- burdenContact: {bridgeId,tier,rationale}, matching this side’s bridge.
- respondsToIds: earlier selected move IDs, or [] for constructive moves.
- responseComponents: replies need {targetMoveId,description} objects naming actual targets; constructive moves use [].

Retain the load-bearing target of any selected reply. Repetition is not a new accomplishment, but new distinctions, answers and qualifications matter. Questions remain challenges rather than unargued contrary theories. Context access does not justify copying whole speeches.

## Audits

coverageAudit accounts for every major line, selected move IDs, and source-specific omissions for repetition, logistics and lesser material, separately including closings and audience-question answers. Derive organization from this recording.

speakerAttributionReview records discussion handoffs and audience-question boundaries, mixed spans and residual uncertainties. High confidence needs source-specific support.

selectionBalanceAudit: {thresholds:{totalAbsoluteDifference:3,sectionAbsoluteDifference:2},totals:{pro:N,con:N,absoluteDifference:N},sections:[{sectionId,pro:N,con:N,absoluteDifference:N}],rationaleRequired:boolean,rationale:string}. Section records follow section order. Rationale is mandatory if total difference is at least 3 or any section difference at least 2; explain why each asymmetric selection is load-bearing.

publicationCapacityAudit: {maximumSelectedMovesPerSidePerSection:4,sections:[{sectionId,pro:N,con:N,withinCapacity:boolean,fourthRowRequired:boolean,fourthRowAuthorized:boolean,rationale:string}],allSectionsWithinCapacity:boolean,allFourthRowsPreauthorized:boolean}. fourthRowRequired means either side has four; fourthRowAuthorized is true for ordinary rows or justified fourth rows. The controller independently recomputes counts and flags before acceptance.

## One submission

Confirm the absolute destination in the execution plan. Read every allowed input completely using the maintained reader in bounded untruncated chunks. Send a complete-reading checkpoint and wait for controller authentication before authoring. Prepare one candidate in memory, run the pinned checker through stdin, then use the maintained handoff hold command with the exact JSON bytes through stdin. The controller reads and reviews the complete held candidate, and alone releases its first save. Never save a draft file, self-authorize, or edit after submission. One context, one attempt, zero automatic retries, no paid calls, no sub-agents. Ordinary unsaved corrections stay within this context and attempt.
