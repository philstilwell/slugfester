# Score-blind inventory contract

Produce one JSON object with exactly motion, routes, sections, moves, coverageAudit, speakerAttributionReview, selectionBalanceAudit, publicationCapacityAudit, moderatorContextAudit. No ratings, totals, winner, critiques, tags or AI contribution. Controller adds locked identity, scope and exact source excerpts mechanically.

Read the complete maintained reader through bounded untruncated calls, including every source event and every restriction. E labels are ONE-BASED; startEvent/endEvent are ZERO-BASED. Do not open other debates, assessments, peer outputs, credentials, session logs or outside sources. Pinned checker source is a tool input, not required reading.

## Identity and source

Motion: Does Christianity adequately explain suffering?
Pro: Richard Swinburne. Con: Bart Ehrman.

Read and obey assessment-source-notes.md and source-lock.json. This recording has explicit editorial approval to assess only Ehrman and Swinburne in their main exchange and both final summaries. Justin Brierley is unscored context. Their actual replies remain eligible; no host argument or host-read quotation is assigned to either side. Excluded introductions, biographies, listener letters, unrelated recorded material, programme breaks and outro supply no credit, penalty, concession or failure-to-reply inference. Do not equate the critic's rejection of adequate explanations with deductive disproof of every possible God. Preserve Swinburne's qualifications on victim benefit, the value of usefulness, and the final heaven reply, and Ehrman's concessions about human evil and the stages of Swinburne's account. Judge the opportunity to answer fairly. Full-source access supports scope and context only.

## Routes and sections

Exactly two routes {side,speaker,bridges}. Each bridges array has 3–7 unique {bridgeId,tier,description} objects: exactly one motion tier, at least one central and one subsidiary. IDs globally unique and each bridge owned by its side. Describe burdens, not achievements. A critic need not prove a contrary theory unless adopted.

Use 4–7 coherent topical sections {sectionId,title,weightPercent,rationale}. Unique descriptive lowercase-slug IDs, never s1/s2. Positive integer weights total 100 and reflect motion-level importance before judgment. Each section contains genuine selected moves from both sides. Three per side is ordinary, four maximum. A fourth requires source-specific distinct/nonmergeable/independently-assessable justification. Preserve chronology and response meaning; do not manufacture symmetry or omit load-bearing material for display.

## Moves

Select 8–48 load-bearing moves in chronological order. Each object has:
- moveId: unique descriptive lowercase slug, never m1/m2.
- side, speaker, sectionId: exact locked identities.
- moveKind: constructive or reply.
- claim, warrant, inference: separate faithful source descriptions, no ratings.
- startEvent,endEvent: inclusive ZERO-BASED indices, smallest complete contiguous supporting passage.
- sourceSpanSelectionRationale: source-specific boundaries, at least 40 characters. A span exceeding 2200 source characters requires a compelling complete-argument rationale of at least 100 characters.
- quoteEligibleExactSpans: zero to two exact complete 3–18 word source substrings; [] if unsuitable. At least one suitable complete-thought candidate per side across the inventory. Never select a truncated concession, qualification, referent or conclusion. No recognition-corrupted quotation.
- attributionConfidence: high/medium/low; attributionRationale; audioVerificationReason.
- importance: integer 1–3; importanceRationale based on burden, not quality.
- burdenContact: {bridgeId,tier,rationale} owned by this side.
- respondsToIds: earlier selected IDs or [] for constructive moves.
- responseComponents: replies require {targetMoveId,description} for each actual target; constructive moves use [].

Retain load-bearing targets of selected replies. A response to an unscored host prompt may be constructive within the participant inventory if no earlier selected opponent move is its target. Do not fabricate a host move or reply link. Repetition is not a new move; substantive distinctions and new answers matter. Keep source spans narrow. Mixed turns may remain in a necessary contiguous source span only if the participant's exact scored words are unambiguous and the ownership audit excludes the interjected words. Quotes must be wholly the assigned participant's words. Speakers' factual/statistical/textual claims are claims made in the debate, not independently verified facts.

## Audits

coverageAudit accounts for all major retained lines with selected IDs and source-specific reasons for omitted repetition, logistics or lesser material. Account for all excluded intervals without scoring them. Preserve concessions and qualifications. Both final summaries must be reviewed.

speakerAttributionReview records actual handoffs, explicit addressees, first-person continuity, mixed spans and uncertainty. Only source-notes-listed supplementary automated checks have occurred; never claim direct listening or verification of other passages. Record confidence honestly even if later verification is required.

selectionBalanceAudit: {thresholds:{totalAbsoluteDifference:3,sectionAbsoluteDifference:2},totals:{pro:N,con:N,absoluteDifference:N},sections:[{sectionId,pro:N,con:N,absoluteDifference:N}],rationaleRequired:boolean,rationale:string}. Sections in locked order. Rationale required when total difference >=3 or any section difference >=2; identify load-bearing asymmetric selections.

publicationCapacityAudit: {maximumSelectedMovesPerSidePerSection:4,sections:[{sectionId,pro:N,con:N,withinCapacity:boolean,fourthRowRequired:boolean,fourthRowAuthorized:boolean,rationale:string}],allSectionsWithinCapacity:boolean,allFourthRowsPreauthorized:boolean}. fourthRowRequired means either side has four; fourthRowAuthorized true for ordinary rows or justified fourth rows. Controller independently recomputes counts and flags.

moderatorContextAudit: {protocolId:"editor-approved-moderator-context-v1",contextOnlyParticipants:["Justin Brierley"],primaryRepliesRemainEligible:true,noModeratorMoveSelected:true,allSelectedEvidenceOwnedByAssignedPrimarySpeaker:true,questioningAsymmetryTreatment:string,moves:[{moveId,hostArgumentNotCredited:true,scoredClaimOwnership:string,moderatorPrompt:null|{startEvent,endEvent,summary}}]}. Audit moves exactly in inventory order. questioningAsymmetryTreatment at least 80 characters, ownership at least 60 characters, and prompt summary at least 40. Prompt event bounds zero-based and strictly before the selected move; use null when no relevant host prompt. Discuss how unequal prompting and lack of later reply opportunities are treated without automatic credit or penalties.

## One submission

Confirm the plan's absolute output destination. Read the complete packet; send a complete-reading checkpoint and WAIT for controller authentication before authoring. Prepare the candidate in memory, run the pinned checker through stdin, then send exact JSON bytes through stdin to handoff hold. No draft file. Controller inspects all held prose and alone releases the exact first save. Never self-approve, edit a submission, create subagents, make paid calls, inspect peers or open session logs. One fresh context, one attempt, zero automatic retries. Unsaved corrections remain within this context and attempt.
