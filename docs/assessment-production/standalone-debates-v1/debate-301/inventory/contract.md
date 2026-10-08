# Score-blind inventory contract

Produce one JSON object with exactly motion, routes, sections, moves, coverageAudit, speakerAttributionReview, selectionBalanceAudit, publicationCapacityAudit. No ratings, totals, winner, critiques, tags or AI contribution. Controller adds locked identity and exact source excerpts mechanically; semantic selection, burdens, importance and coherent sections are yours.

Read every allowed input fully using the maintained reader in bounded untruncated chunks. E labels are ONE-BASED; startEvent/endEvent are ZERO-BASED (E0001 = 0). No other debates, prior assessments, peer judgments, publication, session logs, credentials or outside sources. Pinned checker tools may run without reading their implementation.

## Identity and source

Motion: Did Jesus rise from the dead?
Pro: David Wood. Con: Shabir Ally.

Assess only the formal opening speeches, both rebuttal rounds, crossfire and both five-minute closings, approximately 21:14–2:15:57. Exclude introduction, moderator logistics, applause, all subsequent audience Q&A, final replies to an audience question and outro. Neither speaker receives credit, penalty, inferred concession or failure-to-reply inference from excluded material.

The motion is Did Jesus rise from the dead? David Wood affirms death followed by resurrection. Shabir Ally challenges death and the historical reliability of resurrection narratives, and proposes survival followed by divine ascension as a compatible alternative. Ally does not defend substitution theory; he explicitly sees no historical reason for another person replacing Jesus. Do not score him as defending that rejected view or as rejecting all miracles.

Ally distinguishes historical reconstruction, Quranic interpretation and personal faith. He allows diverse Muslim interpretations of being raised, acknowledges that critical scholars reject Islam too, and explicitly concedes their widespread acceptance of Jesus’s death in his closing. His own disagreement concerns its warrant, including the conditional challenge if later physical appearances are accepted. Do not erase that concession, turn possibilities into demonstrated history, or impose a naturalistic burden he never adopts.

Wood uses the early 1 Corinthians creed, the claimed death consensus, reported appearances to individuals and groups, and sincerity under persecution. Preserve the difference between evidence of sincere belief and evidence that resurrection occurred. His opening attack on substitution precedes Ally’s explicit rejection; Wood subsequently develops different Quranic consistency challenges. Evaluate those actual stages rather than making his entire case depend on a view Ally disavows.

Ally’s development claim is expressly a trend, not a strictly linear increase in miracle counts. He acknowledges that Mark’s young man may be an angel and answers Wood’s numerical-miracle comparison by distinguishing quality and type. Preserve the geographic and narrative examples and their immediate qualifications. Book quotations, scholarly agreements, dating claims, medical claims and scriptural translations are the speakers’ evidence, not independently verified facts.

Distinguish postmortem vindication or assumption from rescue before death. Wood explicitly challenges the title of Daniel Smith’s work and quotes Acts 2 affirming death; Ally invokes older Psalm contexts, Q reconstruction, the sign of Jonah and later physical appearances. Do not assume one reported scholar’s view automatically endorses every step of either speaker’s inference.

Wood challenges consistent application of critical methods to both traditions and appeals to Quranic instructions about judging by the Gospel and true followers becoming uppermost. Ally responds with legal context, what God revealed therein, moral or spiritual victory, and the Quran’s instructional use of existing stories. His Hulk analogy illustrates literary reference, not a claim that Jesus is fictional. Wood’s comparison involving neo-Nazis is a claimed spectrum analogy, explicitly not literal affiliation; no extra penalty for tone or an invented literal allegation.

Automatic captions contain recognizer errors in names and technical terms, omitted Arabic words, rolling timestamp overlap and brief mixed interjections. Do not quote corrupted proper names or Arabic, infer missing arguments from recognition failures, or treat them as clarity defects. Use the clear surrounding source. Event2669 (zero-based) contains the end of Wood’s turn and start of Ally’s turn; never select that mixed event as a single-speaker move or quotation. Other uncertain selected passages must be marked below high confidence and audio-verified under the frozen protocol.

Five targeted automated audio checks supplement the captions: Wood’s opening core, Ally’s survival/ascension distinction, the first long handoff gap, the mixed crossfire handoff, and the closing-to-Q&A boundary. These are automated recognition cross-checks, not direct human listening. They do not replace canonical captions or excuse any new below-high-confidence inventory trigger.

Featured quotations must be exact complete 3–18 word thoughts with clear referents and any material qualification. Do not quote an opponent’s reported position as the speaker’s own conclusion. A source fragment must be replaced by another complete excerpt, never completed with invented words.

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

speakerAttributionReview records actual handoffs, explicit addressees, first-person continuity, mixed spans and uncertainties. Only the five named supplementary automated checks have occurred; do not claim direct listening or verification of any other passage. Record confidence honestly even if that requires later paid verification.

selectionBalanceAudit: {thresholds:{totalAbsoluteDifference:3,sectionAbsoluteDifference:2},totals:{pro:N,con:N,absoluteDifference:N},sections:[{sectionId,pro:N,con:N,absoluteDifference:N}],rationaleRequired:boolean,rationale:string}. Records follow section order. Rationale required when total difference >=3 or any section difference >=2; identify load-bearing asymmetric selections.

publicationCapacityAudit: {maximumSelectedMovesPerSidePerSection:4,sections:[{sectionId,pro:N,con:N,withinCapacity:boolean,fourthRowRequired:boolean,fourthRowAuthorized:boolean,rationale:string}],allSectionsWithinCapacity:boolean,allFourthRowsPreauthorized:boolean}. fourthRowRequired means either side has four. fourthRowAuthorized is true for ordinary rows or justified fourth rows. Controller independently recomputes all counts and flags.

## One submission

Confirm the execution plan's absolute destination before authoring. Read the full maintained packet through bounded untruncated reads; send a complete-reading checkpoint and wait for controller authentication before authoring. Prepare the candidate in memory, run the pinned checker through stdin, then send exact JSON bytes through stdin to handoff hold. No draft file. Controller inspects all held prose and alone releases the exact first save. Never self-approve, edit a submission, create subagents, use paid calls, inspect peer outputs or open session logs. One fresh context, one attempt, zero automatic retries. Unsaved corrections remain within this context and attempt.
