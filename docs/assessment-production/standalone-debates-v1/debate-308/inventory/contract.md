# Score-blind inventory contract

Produce one JSON object with exactly motion, routes, sections, moves, coverageAudit, speakerAttributionReview, selectionBalanceAudit, publicationCapacityAudit, moderatorContextAudit. No ratings, totals, winner, critiques, tags or AI contribution. The controller mechanically adds identity and exact source excerpts.

Read the execution plan and complete maintained reader through bounded untruncated calls, including every canonical source event, source restriction and shared block. Transcript event indices are ZERO-BASED. The reader adds separate ONE-BASED line labels. startEvent/endEvent use canonical zero-based indices. Never inspect other debates, assessments, peer outputs, credentials, session logs or external sources. Checker implementation is pinned executable input, not mandatory reading.

## Identity and scope

Motion: Is religious disagreement evidence against God’s existence?
Pro: Justin Schieber. Con: Randal Rauser. Host: Justin Brierley.

Obey every source-lock and assessment-source-notes restriction. The explicitly approved two-speaker scope retains the guests' own discussion and concluding replies, approximately 12:41–1:00:59, excluding programme breaks. Host arguments remain unscored context. Do not credit a host premise to a guest, invent a guest reply target for a host prompt, or infer concession from lack of an opportunity to answer. Complete transcript availability permits coverage audit, not scoring excluded material.

Schieber presents a defeasible evidential argument, not deductive contradiction, and denies assuming that God delivers conflicting revelations or that exclusivism is true. Rauser disputes the inference while offering reasons to permit disagreement, without taking a separate burden to prove God. Preserve distinctions among trivial/fundamental disagreement, possibility/comparative explanation, generic belief/detailed independent doctrinal convergence, propositional/acquaintance knowledge and minimal/richer relationships. Preserve both closing replies and concessions. Do not score recognition errors as philosophical mistakes.

## Routes and sections

Exactly two routes {side,speaker,bridges}, each with 3–7 unique {bridgeId,tier,description}: exactly one motion tier, at least one central and one subsidiary. Bridge IDs globally unique and side-owned. Describe burdens and observable success criteria, not achievements.

Use 4–7 coherent topical sections {sectionId,title,weightPercent,rationale}. Unique descriptive lowercase-slug IDs, never s1/s2. Positive integer weights total 100, reflecting motion importance before judgment. Each section has genuine moves from both sides. Three selected moves per side is ordinary, four maximum. Each fourth needs a source-specific distinct/nonmergeable/independently-assessable rationale. Keep coherent paired exchanges together and preserve chronology and reply meaning; do not manufacture symmetry or omit a material distinction for display.

## Moves

Select 8–48 load-bearing moves in chronological order. Each has:
- moveId: unique descriptive lowercase slug, never m1/m2.
- side, speaker, sectionId: exact identities.
- moveKind: constructive or reply.
- claim, warrant, inference: separate faithful descriptions without ratings.
- startEvent,endEvent: inclusive ZERO-BASED event indices, smallest complete contiguous passage supplying claim and reason.
- sourceSpanSelectionRationale: specific boundaries, at least 40 characters. Over 2200 source characters needs a compelling complete-argument rationale of at least 100 characters.
- quoteEligibleExactSpans: zero to two exact complete 3–18 word source substrings, [] when unsuitable. At least one complete-thought candidate per side. Clear referents, necessary qualifications; never silently fix caption words.
- attributionConfidence: high/medium/low; attributionRationale; audioVerificationReason. Do not blanket-certify uncertain ownership. Below-high requires verification later.
- importance: integer 1–3 and importanceRationale based on burden, not quality.
- burdenContact: {bridgeId,tier,rationale}, side-owned.
- respondsToIds: earlier selected IDs, or [] for constructive moves.
- responseComponents: replies require {targetMoveId,description} for every selected target; constructive moves use [].

Retain load-bearing selected reply targets. Repetition alone is not another move; new distinctions and substantive later answers matter. Review all concluding replies, without creating scored rows for simple recapitulation. Mixed spans must identify the scored voice and exclude other-speaker words from claims and quotations. Moderator prompts cannot become fictitious earlier primary-speaker moves. A primary answer to host context may be constructive unless it also answers an earlier selected opponent move. Preserve source restrictions on the two Justins and all mixed caption handoffs. No paid audio check has occurred.

## Audits

coverageAudit accounts for every major retained line with selected IDs or source-specific reasons for omission (repetition, logistics, peripheral material). Account for excluded intervals without scoring them. Include Rauser's final distinction between greater agreement supporting God and current disagreement supporting atheism, Schieber's specific-doctrine response, and the late cumulative-force qualification.

speakerAttributionReview explains actual handoffs, first-person continuity, named addressees and mixed spans. No claim of audio verification or direct listening. Material selected uncertainty must remain below high.

selectionBalanceAudit: {thresholds:{totalAbsoluteDifference:3,sectionAbsoluteDifference:2},totals:{pro:N,con:N,absoluteDifference:N},sections:[{sectionId,pro:N,con:N,absoluteDifference:N}],rationaleRequired:boolean,rationale:string}. Sections in locked order. Rationale required when total difference >=3 or any section difference >=2; explain why asymmetric moves are load-bearing.

publicationCapacityAudit: {maximumSelectedMovesPerSidePerSection:4,sections:[{sectionId,pro:N,con:N,withinCapacity:boolean,fourthRowRequired:boolean,fourthRowAuthorized:boolean,rationale:string}],allSectionsWithinCapacity:boolean,allFourthRowsPreauthorized:boolean}. fourthRowRequired means either side has four. fourthRowAuthorized true for ordinary rows or justified fourth rows. Controller independently recomputes every count.

moderatorContextAudit: {protocolId:"editor-approved-moderator-context-v1",contextOnlyParticipants:["Justin Brierley"],primaryRepliesRemainEligible:true,noModeratorMoveSelected:true,allSelectedEvidenceOwnedByAssignedPrimarySpeaker:true,questioningAsymmetryTreatment:string,moves:[...]}. questioningAsymmetryTreatment has at least 80 source-specific characters. Audit moves exactly match selected move order and IDs. Each is {moveId,hostArgumentNotCredited:true,scoredClaimOwnership:string,moderatorPrompt:null|{startEvent,endEvent,summary}}. Ownership >=60 characters and specific to that move's actual voice; no boilerplate replacing review. Prompt indices must precede the selected move's startEvent and summary >=40 characters. Use null if no substantive host prompt applies; a mixed initial prompt inside the selected source window is described in ownership instead. Never fabricate a separate prior interval.

## One submission

Confirm the plan's absolute destination. Read the complete packet, report a complete-reading checkpoint and WAIT for controller authentication before authoring. Then prepare the candidate in memory, check through stdin and send exact bytes to handoff hold. No candidate draft file. Controller alone reviews and releases its first save. Never self-approve, revise a saved output, spawn agents, make paid calls or inspect session logs. One fresh context, one attempt, zero automatic retries. Unsaved corrections remain within that same context and attempt.
