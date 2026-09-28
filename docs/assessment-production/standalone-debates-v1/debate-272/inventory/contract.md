# Score-blind inventory contract

Produce one JSON object with motion, routes, sections, moves, coverageAudit, speakerAttributionReview, selectionBalanceAudit, and publicationCapacityAudit. Generate no ratings, totals, winner, critiques, tags or AI Contribution. The controller mechanically adds identity and exact source excerpts; all semantic selection, burden mapping and importance decisions are yours.

Read every packet allowedInput completely, in manageable untruncated chunks. The indexed transcript contains the entire supplied recording. Canonical event indices are zero-based. Only listed files may be read; no other debates, prior assessments, judgments, publication, session logs, credentials or outside sources. Events JSON is permitted only for exact lookups. Source notes restrict transcription-based inferences.

Jonathan McLatchie is pro (Theism) and Tom Jump is con (Atheist criticism) on the exact motion “Does God exist?”. Preserve the distinction between the general motion, McLatchie’s morally perfect theistic hypothesis, and Jump’s additional objections to the Christian God. Criticism of support does not adopt a burden to prove all naturalism. Do not automatically treat Jump’s hypothetical pantheism as his positive belief; map what he actually adopts. Do not judge either side yet.

Cover the complete substantive exchange including both opening statements, first and second rebuttals, cross-examinations, closings and substantive Q&A answers. Moderator logistics and audience statements are not scored unless adopted or answered by a primary speaker; question context remains available. If full reading reveals independent host advocacy, source incompleteness or unresolved eligibility, stop and report it.

## Source fidelity

Preserve exact caption text and timestamps. Do not silently correct names, technical terms, negations or numbers, and never convert recognition uncertainty into a speaker’s flaw. The numerical posterior in the opening has not been independently verified; do not infer an arithmetic mistake from it. This does not prevent evaluation of clearly expressed assumptions later. Check complete context around speaker boundaries. Mark materially uncertain attribution below high with a specific audio-verification reason; do not force high confidence to avoid a check. Mixed-speaker spans must identify which words support the selected speaker’s claim; no quotations of an opponent may be assigned to that speaker.

## Routes and sections

Exactly two routes {side,speaker,bridges}. Each bridges array has 3–7 unique objects {bridgeId,tier,description}, exactly one motion tier, at least one central and one subsidiary tier. IDs are globally unique. Describe burdens or inferential links, not achievements.

Use 4–7 coherent topical sections {sectionId,title,weightPercent,rationale}. Unique descriptive lowercase slug IDs; no generic s1/s2. Positive integer weights sum to 100 and reflect motion-level importance before judgment. Every section must include genuine selected moves from each side. Three moves per side per section are ordinary; four is the maximum. Any fourth requires specific justification for four distinct, independently assessable, nonmergeable moves belonging together. Do not force symmetry or remove load-bearing evidence to make the display fit.

## Moves

Select 8–48 load-bearing moves in chronological order. Each move has:
- moveId: unique descriptive lowercase slug, not m1/m2.
- side, speaker, sectionId: exact packet identity and section.
- moveKind: constructive or reply.
- claim, warrant, inference: separate source-faithful descriptions without scoring language.
- startEvent,endEvent: inclusive canonical indices for the smallest complete contiguous supporting passage.
- sourceSpanSelectionRationale: specific reason for these boundaries. Evidence above 2200 characters needs a compelling complete-argument reason.
- quoteEligibleExactSpans: one or two exact excerpt substrings, 3–18 words, preferably 6–14; no corrupted terms or other speaker’s words.
- attributionConfidence: high, medium or low; attributionRationale; audioVerificationReason.
- importance: integer 1–3; importanceRationale based on motion burden, not quality.
- burdenContact: {bridgeId,tier,rationale}, matching this side’s bridge.
- respondsToIds: earlier selected move IDs, or [] for constructive moves.
- responseComponents: replies need {targetMoveId,description} objects naming the actual target; constructive moves use [].

Retain the load-bearing target of any selected reply. Repetition is not a new accomplishment, but new answers, distinctions and qualifications matter. Questions remain challenges rather than unargued contrary theories. Avoid overbroad source spans; context access is not permission to copy whole speeches.

## Audits

coverageAudit records every major line, selected move IDs and source-specific omissions for repetition, logistics and lesser material. It must separately account for the audience answers and closing material. Derive topical organization from this source.

speakerAttributionReview records named formal rounds, cross-examination/Q&A boundaries, any mixed spans and residual uncertainties. High confidence needs source-specific support.

selectionBalanceAudit: {thresholds:{totalAbsoluteDifference:3,sectionAbsoluteDifference:2},totals:{pro:N,con:N,absoluteDifference:N},sections:[{sectionId,pro:N,con:N,absoluteDifference:N}],rationaleRequired:boolean,rationale:string}. Section records follow section order. Rationale is mandatory if total difference is at least 3 or any section difference is at least 2; identify why the asymmetric moves are load-bearing.

publicationCapacityAudit: {maximumSelectedMovesPerSidePerSection:4,sections:[{sectionId,pro:N,con:N,withinCapacity:boolean,fourthRowRequired:boolean,fourthRowAuthorized:boolean,rationale:string}],allSectionsWithinCapacity:boolean,allFourthRowsPreauthorized:boolean}. fourthRowRequired means either side has four. fourthRowAuthorized is true for ordinary rows or justified fourth rows. The controller independently recomputes all counts and flags before accepting.

## One submission

Confirm the absolute destination. First read all required inputs completely, send a complete-reading checkpoint, and wait for controller authentication/release. Within the same context and attempt, prepare and check the candidate without saving it: feed JSON through standard input to the allowed checker, then send the complete unsaved JSON to the controller for review. Ordinary corrections before the first save remain within this context. After both checks pass and the controller releases the save, write the one allowed output once with apply_patch. Do not update submitted bytes or spawn agents. One attempt, zero retries, no paid calls.
