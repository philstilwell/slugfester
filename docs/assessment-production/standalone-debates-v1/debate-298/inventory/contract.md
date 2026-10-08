# Score-blind inventory contract

Produce one JSON object with exactly motion, routes, sections, moves, coverageAudit, speakerAttributionReview, selectionBalanceAudit, publicationCapacityAudit. No ratings, totals, winner, critiques, tags or AI contribution. Controller adds locked identity and exact source excerpts mechanically; semantic selection, burdens, importance and coherent sections are yours.

Read every allowed input fully using the maintained reader in bounded untruncated chunks. E labels are ONE-BASED; startEvent/endEvent are ZERO-BASED (E0001 = 0). No other debates, prior assessments, peer judgments, publication, session logs, credentials or outside sources. Pinned checker tools may run without reading their implementation.

## Identity and source

Motion: Does God exist?
Pro: Trent Horn. Con: Raphael Lataster.

Read and preserve every frozen source restriction. Assess the two openings, both rebuttal rounds, direct cross-examination and both closings only. Exclude audience Q&A, moderator logistics and enumerated non-debate intervals. Preserve Horn’s classical-theist attributes and his separate inference routes; Lataster’s agnostic burden, conditional grants and distinctions among rival God concepts; and the difference between probabilistic evidence and logical disproof. Closing references to Q&A do not import excluded answers.

Auxiliary source-audio text is context, not replacement exact captions. Uncertain mixed turns, corrupted names, technical terms and uncertain numbers require below-high confidence and a precise verification reason. Preserve Lataster’s later qualification of the limb example and distinction between eternalist theories and B theory alone. At least one exact complete 3–18 word featured-quote candidate per side must express a complete thought with clear referents and necessary qualification.

## Routes and sections

Exactly two routes {side,speaker,bridges}. Each bridges array contains 3–7 unique objects {bridgeId,tier,description}: exactly one motion tier, at least one central and one subsidiary. IDs globally unique. Describe burdens/inference links, not achievements. Each bridge belongs to its side. A critic need not prove the contrary unless adopted.

Use 4–7 coherent topical sections {sectionId,title,weightPercent,rationale}. Unique descriptive lowercase-slug IDs, never s1/s2. Positive integer weights total 100 and reflect motion-level importance before judgment. Each section includes genuine selected moves from each side. Three per side is ordinary, four maximum. A fourth needs source-specific distinct/nonmergeable/independently-assessable justification. Preserve chronology and reply meaning. Do not manufacture symmetry or omit load-bearing arguments for display.

## Moves

Select 8–48 load-bearing moves in chronological order. Every object has:
- moveId: unique descriptive lowercase slug, never m1/m2.
- side, speaker, sectionId: exact authorized identities.
- moveKind: constructive or reply.
- claim, warrant, inference: separate faithful source descriptions, no ratings.
- startEvent,endEvent: inclusive ZERO-BASED indices for the smallest complete contiguous supporting passage.
- sourceSpanSelectionRationale: source-specific boundaries, at least 40 characters. Over 2200 source characters requires a compelling complete-argument rationale of at least 100 characters.
- quoteEligibleExactSpans: zero to two exact complete 3–18 word source substrings; [] if no suitable quote. At least one suitable candidate per side across the inventory.
- attributionConfidence: high/medium/low; attributionRationale; audioVerificationReason.
- importance: integer 1–3; importanceRationale based on burden, not quality.
- burdenContact: {bridgeId,tier,rationale} owned by this side.
- respondsToIds: earlier selected IDs or [] for constructive moves.
- responseComponents: replies require {targetMoveId,description} for each actual target; constructive moves use [].

Retain load-bearing targets of selected replies. Repetition is not a new move; substantive distinctions and new answers matter. Context access is not reason to copy broad transcript neighborhoods. Choose counts and sections from this source. Do not treat anecdotes or speaker-reported historical claims as independently verified facts.

## Audits

coverageAudit accounts for all major retained lines with selected IDs and source-specific omissions for repetition, logistics or lesser material. Account for all excluded intervals and omitted Q&A without scoring them. The retained moderator handles logistics; no third-side motion argument is selected. Preserve concessions and qualifications.

speakerAttributionReview records actual handoffs, explicit addressees, first-person continuity, mixed spans and uncertainties. Do not claim audio verification. Record confidence honestly even if that requires later paid verification.

selectionBalanceAudit: {thresholds:{totalAbsoluteDifference:3,sectionAbsoluteDifference:2},totals:{pro:N,con:N,absoluteDifference:N},sections:[{sectionId,pro:N,con:N,absoluteDifference:N}],rationaleRequired:boolean,rationale:string}. Records follow section order. Rationale required when total difference >=3 or any section difference >=2; identify load-bearing asymmetric selections.

publicationCapacityAudit: {maximumSelectedMovesPerSidePerSection:4,sections:[{sectionId,pro:N,con:N,withinCapacity:boolean,fourthRowRequired:boolean,fourthRowAuthorized:boolean,rationale:string}],allSectionsWithinCapacity:boolean,allFourthRowsPreauthorized:boolean}. fourthRowRequired means either side has four. fourthRowAuthorized is true for ordinary rows or justified fourth rows. Controller independently recomputes all counts and flags.

## One submission

Confirm the execution plan's absolute destination before authoring. Read the full maintained packet through bounded untruncated reads; send a complete-reading checkpoint and wait for controller authentication before authoring. Prepare the candidate in memory, run the pinned checker through stdin, then send exact JSON bytes through stdin to handoff hold. No draft file. Controller inspects all held prose and alone releases the exact first save. Never self-approve, edit a submission, create subagents, use paid calls, inspect peer outputs or open session logs. One fresh context, one attempt, zero automatic retries. Unsaved corrections remain within this context and attempt.
