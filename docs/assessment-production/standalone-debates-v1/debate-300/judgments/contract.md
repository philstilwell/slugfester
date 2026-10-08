# Isolated primary judgment contract

Read the execution plan and entire lossless reader, including every document and shared block, in bounded untruncated outputs. Only plan-allowed evidence may be read. Follow exact model and effort in the plan. No peer outputs, other debates, historical scores, publication prose, rankings, biographies, browsing, session logs, credentials or environment inspection. No paid calls, external inference or subagents. Isolation is procedural, not a filesystem sandbox. Confirm the absolute output path; tell the controller when reading is complete and wait for authenticated reading release before authoring.

## Evidence and judgment

Motion: Do human beings have free will? Pro: Daniel Dennett. Con: Robert Sapolsky.

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

Evaluate every locked move exactly once in inventory order under the full rubric. Preserve inventory fields. Never calculate move, section or overall totals or winners. Each rationale must identify its source-specific strength or limitation. No duplicate deduction for the same defect absent distinct consequences. Source uncertainty and transcription corruption cannot become an argument-quality penalty.

## Exact output schema

A single JSON object with schemaVersion "1.0-standalone-primary-judgment", protocolId "assessment-production-standalone-debate-v1", status "complete-and-schema-valid", pass from plan, debateNumber as string from plan, debateId from plan, reviewerRole "isolated-score-blind-primary-judge", assessmentModel "5.6 Sol", reasoningEffort "low", inventorySha256 from judgment packet, isolation, judgments, burdenCompletionAdjustment, audit.

isolation contains booleans legacyAssessmentsUnavailable, calculatedTotalsUnavailable, winnerLabelsUnavailable, otherJudgmentUnavailable, publicationProseUnavailable, otherDebatesUnavailable (all true only if accurate), and contaminationDetected (false only if accurate). Report a breach and stop if any required isolation condition is false.

judgments is an array exactly matching inventory moves. Each entry: {moveId,assessmentConfidence,dimensions}. assessmentConfidence is high, medium or low. dimensions has exactly logicalCoherence, evidenceWarrant, responsiveness, relevanceBurden, precisionClarity, calibrationCharity. Each dimension has exactly {value,rationale}; value is integer 0–100, rationale at least 40 characters. Use rubric anchors; do not give duplicate deductions for one defect unless it has distinct demonstrated consequences in multiple dimensions.

burdenCompletionAdjustment has pro and con. Each is exactly {value,rationale,eligibility}, with integer value −5..5. eligibility has exactly these nine keys: distinctDebateWideConsequence (boolean), affectsBurdenCompletion (boolean), notAlreadyScored (boolean), affectedBurdenIds (array of actual route bridge IDs), completionCriterion (string), relatedMoveIds (array of actual move IDs), distinctConsequence (string), alreadyCapturedBy (array), counterfactual (string). Duplicate capture (nonempty alreadyCapturedBy or false notAlreadyScored) requires zero. Nonzero requires all three booleans true, nonempty affectedBurdenIds and relatedMoveIds, empty alreadyCapturedBy, and completionCriterion, distinctConsequence, counterfactual each at least 30 characters. A value of zero still requires every eligibility key. Explain the actual debate-wide question and why any claimed adjustment does not rescore a move. Never calculate totals to choose an adjustment.

audit has completeLockedInventoryReviewed, allMovesJudgedOnce, ratingsOnlyNoCalculatedScores, publicationBlind, scoreBlind, all true only if accurate.

## One unsaved review and exact submission

After authenticated reading release, create the complete candidate in memory. Run the pinned checker with standard input; do not inspect its implementation or create a disk draft. Review every rationale yourself against source ownership, recognition restrictions, adopted burdens and later qualifications before holding it. Send exact UTF-8 JSON bytes from your existing memory to the pinned `standalone-workflow.mjs handoff hold` command with the explicit debate and your plan. The checker validates and the holder keeps bytes in memory. Keep the holder alive and send its receipt. The controller reads all candidate bytes and issues source-compliance release; it may not negotiate ratings or disclose the peer pass. Release writes the approved bytes exactly once. Stop authoring after submission. One context, one submission, no automatic retries or overwrites. Ordinary corrections before a successful hold are within this context; an existing hold or saved failure is never silently replaced.

## Completed inventory-triggered audio verification

Dennett owns the final formal reply. The existing 42:08–43:00 automated audio check covers the complete selected 42:14–42:43 passage and confirms his claim that civilization needs punishment and law and order, followed by the explicit ideal of a fair and non-awful system. Both canonical captions and auxiliary recognition leave the final punished-person clause garbled. That final clause is excluded from quotation, inference and clarity or logical penalties; it is not needed for the selected claim. The subsequent moderator questions are outside scope. This is automated recognition checked against full surrounding text, not direct human listening or independent verification of the institutional claim.
