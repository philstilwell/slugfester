# Score-blind inventory contract

Produce one JSON object with exactly motion, routes, sections, moves, coverageAudit, speakerAttributionReview, selectionBalanceAudit, publicationCapacityAudit. No ratings, totals, winner, critiques, tags or AI contribution. The controller adds identity and exact source excerpts mechanically.

Read this plan and the complete maintained reader through bounded untruncated calls, including every source event, every source restriction and all shared blocks. E labels are ONE-BASED; startEvent/endEvent are ZERO-BASED. Do not open other debates, assessments, peer outputs, credentials, session logs or external sources. Pinned checker source is a tool input, not mandatory reading.

## Identity and scope

Motion: Is the physical resurrection of Jesus the best explanation for Christianity's origins?
Pro: Jonathan McLatchie. Con: Paulogia.

The title asks whether physical resurrection was required. Both speakers explicitly develop comparative explanations, but their adopted burdens differ: McLatchie defends the best explanation and rejects deductive necessity; Paulogia challenges necessity and superiority, proposes a sincere-mistake/oral-development possibility and ultimately favors a natural explanation. Preserve those distinctions in route bridges, move descriptions and reply links. Never turn McLatchie into an advocate of logical necessity or require Paulogia to prove one uniquely identified natural historical cause merely to challenge the offered inference.

Obey every assessment-source-notes.md and source-lock.json restriction. Assess only both openings, their direct debate and both final argument summaries in retained intervals. Audience Q&A, host logistics, banter, promotions and outro are excluded without credit, penalty or missing-reply inference. No substantive moderator exception is needed. Do not import the Q&A miracle case, harmonization examples or outside scholarship. Supplied chapter titles are unreliable; follow spoken handoffs and exact scope intervals.

## Routes and sections

Exactly two routes {side,speaker,bridges}. Each bridges array has 3–7 unique {bridgeId,tier,description} objects: exactly one motion tier, at least one central and one subsidiary. IDs globally unique and owned by their side. Describe burdens, not achievements.

Use 4–7 coherent topical sections {sectionId,title,weightPercent,rationale}. Unique descriptive lowercase-slug IDs; never s1/s2. Positive integer weights total 100 and reflect motion-level importance before judgment. Each section contains genuine moves from both sides. Three per side is ordinary, four maximum. Every fourth requires a source-specific distinct/nonmergeable/independently-assessable justification. Preserve chronology and response meaning; do not manufacture symmetry or omit load-bearing material for display. Group a coherent paired exchange together when setting semantic sections.

## Moves

Select 8–48 load-bearing moves in chronological order. Each object contains:
- moveId: unique descriptive lowercase slug, never m1/m2.
- side, speaker, sectionId: exact locked identities.
- moveKind: constructive or reply.
- claim, warrant, inference: separate faithful descriptions, no ratings.
- startEvent,endEvent: inclusive ZERO-BASED indices; smallest complete contiguous supporting passage.
- sourceSpanSelectionRationale: source-specific boundaries, at least 40 characters; a span over 2200 source characters needs a compelling complete-argument rationale of at least 100 characters.
- quoteEligibleExactSpans: zero to two exact complete 3–18 word source substrings, [] if unsuitable. At least one suitable complete-thought candidate per side in the inventory. Never truncate a concession, qualification, referent or conclusion. Never silently fix caption wording in a quote.
- attributionConfidence: high/medium/low; attributionRationale; audioVerificationReason.
- importance: integer 1–3; importanceRationale based on burden, not quality.
- burdenContact: {bridgeId,tier,rationale} owned by this side.
- respondsToIds: earlier selected IDs or [] for constructive moves.
- responseComponents: replies require {targetMoveId,description} for every actual selected target; constructive moves use [].

Retain load-bearing targets of selected replies. Repetition is not a new move; new distinctions and answers matter. Both closings must be reviewed, though pure recapitulation need not create additional scored moves. Keep spans narrow. Mixed turns may remain in a necessary contiguous span only when exact scored ownership is unambiguous, with the attribution audit explicitly excluding interjected words. Quotes must be wholly the assigned participant's words. Source restrictions identify recognition-corrupted clauses: none may justify ratings, concessions or alleged contradictions. Any selected material uncertainty that persists must be below high confidence and will require audio verification. Seven auxiliary checks have occurred, not direct human listening or diarization.

## Audits

coverageAudit accounts for every major retained line with selected IDs and source-specific reasons for omitted repetition, logistics or lesser material. Account for all excluded intervals without scoring them. Preserve concessions and qualifications; review both final summaries.

speakerAttributionReview records actual handoffs, explicit addressees, first-person continuity, mixed spans and uncertainty. Describe the exact basis rather than blanket high-confidence claims. Never claim to have listened or verified passages outside the supplied checks.

selectionBalanceAudit: {thresholds:{totalAbsoluteDifference:3,sectionAbsoluteDifference:2},totals:{pro:N,con:N,absoluteDifference:N},sections:[{sectionId,pro:N,con:N,absoluteDifference:N}],rationaleRequired:boolean,rationale:string}. Sections in locked order. Rationale required when total difference >=3 or any section difference >=2; identify why asymmetric selections are load-bearing.

publicationCapacityAudit: {maximumSelectedMovesPerSidePerSection:4,sections:[{sectionId,pro:N,con:N,withinCapacity:boolean,fourthRowRequired:boolean,fourthRowAuthorized:boolean,rationale:string}],allSectionsWithinCapacity:boolean,allFourthRowsPreauthorized:boolean}. fourthRowRequired means either side has four; fourthRowAuthorized true for ordinary rows or justified fourth rows. Controller independently recomputes counts and flags.

## One submission

Confirm the execution plan's absolute output destination. Read the complete packet; send a complete-reading checkpoint and WAIT for controller authentication before authoring. Prepare the candidate in memory, run the pinned checker through stdin, then send the exact JSON bytes through stdin to handoff hold. No draft file. Controller inspects the entire candidate and alone releases its exact first save. Never self-approve, edit a submission, create subagents, make paid calls, inspect peers or open session logs. One fresh context, one attempt, zero automatic retries. Unsaved corrections remain in this same context and attempt.
