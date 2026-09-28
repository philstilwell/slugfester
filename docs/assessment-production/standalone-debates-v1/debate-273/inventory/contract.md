# Score-blind inventory contract

Produce one JSON object with motion, routes, sections, moves, coverageAudit, speakerAttributionReview, selectionBalanceAudit, and publicationCapacityAudit. Generate no ratings, totals, winner, critiques, rhetorical tags or AI Contribution. The controller mechanically adds identity, scope and exact canonical excerpts. All semantic selection, burdens and importance decisions are yours.

Read every packet allowedInput completely in bounded, untruncated outputs, using the packet's explicit workspace. Canonical event indices are zero-based and retained in the eligible indexed transcript. Only listed files may be read; no other debates, previous assessments, judgments, publication, session logs, credentials or outside sources. Events JSON is for exact lookup only within eligible events 59–1194; do not inspect excluded Q&A. Read source notes before analysis.

William Lane Craig is pro (Christian theism), Austin Dacey con (Atheism), on the exact motion “Does God exist?”. Assess all eight formal speeches only. Include both openings, both rebuttal rounds and both closings; exclude moderator logistics and the entire subsequent audience Q&A. No credit, penalty, inferred concession or alleged failure to reply may depend on excluded material. The explicit editor scope is distinct from any automatic 5% exception. Stop if any missing substantive formal source or independent formal third-party advocacy appears.

## Source fidelity and burden mapping

Do not silently fix recognized words or convert transcription uncertainty into speaker flaws. Follow the frozen negation, technical-term and numerical cautions. A disputed recognition phrase cannot support a quotation or a substantive inference. Preserve exact safe quotations and timestamps. Prefer spans entirely within named formal monologues. Mark actual unresolved attribution below high with a specific audio-verification reason; do not avoid necessary verification by inflating confidence.

Dacey adopts an evidential, probabilistic case for atheism; identify his actual positive commitments and distinguish them from objections to Craig’s arguments. Craig’s intermediate cosmological conclusions and complete classical/Christian theistic hypothesis differ; map each bridge faithfully. Neither side’s assertions about concessions or dropped arguments establish those facts without checking the complete formal exchange. Do not judge either side yet, infer truth from reputation, force symmetry or mirror another debate’s move count.

## Routes and sections

Exactly two routes {side,speaker,bridges}. Each bridges array has 3–7 globally unique {bridgeId,tier,description} objects, exactly one motion tier, at least one central and one subsidiary tier. Describe burdens or inferential links, not accomplishments.

Use 4–7 coherent topical sections {sectionId,title,weightPercent,rationale}. Unique descriptive lowercase slug IDs, no generic s1/s2. Positive integer weights sum to 100 and reflect importance before judgment. Each section includes genuine moves from each side. Three moves per side per section are ordinary; four maximum. A fourth requires a specific explanation for four distinct, independently assessable, nonmergeable moves belonging together. Preserve all load-bearing replies and late qualifications. Choose section boundaries that allow complete source coverage; do not trim important arguments merely to fit.

## Moves

Select 8–48 load-bearing moves in chronological order. Each move has:
- moveId: unique descriptive lowercase slug, not m1/m2.
- side, speaker, sectionId: exact identity and section.
- moveKind: constructive or reply.
- claim, warrant, inference: separate faithful descriptions without ratings.
- startEvent,endEvent: inclusive canonical indices, smallest complete contiguous supporting passage.
- sourceSpanSelectionRationale: reason for exact boundaries; a span longer than 2200 characters needs a compelling complete-argument explanation.
- quoteEligibleExactSpans: one or two exact substrings, 3–18 words, preferably 6–14; no disputed recognition, moderator or opponent words.
- attributionConfidence: high, medium or low; attributionRationale; audioVerificationReason.
- importance: integer 1–3; importanceRationale based on the motion burden, not argumentative quality.
- burdenContact: {bridgeId,tier,rationale}, matching this side’s route.
- respondsToIds: earlier selected move IDs; [] for constructive moves.
- responseComponents: replies need {targetMoveId,description} naming actual targets; constructive moves use [].

Retain load-bearing targets of selected replies. Repetition is not a new accomplishment, but new answers, distinctions and qualifications matter. A challenge does not automatically adopt a contrary theory. Whole-source reading is not a reason to copy entire speeches into move evidence.

## Audits

coverageAudit records every major line, selected IDs, and source-specific omissions for repetition, logistics and lesser material. Separately account for all eight formal speeches and closing responses. Record that the entire Q&A and dependent replies are excluded; do not summarize or assess their contents.

speakerAttributionReview records named formal rounds, their exact handoffs, mixed spans if any and residual uncertainty. High confidence requires specific source support.

selectionBalanceAudit: {thresholds:{totalAbsoluteDifference:3,sectionAbsoluteDifference:2},totals:{pro:N,con:N,absoluteDifference:N},sections:[{sectionId,pro:N,con:N,absoluteDifference:N}],rationaleRequired:boolean,rationale:string}. Sections follow section order. Rationale required if total difference >=3 or any section difference >=2; explain why asymmetric moves are load-bearing.

publicationCapacityAudit: {maximumSelectedMovesPerSidePerSection:4,sections:[{sectionId,pro:N,con:N,withinCapacity:boolean,fourthRowRequired:boolean,fourthRowAuthorized:boolean,rationale:string}],allSectionsWithinCapacity:boolean,allFourthRowsPreauthorized:boolean}. fourthRowRequired means either side has four. fourthRowAuthorized is true for ordinary rows or specifically justified fourth rows. Controller independently recomputes counts, flags, exclusions and speaker boundaries.

## One submission

Confirm absolute destination and read all allowed inputs fully. Send a complete-reading checkpoint and wait for controller release. In this same context and attempt, compose the candidate in memory, feed it via standard input to the allowed checker, and emit the complete unsaved JSON in tool output for controller inspection. No temporary candidate files. Review completeness and source restrictions before requesting save release. After mechanical and editorial checks pass, write the sole absolute output once using apply_patch and stop authoring. No update of submitted bytes, other agents, paid calls, retries or new context.
