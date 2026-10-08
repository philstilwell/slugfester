# Score-blind inventory contract

Produce one JSON object with exactly motion, routes, sections, moves, coverageAudit, speakerAttributionReview, selectionBalanceAudit, publicationCapacityAudit. No ratings, totals, winner, critiques, tags or AI contribution. Controller adds locked identity and exact source excerpts mechanically; semantic selection, burdens, importance and coherent sections are yours.

Read every allowed input fully using the maintained reader in bounded untruncated chunks. E labels are ONE-BASED; startEvent/endEvent are ZERO-BASED (E0001 = 0). No other debates, prior assessments, peer judgments, publication, session logs, credentials or outside sources. Pinned checker tools may run without reading their implementation.

## Identity and source

Motion: Do human beings have free will?
Pro: Daniel Dennett. Con: Robert Sapolsky.

Assess only the two formal opening speeches and two reply rounds, approximately 2:24–42:43, including Sapolsky’s short direct answer and Dennett’s continuation within the final reply round. No separate formal closing speeches occur. The subsequent moderator-led discussion, audience Q&A, final moderator question and replies, poll results, introduction and logistics are excluded. Neither speaker receives credit, penalty, inferred concession or failure-to-reply inference from excluded material.

The motion is Do human beings have free will? Dennett explicitly accepts determinism and argues for an evolved, socially supported capacity for reasons-responsive self-control and responsibility. Do not assign him an uncaused or libertarian will, universal equal capacities, or ultimate responsibility for becoming a responsible agent. He acknowledges luck, diminished capacity and exceptions.

Sapolsky denies free will while explicitly accepting ordinary intentions, choices and biological self-control. He argues that their causal origins are outside the agent’s control. He says genes determine next to nothing in isolation and emphasizes gene-environment interactions across development and evolutionary history. Do not recast his position as simple genetic determinism, denial that choices occur, or denial that reasons can causally change people.

Both speakers accept instrumental punishment and reward; neither is committed here to gratuitous suffering or indiscriminate release of dangerous people. Sapolsky’s qualification that less pain and more happiness are good is explicitly restored after Dennett quotes his machine statement. Dennett acknowledges the addendum. Preserve that correction; do not portray Sapolsky as finally denying that anything good can happen to humans.

Sapolsky quotes Dennett’s runner analogy and comments about a two-stage model. Dennett responds that the quoted passages continued with qualifications or rejection, and distinguishes meeting an intuition from endorsing a model. These are source-reported textual disputes, not independent verification of either book. Record the actual live quotation, challenge and reply; do not import outside book passages or assume any speaker’s allegation establishes accuracy.

Dennett distinguishes determinism from predictability, invokes deterministic chaos and unconstrained generation of variation, and denies that evolution proves indeterminism. His coin-flip wording shifts between randomness and controllability. Sapolsky accepts option generation while maintaining that the resulting chooser and values have unchosen causal origins. Preserve these distinctions without making a penalty out of recognition noise.

Automatic captions contain occasional mangled technical words, mixed interjections and a garbled final punishment sentence. The final reply still clearly recommends a fair and non-awful sanction system. Do not quote or penalize the recognition-corrupted phrase about the punished person. Reported statistics, medical examples and book quotations remain the speakers’ evidence, not independently verified scientific or textual facts.

Five targeted automated audio checks confirm the opening disagreement, the machine-quotation qualification, Dennett’s quotation-context replies and the formal-round boundary. They are supplementary text, not replacement canonical captions or direct human listening. Any selected passage with materially uncertain ownership or wording remains below high confidence and requires its own prescribed verification.

Full caption coverage includes all later excluded discussion. That availability does not make excluded answers, the money/mortgage analogy, later edge-case debate, audience-study claims or final poll eligible. The sole inter-event gap above two seconds is 2.36 seconds at the moderator’s handoff inside the formal reply round. There is no evidence of an omitted substantive formal speech.

Featured quotations must be exact complete 3–18 word thoughts with clear referents and all material qualifications. Do not use an incomplete quote from an opponent’s reported words as the speaker’s own final view, and do not use a concession cut before its immediate challenge.

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
