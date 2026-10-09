# Score-blind inventory contract

Produce one JSON object with exactly motion, routes, sections, moves, coverageAudit, speakerAttributionReview, selectionBalanceAudit, publicationCapacityAudit. No ratings, totals, winner, critiques, tags or AI contribution. The controller adds identity and exact source excerpts mechanically.

Read the plan and complete maintained reader through bounded untruncated calls, including every source event, restriction and shared block. Canonical indexed transcript indices before timestamps are ZERO-BASED. The maintained reader adds its own ONE-BASED line labels. startEvent/endEvent use the canonical ZERO-BASED indices. Never inspect other debates, assessments, peer outputs, credentials, session logs or external sources. Checker implementation is executable tool input, not mandatory reading.

## Identity and scope

Motion: Does the Bible misquote Jesus?
Pro: Bart Ehrman. Con: James White.

Obey every source-lock.json and assessment-source-notes.md restriction. Assess only the formal openings, rebuttals, both cross-examinations and both closings, events 9–3757, with the initial carryover copyright word excluded. The audience material beginning at event 3758 is context for exclusions only. No credit, penalty, concession or missing-reply inference may depend on it. No substantive third-party advocacy exception is used.

Preserve each adopted burden: Ehrman argues important wording changed and exact recovery is sometimes uncertain; White defends collective preservation/recoverability and continuity of the message, not perfect individual copies. Preserve distinctions between textual changes, interpretive significance and wholesale change of message; printed-edition/all-word versus manuscript/variant-unit comparisons; independent direct copies versus shared textual ancestry; possibility versus probability; a hypothetical early bottleneck versus a documented genealogy; local nuance versus an entirely different book. Both concede many points. Neither biography nor third-party misuse supplies a substitute for an argument.

## Routes and sections

Exactly two routes {side,speaker,bridges}. Each bridges array has 3–7 unique {bridgeId,tier,description} objects: exactly one motion tier, at least one central and one subsidiary. IDs globally unique and side-owned. Describe burdens and observable success criteria, not achievements.

Use 4–7 coherent topical sections {sectionId,title,weightPercent,rationale}. Unique descriptive lowercase-slug IDs; never s1/s2. Positive integer weights total 100 and reflect motion importance before judgment. Each section contains genuine moves from both sides. Three per side is ordinary, four maximum. Each fourth needs a source-specific distinct/nonmergeable/independently-assessable justification. Group coherent paired exchanges together without changing chronology or reply meaning. Do not manufacture symmetry or omit a load-bearing argument for display.

## Moves

Select 8–48 load-bearing moves in chronological order. Each object contains:
- moveId: unique descriptive lowercase slug, never m1/m2.
- side, speaker, sectionId: exact locked identities.
- moveKind: constructive or reply.
- claim, warrant, inference: separate faithful descriptions, no ratings.
- startEvent,endEvent: inclusive ZERO-BASED indices, smallest complete contiguous supporting passage.
- sourceSpanSelectionRationale: source-specific boundaries, at least 40 characters; over 2200 source characters needs a compelling complete-argument rationale of at least 100 characters.
- quoteEligibleExactSpans: zero to two exact complete 3–18 word source substrings, [] when unsuitable. At least one complete-thought candidate per side across inventory. Clear referents; do not sever necessary qualifications or silently fix caption wording.
- attributionConfidence: high/medium/low; attributionRationale; audioVerificationReason.
- importance: integer 1–3; importanceRationale based on burden, not quality.
- burdenContact: {bridgeId,tier,rationale}, side-owned.
- respondsToIds: earlier selected IDs, or [] for constructive moves.
- responseComponents: replies require {targetMoveId,description} for every selected target; constructive moves use [].

Retain load-bearing targets of selected replies. Repetition is not a new move, but later substantive answers and new distinctions matter. Both closings must be reviewed; recapitulation alone need not become an extra scored move. When a contiguous span necessarily includes both speakers, explicitly identify the scored voice and exclude opponent interjections from that move’s claim and quotes. Do not attribute a prior speaker’s caption carryover to the next speaker. Quotes must be wholly the assigned participant’s words. Recognition-corrupted words cannot justify ratings, concessions or contradictions. Five auxiliary automated wording checks exist; neither direct human listening nor speaker diarization occurred. Material selected uncertainty must be below high confidence and requires audio verification before adjudication.

## Audits

coverageAudit accounts for every major retained argument line with selected IDs or source-specific omission reasons (repetition, logistics, peripheral material). Account for excluded intervals without scoring them. Preserve qualifications in later replies and closings.

speakerAttributionReview explains actual handoffs, named addressees, first-person continuity, mixed spans and remaining uncertainty. Do not claim audio verification outside the five supplied clip intervals or use blanket high-confidence claims.

selectionBalanceAudit: {thresholds:{totalAbsoluteDifference:3,sectionAbsoluteDifference:2},totals:{pro:N,con:N,absoluteDifference:N},sections:[{sectionId,pro:N,con:N,absoluteDifference:N}],rationaleRequired:boolean,rationale:string}. Sections in locked order. Rationale required if total difference >=3 or a section difference >=2; explain why asymmetric moves are load-bearing.

publicationCapacityAudit: {maximumSelectedMovesPerSidePerSection:4,sections:[{sectionId,pro:N,con:N,withinCapacity:boolean,fourthRowRequired:boolean,fourthRowAuthorized:boolean,rationale:string}],allSectionsWithinCapacity:boolean,allFourthRowsPreauthorized:boolean}. fourthRowRequired means either side has four. fourthRowAuthorized true for ordinary rows or justified fourth rows. Controller independently recomputes all counts and flags.

## One submission

Confirm the execution plan’s absolute output destination. Read the complete packet; report complete-reading checkpoint and WAIT for controller authentication before authoring. Prepare the candidate in memory and run the pinned checker through stdin. Send exact JSON bytes through stdin to handoff hold. No candidate draft file. Controller inspects the entire candidate and alone authorizes its exact first save. Never self-approve, revise a submission, spawn agents, make paid calls, inspect peers or open session logs. One fresh context, one attempt, zero automatic retries. Unsaved corrections remain in the same authorized context and attempt.
