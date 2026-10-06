# Score-blind inventory contract

Produce one JSON object with motion, routes, sections, moves, coverageAudit, speakerAttributionReview, selectionBalanceAudit, and publicationCapacityAudit. Generate no ratings, totals, winner, critiques, tags or AI contribution. The controller adds frozen identity and exact source excerpts mechanically; semantic selection, burdens, importance and coherent sections are yours.

Read every allowed input fully through the maintained reader in untruncated chunks. Read source restrictions before selecting. The full recording is present for boundary context; only the editor-approved direct exchange may support assessment. Human E labels in the indexed source are ONE-BASED; canonical startEvent/endEvent values are ZERO-BASED (E0001 means index 0). events.json may be consulted only for exact source lookup. No other debates, prior assessments, peer judgments, publication, session logs, credentials or outside sources are allowed.

## Identity and scope

Motion: What is the best account of objective morality?
Pro: Adam Lloyd Johnson — God grounds objective morality.
Con: Erik Wielenberg — Objective morality needs no divine foundation.

Assess only direct debater questions and replies, approximately 33:05–1:13:25, with substantive source beginning at 33:22 and ending 1:13:25.840. The whole introductory moderator-led position discussion and entire audience Q&A, every dependent answer, and final audience-dependent reply are excluded. No formal openings or paired closings exist. Assign neither credit, penalty, reply link nor absence inference from excluded material. A proposition restated within the retained source may count only in that form, never with evidence imported from the introduction. Both speakers accept objective morality; assess their comparative explanations and actual challenges. A question is not an unargued contrary theory. Preserve the distinction between explaining beliefs and grounding values, and between goodness, obligation and punishment, where the speakers draw it. No rating is prescribed.

## Source fidelity

Preserve exact caption wording and times. Do not correct recognition errors or penalize speakers for them. Respect all enumerated corrupt-clause restrictions. Avoid mixed E1236 and E1607 entirely. Speakers are identified through explicit question addressees, named turn assignments and uninterrupted alternating answers; mark any residual uncertain ownership below high with its reason, never high to evade required audio verification. Audio retrieval failed before any transcription call; no independent listening or second-transcript check is claimed. Each selected below-high-attribution move requires verification before adjudication.

Quotes must be exact, self-contained complete thoughts, retaining meaning-changing qualifications or challenges. At least one complete exact 3–18 word featured candidate per side is mandatory before freeze. Prefer 6–14 words. Do not invent completions or truncate an object or conclusion.

## Routes and sections

Exactly two routes {side,speaker,bridges}. Each bridges array has 3–7 unique objects {bridgeId,tier,description}: exactly one motion tier, at least one central and one subsidiary tier. IDs are globally unique. Describe burdens or inference links, not achievements; keep each bridge owned by its side.

Use 4–7 coherent topical sections {sectionId,title,weightPercent,rationale}. Each sectionId is a unique descriptive lowercase slug, never s1/s2. Positive integer weights total 100 and reflect motion-level importance before judgment. Each section includes genuine selected moves from each side. Three per side is ordinary; four is maximum. A fourth requires a source-specific rationale for distinct, nonmergeable, independently assessable moves belonging together. Do not force symmetry or drop material arguments to fit the display.

## Moves

Select 8–48 load-bearing moves in chronological order. Each object has:
- moveId: unique descriptive lowercase slug, not m1/m2.
- side, speaker, sectionId: exact authorized identity and section.
- moveKind: constructive or reply.
- claim, warrant, inference: separate source-faithful descriptions without ratings.
- startEvent,endEvent: inclusive ZERO-BASED indices for the smallest complete contiguous supporting passage.
- sourceSpanSelectionRationale: specific boundary reason; excerpts longer than 2200 characters require a compelling complete-argument rationale.
- quoteEligibleExactSpans: zero to two complete exact 3–18 word source substrings, avoiding corrupt terms, misowned words, or lost qualifications. Use [] when no suitable quote fits; each side needs at least one eligible complete thought.
- attributionConfidence: high, medium or low; attributionRationale; audioVerificationReason.
- importance: integer 1–3; importanceRationale based on burden importance, not quality.
- burdenContact: {bridgeId,tier,rationale}, matching this side's bridge.
- respondsToIds: earlier selected move IDs, or [] for constructive moves.
- responseComponents: replies require {targetMoveId,description} objects covering actual target IDs; constructive moves use [].

Retain a load-bearing target when selecting its reply. Repetition alone is not a new achievement; substantive distinctions and new answers matter. Context access does not justify copying an entire speech. Choose sections from this source without a prescribed count of moves or matched pairs.

## Audits

coverageAudit accounts for every major retained line, selected move IDs and specific omissions for repetition, logistics or lesser material. Address all eight direct questions and answers. Account for the entire excluded introduction/Q&A/final reply without treating them as scored evidence.

speakerAttributionReview records actual named handoffs, direct question addressees, uninterrupted speech ownership, mixed spans and unresolved uncertainties. Do not claim an audio check occurred.

selectionBalanceAudit: {thresholds:{totalAbsoluteDifference:3,sectionAbsoluteDifference:2},totals:{pro:N,con:N,absoluteDifference:N},sections:[{sectionId,pro:N,con:N,absoluteDifference:N}],rationaleRequired:boolean,rationale:string}. Section records follow section order. Rationale is required if total difference is at least 3 or any section difference at least 2; identify the burden-bearing asymmetric selections.

publicationCapacityAudit: {maximumSelectedMovesPerSidePerSection:4,sections:[{sectionId,pro:N,con:N,withinCapacity:boolean,fourthRowRequired:boolean,fourthRowAuthorized:boolean,rationale:string}],allSectionsWithinCapacity:boolean,allFourthRowsPreauthorized:boolean}. fourthRowRequired means either side has four; fourthRowAuthorized is true for ordinary rows or justified fourth rows. The controller independently recomputes all counts and flags before acceptance.

## One submission

Confirm the execution plan's absolute destination before authoring. Read all inputs with the maintained reader in bounded untruncated chunks. Send a complete-reading checkpoint and wait for controller authentication before authoring. Prepare one candidate in memory, run the pinned checker through stdin, then send exact JSON bytes through stdin to handoff hold. The controller reviews all held prose and alone releases its first save. Never save a draft file, self-authorize, edit after submission, or create sub-agents. One fresh context, one attempt, zero automatic retries and no paid calls. Ordinary unsaved corrections remain within this context and attempt.
