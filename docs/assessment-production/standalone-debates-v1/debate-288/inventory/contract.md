# Score-blind inventory contract

Produce one JSON object with motion, routes, sections, moves, coverageAudit, speakerAttributionReview, selectionBalanceAudit, and publicationCapacityAudit. Generate no ratings, totals, winner, critiques, tags or AI Contribution. The controller mechanically adds identity and exact source excerpts; semantic selection, burden mapping and importance decisions are yours.

Read every packet allowedInput completely in manageable untruncated chunks. The indexed transcript contains the complete supplied recording. Canonical event indices are zero-based. Only listed files may be read; no other debates, prior assessments, judgments, publication, session logs, credentials or outside sources. Events JSON is lookup-only. Source notes restrict transcription-based inferences.

Michael Shermer is pro (Jesus’s miracles are unbelievable) and Luuk Vandeweghe is con (Jesus’s miracles are historically credible), on the byte-identical motion “Are the miracles of Jesus unbelievable?”. Assess only the six formal speeches in frozen source notes. The introductory montage and entire informal moderated discussion including audience questions and every dependent answer are excluded. Read the full source for boundaries but assign no credit, penalty, response or absence inference to excluded material. Preserve the distinction between sincerity, eyewitness access and truth, and between ordinary historical accuracy and miracle credibility. Source restrictions prohibit rating or quote reliance on corrupted arithmetic, names, technical terms and negations. Audio was unavailable; no independent listening is claimed. Build selection and sections from this recording, not any prior counts.

Every quote eligible for featured display must express a complete thought on its own, with any meaning-changing qualification or challenge retained. At least one complete exact 3–18 word candidate per side is mandatory before freeze. Never invent completion words.

## Source fidelity

Preserve exact caption text and timestamps. Never silently correct names, technical terms, negations, numbers or citations, or convert recognition uncertainty into a speaker’s flaw. Check complete context around speaker boundaries. Mark materially uncertain attribution below high with a specific audio-verification reason; do not force high confidence to avoid a check. Mixed-speaker spans must identify which words support the selected speaker’s claim; an opponent’s quoted words must not become that speaker’s commitment. Source-preflight audio-derived checks are documented; do not claim direct listening or assume they resolve unreviewed move-specific uncertainty.

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
- quoteEligibleExactSpans: zero to two exact complete-thought excerpt substrings, 3–18 words, preferably 6–14, without corrupted terms or another speaker’s words. Use [] where no suitable complete thought fits; at least one eligible complete quote per side is mandatory.
- attributionConfidence: high, medium or low; attributionRationale; audioVerificationReason.
- importance: integer 1–3; importanceRationale from burden importance, not quality.
- burdenContact: {bridgeId,tier,rationale}, matching this side’s bridge.
- respondsToIds: earlier selected move IDs, or [] for constructive moves.
- responseComponents: replies need {targetMoveId,description} objects naming actual targets; constructive moves use [].

Retain the load-bearing target of any selected reply. Repetition is not a new accomplishment, but new distinctions, answers and qualifications matter. Questions remain challenges rather than unargued contrary theories. Context access does not justify copying whole speeches.

## Audits

coverageAudit accounts for every major line, selected move IDs, and source-specific omissions for repetition, logistics and lesser material, including both complete formal closings and the source-specific exclusion of the entire audience-question period, dependent answers, and surrounding host/debater conversations. Derive organization from this recording.

speakerAttributionReview records formal handoffs, uninterrupted speech ownership and excluded audience-question boundaries, mixed spans and residual uncertainties. High confidence needs source-specific support.

selectionBalanceAudit: {thresholds:{totalAbsoluteDifference:3,sectionAbsoluteDifference:2},totals:{pro:N,con:N,absoluteDifference:N},sections:[{sectionId,pro:N,con:N,absoluteDifference:N}],rationaleRequired:boolean,rationale:string}. Section records follow section order. Rationale is mandatory if total difference is at least 3 or any section difference at least 2; explain why each asymmetric selection is load-bearing.

publicationCapacityAudit: {maximumSelectedMovesPerSidePerSection:4,sections:[{sectionId,pro:N,con:N,withinCapacity:boolean,fourthRowRequired:boolean,fourthRowAuthorized:boolean,rationale:string}],allSectionsWithinCapacity:boolean,allFourthRowsPreauthorized:boolean}. fourthRowRequired means either side has four; fourthRowAuthorized is true for ordinary rows or justified fourth rows. The controller independently recomputes counts and flags before acceptance.

## One submission

Confirm the absolute destination in the execution plan. Read every allowed input completely using the maintained reader in bounded untruncated chunks. Send a complete-reading checkpoint and wait for controller authentication before authoring. Prepare one candidate in memory, run the pinned checker through stdin, then use the maintained handoff hold command with the exact JSON bytes through stdin. The controller reads and reviews the complete held candidate, and alone releases its first save. Never save a draft file, self-authorize, or edit after submission. One context, one attempt, zero automatic retries, no paid calls, no sub-agents. Ordinary unsaved corrections stay within this context and attempt.
