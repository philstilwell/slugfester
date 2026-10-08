# Score-blind inventory contract

Produce one JSON object with exactly motion, routes, sections, moves, coverageAudit, speakerAttributionReview, selectionBalanceAudit, publicationCapacityAudit, moderatorContextAudit. No ratings, totals, winner, critiques, tags or AI contribution. Controller adds identity and exact source excerpts mechanically; semantic selection, burdens, importance and coherent sections are yours.

Read every allowed input fully through the maintained reader in bounded untruncated chunks. E labels are ONE-BASED; startEvent/endEvent are ZERO-BASED (E0001 = 0). No other debates, prior assessments, peer judgments, publication, session logs, credentials or outside sources. Pinned checker tools may run without reading implementation.

## Identity and source

Motion: Does divine hiddenness count against a perfectly loving God?
Pro: Paulogia. Con: Michael Jones.

Preserve all frozen source restrictions. Assess only the approved main-discussion scope. Shannon Q is context, never a scored participant; the guests' own responses are eligible. Audience Q&A, including the embedded question and its dependent continuation, is excluded. Excluded material must supply no credit, penalty, concession or failure-to-reply inference. Read every source event for coverage without importing excluded evidence. Preserve narrowed God attributes, one-exception versus population-tendency reasoning, personal versus public force, possible postmortem reconciliation, speculation, contents versus causes of thought, and belief versus relationship or salvation. Do not treat these distinctions as successes before judging.

Auxiliary audio findings in the source notes support only their specified wording/attribution decisions. Do not claim direct listening. Uncertain mixed turns, corrupted material terms or speaker ownership require below-high confidence and a precise verification reason. Select at least one exact complete 3–18 word featured-quote candidate per side that stands alone with clear referents and necessary qualification.

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
- quoteEligibleExactSpans: zero to two exact complete 3–18 word source substrings; [] if no suitable quote. At least one suitable candidate per side across inventory.
- attributionConfidence: high/medium/low; attributionRationale; audioVerificationReason.
- importance: integer 1–3; importanceRationale based on burden, not quality.
- burdenContact: {bridgeId,tier,rationale} owned by this side.
- respondsToIds: earlier selected PRIMARY SPEAKER IDs or [] for constructive moves.
- responseComponents: replies require {targetMoveId,description} for each actual target; constructive moves use [].

Retain load-bearing targets of selected replies. Repetition is not a new move; substantive distinctions and new answers matter. Do not invent a prior primary target when a statement only answers Shannon. Such an answer can be constructive on its own assigned burden, with its actual moderator prompt in moderatorContextAudit. Never import her argument into the scored claim, reason or quote. Source excerpts may contain an explicitly identified incidental prompt/interjection only when the scored substance is wholly attributable to the assigned guest; choose narrower clean spans whenever possible. Quotes must belong to that guest alone.

## Audits

coverageAudit accounts for every major retained line with selected IDs and source-specific omissions for repetition, logistics or lesser material. Account for all excluded intervals without scoring them. Preserve concessions and qualifications.

speakerAttributionReview records actual handoffs, addressees, first-person continuity, mixed spans and uncertainties. Distinguish auxiliary automated audio findings from direct listening, which did not occur. Record confidence honestly even if later paid verification is required.

selectionBalanceAudit: {thresholds:{totalAbsoluteDifference:3,sectionAbsoluteDifference:2},totals:{pro:N,con:N,absoluteDifference:N},sections:[{sectionId,pro:N,con:N,absoluteDifference:N}],rationaleRequired:boolean,rationale:string}. Records follow section order. Rationale required when total difference >=3 or any section difference >=2; identify load-bearing asymmetric selections.

publicationCapacityAudit: {maximumSelectedMovesPerSidePerSection:4,sections:[{sectionId,pro:N,con:N,withinCapacity:boolean,fourthRowRequired:boolean,fourthRowAuthorized:boolean,rationale:string}],allSectionsWithinCapacity:boolean,allFourthRowsPreauthorized:boolean}. fourthRowRequired means either side has four. fourthRowAuthorized is true for ordinary rows or justified fourth rows. Controller independently recomputes all counts and flags.

moderatorContextAudit: {protocolId:"editor-approved-moderator-context-v1",contextOnlyParticipants:["Shannon Q"],primaryRepliesRemainEligible:true,noModeratorMoveSelected:true,allSelectedEvidenceOwnedByAssignedPrimarySpeaker:true,questioningAsymmetryTreatment:string,moves:[{moveId,hostArgumentNotCredited:true,scoredClaimOwnership:string,moderatorPrompt:null|{startEvent,endEvent,summary}}]}. Provide one ownership record per selected move in the same order. scoredClaimOwnership must be source-specific and >=60 characters. questioningAsymmetryTreatment >=80 characters. A moderatorPrompt uses ZERO-BASED event indices strictly before the selected move span and a source-specific >=40 character summary. If rolling captions mix a prompt into the start, choose a later guest-only span or explain the boundary honestly; never falsify indices. Only the guest's own argument is assessed. Explicitly show where an answer is moderator-prompted without converting it into an opposition move.

## One submission

Confirm the execution plan's absolute destination before authoring. Read the complete plan and full maintained packet through bounded untruncated reads; send a complete-reading checkpoint and wait for controller authentication before authoring. Prepare candidate in memory, run the pinned checker through stdin, then send exact JSON bytes through stdin to handoff hold. No draft file. Controller inspects all held prose and alone releases the exact first save. Never self-approve, edit a submission, create subagents, use paid calls, inspect peers or session logs. One fresh context, one attempt, zero automatic retries. Unsaved corrections remain within this context and attempt.
