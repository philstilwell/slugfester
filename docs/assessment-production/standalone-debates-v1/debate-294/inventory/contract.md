# Score-blind inventory contract

Produce one JSON object with motion, routes, sections, moves, coverageAudit, speakerAttributionReview, selectionBalanceAudit, publicationCapacityAudit, and primarySpeakerScopeAudit. No ratings, totals, winner, critiques, tags or AI contribution. The controller adds frozen identity and exact source excerpts mechanically; semantic selection, burdens, importance and coherent sections are yours.

Read every allowed input fully through the maintained reader in untruncated chunks. Human E labels are ONE-BASED; startEvent/endEvent are ZERO-BASED (E0001 = 0). No other debates, prior assessments, peer judgments, publication, session logs, credentials or outside sources. Pinned checker tools may run without reading their implementation.

## Identity and source

Motion: Is the Canaanite conquest morally defensible as an act commanded by a loving God?
Pro: Paul Copan. Con: Randal Rauser. Copy the frozen primarySpeakerScopeAudit exactly from source-lock. Follow every source restriction and exclusion. Read the whole recording, but select only eligible primary-speaker arguments; no host words, dependent replies, excluded content, or absence inference. Preserve the distinct shared Christian commitments, hyperbole concessions, historical uncertainties, moral criticisms, and limited illustrative analogies.

Selected material caption uncertainty requires below-high attributionConfidence and precise audioVerificationReason even when the speaker is clear. This includes garbled atemporal, Marcionite, Christocentric hermeneutic, herem, biblical references, names and short mixed interjections if essential to a selected move. Do not silently repair exact quotations or penalize recognition errors. At least one exact complete 3–18 word featured-quote candidate per side is required; retain qualifications and do not invent completions. No audio verification has yet occurred.

## Routes and sections

Exactly two routes {side,speaker,bridges}. Each bridges array contains 3–7 unique objects {bridgeId,tier,description}: exactly one motion tier, at least one central and one subsidiary. IDs globally unique. Describe burdens/inference links, not achievements, and keep each bridge owned by its side. A critic is not required to prove the contrary unless actually adopted.

Use 4–7 coherent topical sections {sectionId,title,weightPercent,rationale}. Unique descriptive lowercase-slug section IDs, never s1/s2. Positive integer weights total 100 and reflect motion-level importance before judgment. Each section includes genuine selected moves from each side. Three per side is ordinary, four maximum. A fourth needs a source-specific distinct/nonmergeable/independently-assessable rationale. Preserve chronological reply meaning when sectioning. Do not manufacture symmetry or omit a load-bearing argument to fit the display.

## Moves

Select 8–48 load-bearing moves in chronological order. Every object has:
- moveId: unique descriptive lowercase slug, never m1/m2.
- side, speaker, sectionId: exact authorized identities.
- moveKind: constructive or reply.
- claim, warrant, inference: separate source-faithful descriptions, no ratings.
- startEvent,endEvent: inclusive ZERO-BASED source indices for the smallest complete contiguous supporting passage.
- sourceSpanSelectionRationale: source-specific boundary rationale. Excerpts over 2200 characters require a compelling complete-argument explanation of at least 100 characters.
- quoteEligibleExactSpans: zero to two exact complete 3–18 word source substrings; [] if no suitable complete quote fits. At least one suitable candidate per side.
- attributionConfidence: high/medium/low; attributionRationale; audioVerificationReason.
- importance: integer 1–3; importanceRationale based on burden, not quality.
- burdenContact: {bridgeId,tier,rationale} owned by this side.
- respondsToIds: earlier selected IDs or [] for constructive moves.
- responseComponents: replies require {targetMoveId,description} for actual targets; constructive moves use [].

Retain load-bearing targets of selected replies. Repetition alone is not a new move, but substantive distinctions and new answers matter. Context access is no reason to copy broad transcript neighborhoods. Choose the count and sections from this recording. Do not treat illustrative testimony as independently verified external fact.

## Audits

coverageAudit accounts for all major retained lines with selected move IDs and source-specific omissions for repetition, logistics or lesser material. Account for the frozen host-led chains, advertisements, introductions and outro as exclusions, never scored evidence. Preserve concessions, objections and qualifications.

speakerAttributionReview records actual handoffs, explicit addressees, first-person continuity, mixed spans, and unresolved uncertainties. Do not claim audio verification.

selectionBalanceAudit: {thresholds:{totalAbsoluteDifference:3,sectionAbsoluteDifference:2},totals:{pro:N,con:N,absoluteDifference:N},sections:[{sectionId,pro:N,con:N,absoluteDifference:N}],rationaleRequired:boolean,rationale:string}. Records follow section order. Rationale required when total difference >=3 or any section difference >=2; identify load-bearing asymmetric selections.

publicationCapacityAudit: {maximumSelectedMovesPerSidePerSection:4,sections:[{sectionId,pro:N,con:N,withinCapacity:boolean,fourthRowRequired:boolean,fourthRowAuthorized:boolean,rationale:string}],allSectionsWithinCapacity:boolean,allFourthRowsPreauthorized:boolean}. fourthRowRequired means either side has four. fourthRowAuthorized true for ordinary rows or specifically justified fourth rows. Controller independently recomputes counts and flags.

## One submission

Confirm the execution plan's absolute destination before authoring. Read the full maintained packet with bounded untruncated reads, send a complete-reading checkpoint and wait for controller authentication before authoring. Prepare the candidate in memory; run the pinned checker through stdin, then send exact JSON bytes through stdin to handoff hold. No draft file. Controller inspects all held prose and alone releases the exact first save. Never self-approve, edit a submission, create subagents, use paid calls, inspect peer outputs or open session logs. One fresh context, one attempt, zero automatic retries. Unsaved corrections remain within this context and attempt.
