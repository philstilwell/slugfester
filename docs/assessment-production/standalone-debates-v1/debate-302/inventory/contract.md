# Score-blind inventory contract

Produce one JSON object with exactly motion, routes, sections, moves, coverageAudit, speakerAttributionReview, selectionBalanceAudit, publicationCapacityAudit, moderatorContextAudit. No ratings, totals, winner, critiques, tags or AI contribution. Controller adds locked identity and source excerpts mechanically; semantic selection, burdens, importance and coherent sections are yours.

Read every allowed input fully using the maintained reader in bounded untruncated chunks. E labels are ONE-BASED; startEvent/endEvent are ZERO-BASED. No other debates, prior assessments, peer outputs, credentials, session logs or outside sources. Checker implementations are pinned tool inputs, not required reading.

## Identity and source

The exact motion is: Is the Christian God worthy of worship? Pro is Randal Rauser; con is Dan Barker. Assess the approved main discussion and closing remarks only. This is an informal dialogue, not timed formal rounds.

Cameron Bertuzzi supplies substantive arguments, especially the resurrection-to-Christian-hermeneutics bridge around 1:00:29–1:06. Use the explicit moderator-as-context lane, never the automatic 5% exception. No moderator assertion or inference is earned support for either debater. Primary answers remain eligible only for their own contributions. Unequal prompting must inform opportunity to respond; do not invent moderator response targets assigned to a debater.

Exclude introductions, all audience Q&A at 1:28:28–2:00:08, and the outro. Give no credit, penalty, inferred concession, or alleged failure to reply from those passages. Full transcript access supports scope audit only. Barker’s later conditional yes and the detailed harm-based ethics exchange are excluded.

Rauser’s closing criticism of a sheep characterization at about 2:00:48 depends on excluded audience Q&A. Do not use this to judge Barker’s assessed performance or as an independently demonstrated Rauser rebuttal. Independently repeated claims about interpretive assumptions and fallibility remain eligible.

Rauser distinguishes divine perfection, canonical unity, the Jesus principle and love. His Christian interpretive framework is conditional on Christian commitments; internal coherence is not independent truth. Barker challenges those commitments and the moral acceptability of the depicted actions. Preserve both burdens.

Rauser surveys multiple Christian approaches to conquest texts but explicitly rejects Copan’s justification and broadly aligns with readings denying that God commanded genocide. He does not defend every position he lists. Preserve his rejection, the creed-versus-scripture distinction and his acknowledgment of disagreement.

Barker distinguishes face-value starting interpretation from literalism, explicitly accepts metaphor and literary value, and acknowledges human authorship of Psalm 137. His objection concerns inclusion, inspiration and moral authority, not merely who uttered the words. Do not erase these qualifications.

Rauser’s bereaved-mother analogy explains the preservation of human lament without endorsing rage or treating it as the final canonical moral teaching. Barker challenges the absence of explicit condemnation and the recurring pattern of violence. Do not conflate explaining expression, validating it and commanding action.

Preserve the dispute about rape imagery even if metaphorical, divine agency, Psalm 14’s universal/hyperbolic reading versus harm to atheists, and the victim-centered Canaanite challenge. Biblical translations, historical claims, scholar reports and anecdotes are speakers’ offered evidence, not independently verified scoring facts.

Rauser distinguishes meaningful literary ambiguity from failed emergency instructions and claims the broad redemptive message is clear. Barker distinguishes needing experts from expert disagreement, and challenges divine communication accordingly. Do not manufacture universal claims from their local comparisons.

Both closings acknowledge fallibility and shared moral aims. Barker’s religion-as-cancer metaphor is retained main-discussion evidence with its qualifications; do not treat politeness or abrasiveness as an independent scoring dimension.

Automatic captions corrupt names and terms and sometimes mix turns. Zero-based event 471 combines Barker’s terminal word with Bertuzzi’s intervention; do not select it as one speaker’s evidence. Other mixed events require narrow, reliable boundaries or below-high confidence and required audio verification. Do not penalize recognition errors as clarity failures. Auxiliary automated transcription is not direct listening and does not replace canonical exact text.

Featured quotations must be exact complete 3–18 word source thoughts with clear referents and any material qualification. Choose another excerpt if the caption is corrupted; never silently repair words or append an invented completion.

Six automated checks cover Rauser’s opening, Barker’s opening, the first substantive moderator handoff, the resurrection-context exchange, the Q&A boundary and the closings. Any new material uncertainty must still trigger verification.

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

coverageAudit accounts for all major retained lines with selected IDs and source-specific omissions for repetition, logistics or lesser material. Account for all excluded intervals and omitted Q&A without scoring them. The moderator provides unscored context under the explicit approved lane; no host move is selected. Preserve concessions and qualifications.

speakerAttributionReview records actual handoffs, explicit addressees, first-person continuity, mixed spans and uncertainties. Only the six named supplementary automated checks have occurred; do not claim direct listening or verification of any other passage. Record confidence honestly even if that requires later paid verification.

selectionBalanceAudit: {thresholds:{totalAbsoluteDifference:3,sectionAbsoluteDifference:2},totals:{pro:N,con:N,absoluteDifference:N},sections:[{sectionId,pro:N,con:N,absoluteDifference:N}],rationaleRequired:boolean,rationale:string}. Records follow section order. Rationale required when total difference >=3 or any section difference >=2; identify load-bearing asymmetric selections.

publicationCapacityAudit: {maximumSelectedMovesPerSidePerSection:4,sections:[{sectionId,pro:N,con:N,withinCapacity:boolean,fourthRowRequired:boolean,fourthRowAuthorized:boolean,rationale:string}],allSectionsWithinCapacity:boolean,allFourthRowsPreauthorized:boolean}. fourthRowRequired means either side has four. fourthRowAuthorized is true for ordinary rows or justified fourth rows. Controller independently recomputes all counts and flags.

## One submission

Confirm the execution plan's absolute destination before authoring. Read the full maintained packet through bounded untruncated reads; send a complete-reading checkpoint and wait for controller authentication before authoring. Prepare the candidate in memory, run the pinned checker through stdin, then send exact JSON bytes through stdin to handoff hold. No draft file. Controller inspects all held prose and alone releases the exact first save. Never self-approve, edit a submission, create subagents, use paid calls, inspect peer outputs or open session logs. One fresh context, one attempt, zero automatic retries. Unsaved corrections remain within this context and attempt.

## Moderator ownership audit

Include moderatorContextAudit: {protocolId:"editor-approved-moderator-context-v1",contextOnlyParticipants:["Cameron Bertuzzi"],primaryRepliesRemainEligible:true,noModeratorMoveSelected:true,allSelectedEvidenceOwnedByAssignedPrimarySpeaker:true,questioningAsymmetryTreatment:string,moves:[{moveId,hostArgumentNotCredited:true,scoredClaimOwnership:string,moderatorPrompt:null or {startEvent,endEvent,summary}}]}. Audit moves exactly match selected move order. scoredClaimOwnership is at least 60 characters and identifies what this primary speaker supplies without host credit. questioningAsymmetryTreatment is at least 80 characters and source-specific. A moderator prompt uses zero-based events strictly preceding the selected span and a summary at least 40 characters. Host prompt is context, not a fake opponent move. Ordinary responses still require retained primary target IDs; a fresh answer to a moderator question can be a constructive move. Do not copy editorApprovedScope into parts; the controller adds it.
