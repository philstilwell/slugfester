# Score-blind inventory contract

Produce one JSON object with exactly motion, routes, sections, moves, coverageAudit, speakerAttributionReview, selectionBalanceAudit, publicationCapacityAudit, moderatorContextAudit. No ratings, totals, winner, critiques, tags or AI contribution. Controller adds locked identity, scope and exact source excerpts mechanically.

Read the complete maintained reader through bounded untruncated calls, including every source event and every restriction. E labels are ONE-BASED; startEvent/endEvent are ZERO-BASED. Do not open other debates, assessments, peer outputs, credentials, session logs or outside sources. Pinned checker source is a tool input, not required reading.

## Identity and source

Motion: Is intelligent design a legitimate scientific explanation for biological origins?
Pro: Stephen Meyer. Con: Peter Atkins.

Obey the complete assessment-source-notes.md and source-lock.json. The editor explicitly authorized scoring only Meyer and Atkins. Mark Haville is a recurring third advocate, not a member of Meyer’s scored side; host Justin Brierley is also unscored context. Both primary speakers’ own replies remain eligible, but no Haville or host argument, quotation, assertion or rhetorical remark is credited to them. Their words may appear only as necessary unscored context in a continuous source span, with exact ownership audited. Film excerpts, introductions, promotions and later listener feedback are excluded with no credit, penalty or missing-reply inference. Read and review both primary closing remarks.

Meyer’s burden concerns a positive design inference and scientific legitimacy, including origin-of-life information and research productivity. Atkins challenges design’s evidential and methodological credentials. A critical response does not require a complete alternative account unless Atkins adopts that positive claim. Distinguish chemical origins, ongoing biological evolution, mere order and functional information. Preserve Meyer’s concessions that evolutionary biology is empirical, that mutation can produce modest amounts of information after life exists, and that he would accept a demonstrated origin-of-life account. Do not attribute Haville’s stronger impossibility assertions to him. Preserve Atkins’s concession that design advocates ask legitimate scientific questions and that current explanations are incomplete. Distinguish scientists’ historical religious motivations from evidence for the biological design inference. Do not import external science or film claims as independently established facts.

Featured quotes must be complete standalone thoughts, not a fragment. Potential exact candidates to consider, without requiring their selection: Meyer says “information comes from an intelligent Source”; Atkins says “there is no need to invoke design in order to account for what we observe”. Confirm exact source ownership and immediate context before marking any quote eligible. Score-blind section selection should cover material moves and both sides, not achieve equal counts artificially.

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

moderatorContextAudit: {protocolId:"editor-approved-moderator-context-v1",contextOnlyParticipants:["Mark Haville","Justin Brierley"],primaryRepliesRemainEligible:true,noModeratorMoveSelected:true,allSelectedEvidenceOwnedByAssignedPrimarySpeaker:true,questioningAsymmetryTreatment:string,moves:[{moveId,hostArgumentNotCredited:true,scoredClaimOwnership:string,moderatorPrompt:null|{startEvent,endEvent,summary}}]}. Audit moves exactly in inventory order. questioningAsymmetryTreatment at least 80 characters, ownership at least 60 characters, and prompt summary at least 40. Prompt event bounds zero-based and strictly before the selected move; use null when no relevant host prompt. Discuss how unequal prompting and lack of later reply opportunities are treated without automatic credit or penalties.

## One submission

Confirm the plan's absolute output destination. Read the complete packet; send a complete-reading checkpoint and WAIT for controller authentication before authoring. Prepare the candidate in memory, run the pinned checker through stdin, then send exact JSON bytes through stdin to handoff hold. No draft file. Controller inspects all held prose and alone releases the exact first save. Never self-approve, edit a submission, create subagents, make paid calls, inspect peers or open session logs. One fresh context, one attempt, zero automatic retries. Unsaved corrections remain within this context and attempt.
