# Isolated primary judgment contract

Read the execution plan and entire lossless reader, including every document and shared block, in bounded untruncated outputs. Only plan-allowed evidence may be read. Follow exact model and effort in the plan. No peer outputs, other debates, historical scores, publication prose, rankings, biographies, browsing, session logs, credentials or environment inspection. No paid calls, external inference or subagents. Isolation is procedural, not a filesystem sandbox. Confirm the absolute output path; tell the controller when reading is complete and wait for authenticated reading release before authoring.

## Evidence and judgment

The motion is “Are apostolic martyrdom and suffering good evidence for the resurrection?”. Sean McDowell is pro; Paulogia is con. Follow every restriction and exact exclusion in the source lock. The complete record is context, not blanket permission to assess excluded speech. Score only each selected speaker-owned move. Host arguments and all dependent replies are excluded, including the late chain approximately 1:00:08–1:08:35. Do not infer that McDowell failed to respond to the earlier motivation proposal merely because his response is excluded. Moderator recaps are not concessions by either opponent.

McDowell expressly limits this evidence to sincerity and an anti-conspiracy contribution within a larger case, not a standalone proof of resurrection. Paulogia accepts probable sincerity and deaths for Peter and Paul while contesting group extension and truth implications. Preserve his immediate retraction of nursery rhyme and his distinction between initial mental-state checking and refusing possible evidence. Caption errors, garbled names, disputed transcription numbers, and unresolved speaker ownership cannot become an argumentative weakness or justify a rating. The criterion near 9:09–9:16 was initially marked as a possible caption inversion; independent transcription also renders chose not to die, so that literal clause remains uncertain and is not a separate premise or a coherence penalty. Evaluate only the clear eyewitness/recantation/actual-death distinction. Required audio verification is now complete as recorded below; no direct listening was performed. Keep genuine argumentative uncertainty distinct from transcription uncertainty.

Evaluate every locked move exactly once, in inventory order, under the complete rubric. Preserve all inventory fields. Never calculate move, section or overall totals or winners. Each dimension rationale must identify its actual source-specific strength or limitation.

## Exact output schema

A single JSON object with schemaVersion "1.0-standalone-primary-judgment", protocolId "assessment-production-standalone-debate-v1", status "complete-and-schema-valid", pass from plan, debateNumber as string from plan, debateId from plan, reviewerRole "isolated-score-blind-primary-judge", assessmentModel "5.6 Sol", reasoningEffort "low", inventorySha256 from judgment packet, isolation, judgments, burdenCompletionAdjustment, audit.

isolation contains booleans legacyAssessmentsUnavailable, calculatedTotalsUnavailable, winnerLabelsUnavailable, otherJudgmentUnavailable, publicationProseUnavailable, otherDebatesUnavailable (all true only if accurate), and contaminationDetected (false only if accurate). Report a breach and stop if any required isolation condition is false.

judgments is an array exactly matching inventory moves. Each entry: {moveId,assessmentConfidence,dimensions}. assessmentConfidence is high, medium or low. dimensions has exactly logicalCoherence, evidenceWarrant, responsiveness, relevanceBurden, precisionClarity, calibrationCharity. Each dimension has exactly {value,rationale}; value is integer 0–100, rationale at least 40 characters. Use rubric anchors; do not give duplicate deductions for one defect unless it has distinct demonstrated consequences in multiple dimensions.

burdenCompletionAdjustment has pro and con. Each is exactly {value,rationale,eligibility}, with integer value −5..5. eligibility has exactly these nine keys: distinctDebateWideConsequence (boolean), affectsBurdenCompletion (boolean), notAlreadyScored (boolean), affectedBurdenIds (array of actual route bridge IDs), completionCriterion (string), relatedMoveIds (array of actual move IDs), distinctConsequence (string), alreadyCapturedBy (array), counterfactual (string). Duplicate capture (nonempty alreadyCapturedBy or false notAlreadyScored) requires zero. Nonzero requires all three booleans true, nonempty affectedBurdenIds and relatedMoveIds, empty alreadyCapturedBy, and completionCriterion, distinctConsequence, counterfactual each at least 30 characters. A value of zero still requires every eligibility key. Explain the actual debate-wide question and why any claimed adjustment does not rescore a move. Never calculate totals to choose an adjustment.

audit has completeLockedInventoryReviewed, allMovesJudgedOnce, ratingsOnlyNoCalculatedScores, publicationBlind, scoreBlind, all true only if accurate.

## One unsaved review and exact submission

After authenticated reading release, create the complete candidate in memory. Run the pinned checker with standard input; do not inspect its implementation or create a disk draft. Review every rationale yourself against source ownership, recognition restrictions, adopted burdens and later qualifications before holding it. Send exact UTF-8 JSON bytes from your existing memory to the pinned `standalone-workflow.mjs handoff hold` command with the explicit debate and your plan. The checker validates and the holder keeps bytes in memory. Keep the holder alive and send its receipt. The controller reads all candidate bytes and issues source-compliance release; it may not negotiate ratings or disclose the peer pass. Release writes the approved bytes exactly once. Stop authoring after submission. One context, one submission, no automatic retries or overwrites. Ordinary corrections before a successful hold are within this context; an existing hold or saved failure is never silently replaced.

## Completed audio verification (controller evidence, frozen before both primary contexts)

{
  "schemaVersion": "1.0-standalone-audio-verification",
  "protocolId": "assessment-production-standalone-debate-v1",
  "status": "complete",
  "debateNumber": "293",
  "debateId": "mcdowell-paulogia-apostolic-martyrdom-2020",
  "completedAt": "2026-10-07T06:09:54.239999+00:00",
  "inventory": {
    "path": "docs/assessment-production/standalone-debates-v1/debate-293/inventory/inventory.json",
    "sha256": "4123a3d7f268d5fb3d5ddfa5cebf2cd5da49734f04550458a952cc74a84a7676",
    "bytes": 108916
  },
  "triggeredMoveIds": [
    "con-three-part-martyr-test",
    "pro-multiple-attestation",
    "pro-group-reference-bulls-analogy",
    "con-deaths-mostly-limited",
    "pro-graded-central-deaths",
    "con-two-person-sincere-error",
    "pro-cultural-resistance-and-living-witnesses",
    "con-legends-can-grow-despite-checkability",
    "con-status-motivation-proposal"
  ],
  "checks": [
    {
      "moveId": "con-three-part-martyr-test",
      "status": "complete-eligible-inference-confirmed",
      "method": "Independent OpenAI automated transcription of the official publisher audio, aligned by exact surrounding utterances against canonical YouTube captions; no direct listening claim.",
      "callOrdinals": [
        2
      ],
      "results": [
        {
          "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-2.json",
          "sha256": "dac7b7235dbebb666673212db263acdea8c140f233f096ec96f5b67ceefa0168",
          "bytes": 1171
        }
      ],
      "attributionDecision": "Paulogia confirmed by sustained turn and surrounding handoffs; incidental voices are not owned by this move.",
      "finding": "Independent automated transcription also renders chose not to die. This does not establish a corrected literal phrase. The uncertain clause remains ineligible as a quotation, independent premise, or basis for a coherence penalty. The explicit claimed-eyewitness criterion, recantation opportunity, and actual-death-versus-willingness distinction are confirmed. McDowell’s later clear restatement at approximately 11:34–11:42 supplies context only; no invented corrected quote is permitted.",
      "unresolvedMaterialUsedForJudgment": false
    },
    {
      "moveId": "pro-multiple-attestation",
      "status": "complete-eligible-inference-confirmed",
      "method": "Independent OpenAI automated transcription of the official publisher audio, aligned by exact surrounding utterances against canonical YouTube captions; no direct listening claim.",
      "callOrdinals": [
        3
      ],
      "results": [
        {
          "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-3.json",
          "sha256": "195b9275e3d8cce1dad530e91602821b285803f0900e1a47643d9d33ae9ee9ad",
          "bytes": 1014
        }
      ],
      "attributionDecision": "Sean McDowell confirmed by sustained turn and surrounding handoffs; incidental voices are not owned by this move.",
      "finding": "Gary Habermas attribution and approximate self-qualified 90/95 percent confirmed; do not turn his explicitly uncertain estimate into a precise consensus. Early creed and repeated-source argument, limited sincerity conclusion, Josephus-dependence and Acts/Paul mismatch objections confirmed. Exact creed order in automated render is not a verbatim eligible quotation.",
      "unresolvedMaterialUsedForJudgment": false
    },
    {
      "moveId": "pro-group-reference-bulls-analogy",
      "status": "complete-eligible-inference-confirmed",
      "method": "Independent OpenAI automated transcription of the official publisher audio, aligned by exact surrounding utterances against canonical YouTube captions; no direct listening claim.",
      "callOrdinals": [
        4
      ],
      "results": [
        {
          "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-4.json",
          "sha256": "55d9922d6d28a59580e80352787f6578edaf206f72c4a5a8e4c703029fd3797f",
          "bytes": 1010
        }
      ],
      "attributionDecision": "Sean McDowell confirmed by sustained turn and surrounding handoffs; incidental voices are not owned by this move.",
      "finding": "Group inference confirmed: named Jordan plus Bulls is offered as information about the familiar team absent contrary evidence. Exact player names remain irrelevant and ineligible for rating or quotation. Paulogia immediately replaces nursery rhyme with creed and accepts its early date; neither the withdrawn label nor early-date denial may be attributed as his position.",
      "unresolvedMaterialUsedForJudgment": false
    },
    {
      "moveId": "con-deaths-mostly-limited",
      "status": "complete-eligible-inference-confirmed",
      "method": "Independent OpenAI automated transcription of the official publisher audio, aligned by exact surrounding utterances against canonical YouTube captions; no direct listening claim.",
      "callOrdinals": [
        5
      ],
      "results": [
        {
          "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-5.json",
          "sha256": "91814c0a2e96dc569f8932854ce8e13501aa05dcd6454ff0dcf4acbdd586a6a3",
          "bytes": 1111
        }
      ],
      "attributionDecision": "Paulogia confirmed by sustained turn and surrounding handoffs; incidental voices are not owned by this move.",
      "finding": "Peter/Paul sincerity concession confirmed. McDowell distinguishes Peter and James son of Zebedee within Twelve from James brother of Jesus and Paul outside Twelve; Andrew/Thomas lower confidence, remaining cases inconclusive. Paulogia explicitly speaks from memory and McDowell corrects identities, so ASR-corrupted names or labels are not independent grounds for penalty. The subsequent guilt/vision proposal is explicitly Paulogia’s hypothesis, not an established causal finding.",
      "unresolvedMaterialUsedForJudgment": false
    },
    {
      "moveId": "pro-graded-central-deaths",
      "status": "complete-eligible-inference-confirmed",
      "method": "Independent OpenAI automated transcription of the official publisher audio, aligned by exact surrounding utterances against canonical YouTube captions; no direct listening claim.",
      "callOrdinals": [
        5
      ],
      "results": [
        {
          "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-5.json",
          "sha256": "91814c0a2e96dc569f8932854ce8e13501aa05dcd6454ff0dcf4acbdd586a6a3",
          "bytes": 1111
        }
      ],
      "attributionDecision": "Sean McDowell confirmed by sustained turn and surrounding handoffs; incidental voices are not owned by this move.",
      "finding": "Peter/Paul sincerity concession confirmed. McDowell distinguishes Peter and James son of Zebedee within Twelve from James brother of Jesus and Paul outside Twelve; Andrew/Thomas lower confidence, remaining cases inconclusive. Paulogia explicitly speaks from memory and McDowell corrects identities, so ASR-corrupted names or labels are not independent grounds for penalty. The subsequent guilt/vision proposal is explicitly Paulogia’s hypothesis, not an established causal finding.",
      "unresolvedMaterialUsedForJudgment": false
    },
    {
      "moveId": "con-two-person-sincere-error",
      "status": "complete-eligible-inference-confirmed",
      "method": "Independent OpenAI automated transcription of the official publisher audio, aligned by exact surrounding utterances against canonical YouTube captions; no direct listening claim.",
      "callOrdinals": [
        5,
        6
      ],
      "results": [
        {
          "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-5.json",
          "sha256": "91814c0a2e96dc569f8932854ce8e13501aa05dcd6454ff0dcf4acbdd586a6a3",
          "bytes": 1111
        },
        {
          "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-6.json",
          "sha256": "6eb6b76443e0e5b06ef459d7f72b85af711f7ef495d40e28316e58d011baf6df",
          "bytes": 1267
        }
      ],
      "attributionDecision": "Paulogia confirmed by sustained turn and surrounding handoffs; incidental voices are not owned by this move.",
      "finding": "Peter/Paul sincerity concession confirmed. McDowell distinguishes Peter and James son of Zebedee within Twelve from James brother of Jesus and Paul outside Twelve; Andrew/Thomas lower confidence, remaining cases inconclusive. Paulogia explicitly speaks from memory and McDowell corrects identities, so ASR-corrupted names or labels are not independent grounds for penalty. The subsequent guilt/vision proposal is explicitly Paulogia’s hypothesis, not an established causal finding. Completes two-person sincere-belief alternative. Cultural-resistance/living-witness line confirmed; numeric population claims are asserted without demonstration here and should not be strengthened with outside support. Automated transcript renders 1,100 at sixty years and over 20,000 within thirty, but neither exact figure is quote-eligible or needed for the inventoried inference. Paulogia explicitly says he does not know whether the five-hundred sentence is from the thirties or fifties; preserve this as his uncertainty, not a mistaken claimed date. Practical anonymity/network and legend-growth objections confirmed. McDowell explicitly says his case does not rest on five hundred.",
      "unresolvedMaterialUsedForJudgment": false
    },
    {
      "moveId": "pro-cultural-resistance-and-living-witnesses",
      "status": "complete-eligible-inference-confirmed",
      "method": "Independent OpenAI automated transcription of the official publisher audio, aligned by exact surrounding utterances against canonical YouTube captions; no direct listening claim.",
      "callOrdinals": [
        6
      ],
      "results": [
        {
          "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-6.json",
          "sha256": "6eb6b76443e0e5b06ef459d7f72b85af711f7ef495d40e28316e58d011baf6df",
          "bytes": 1267
        }
      ],
      "attributionDecision": "Sean McDowell confirmed by sustained turn and surrounding handoffs; incidental voices are not owned by this move.",
      "finding": "Completes two-person sincere-belief alternative. Cultural-resistance/living-witness line confirmed; numeric population claims are asserted without demonstration here and should not be strengthened with outside support. Automated transcript renders 1,100 at sixty years and over 20,000 within thirty, but neither exact figure is quote-eligible or needed for the inventoried inference. Paulogia explicitly says he does not know whether the five-hundred sentence is from the thirties or fifties; preserve this as his uncertainty, not a mistaken claimed date. Practical anonymity/network and legend-growth objections confirmed. McDowell explicitly says his case does not rest on five hundred.",
      "unresolvedMaterialUsedForJudgment": false
    },
    {
      "moveId": "con-legends-can-grow-despite-checkability",
      "status": "complete-eligible-inference-confirmed",
      "method": "Independent OpenAI automated transcription of the official publisher audio, aligned by exact surrounding utterances against canonical YouTube captions; no direct listening claim.",
      "callOrdinals": [
        6
      ],
      "results": [
        {
          "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-6.json",
          "sha256": "6eb6b76443e0e5b06ef459d7f72b85af711f7ef495d40e28316e58d011baf6df",
          "bytes": 1267
        }
      ],
      "attributionDecision": "Paulogia confirmed by sustained turn and surrounding handoffs; incidental voices are not owned by this move.",
      "finding": "Completes two-person sincere-belief alternative. Cultural-resistance/living-witness line confirmed; numeric population claims are asserted without demonstration here and should not be strengthened with outside support. Automated transcript renders 1,100 at sixty years and over 20,000 within thirty, but neither exact figure is quote-eligible or needed for the inventoried inference. Paulogia explicitly says he does not know whether the five-hundred sentence is from the thirties or fifties; preserve this as his uncertainty, not a mistaken claimed date. Practical anonymity/network and legend-growth objections confirmed. McDowell explicitly says his case does not rest on five hundred.",
      "unresolvedMaterialUsedForJudgment": false
    },
    {
      "moveId": "con-status-motivation-proposal",
      "status": "complete-eligible-inference-confirmed",
      "method": "Independent OpenAI automated transcription of the official publisher audio, aligned by exact surrounding utterances against canonical YouTube captions; no direct listening claim.",
      "callOrdinals": [
        8
      ],
      "results": [
        {
          "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-8.json",
          "sha256": "1356ed7f554727fdcba79789214a8e49e7a3dbcdc692b591c336a50012f53fba",
          "bytes": 939
        }
      ],
      "attributionDecision": "Paulogia confirmed by sustained turn and surrounding handoffs; incidental voices are not owned by this move.",
      "finding": "Personal ministry and attention examples are an analogy for possible status motivation, not direct evidence of apostolic motives. Con expressly qualifies willingness to suffer and die with not necessarily. Do not turn a mixed-motive possibility into a demonstrated cause or infer absence of McDowell response; host-led response chain excluded.",
      "unresolvedMaterialUsedForJudgment": false
    }
  ],
  "source": {
    "videoId": "vJGRgxkzrjA",
    "publisherPage": "https://www.premier.plus/unbelievable/podcasts/episodes/are-martyred-apostles-good-evidence-for-the-resurrection-sean-mcdowell-vs-paulogia",
    "publicAudio": "https://pcr-od.streamguys1.com/the-unbelievable/20230302091934-unbelievable_08_may_2020_-_fate_of_the_apostles.mp3",
    "basis": "Same named guests, episode date and verbatim debate utterances; podcast has additional introductions and advertisements, so align by utterances rather than a fixed offset.",
    "youtubeAcquisitionLimitation": "Public caption acquisition succeeded; media transfer attempts returned HTTP 403. Official publisher public audio supplied verification excerpts."
  },
  "calls": [
    {
      "callOrdinal": 1,
      "preflight": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/cost-preflight.json",
        "sha256": "755525a31c607a8ce1d14cec5dbbbafbca7dd31f1494f1380f8c27b6b99d2dee",
        "bytes": 1770
      },
      "attemptRecord": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-attempt-1.json",
        "sha256": "4265c845258978c5694c105c4aa8c334f645ab3035729eb81edda54c360e2979",
        "bytes": 277
      },
      "result": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-1.json",
        "sha256": "51dbbe326c68c7c68980caf4b9fd53d76ba9d0bda395aa375dc700d8da18e720",
        "bytes": 568
      },
      "rawResult": {
        "path": ".assessment-cache/captions/vJGRgxkzrjA/criteria-verification.json",
        "sha256": "e317e12dcaca5323a3901c8697363857e89faadfefd91e985f854928de134ea3",
        "bytes": 4362
      },
      "media": {
        "path": ".assessment-cache/captions/vJGRgxkzrjA/publisher-criteria-context.mp3",
        "sha256": "f7f261da68004a4487858bc2d5f5b903e4a74c0711190be6b0ab60977787c283",
        "bytes": 1920357,
        "durationSeconds": 240.013061,
        "publisherCopyWindowSeconds": [
          480,
          720
        ],
        "canonicalVideoAlignmentMustBeVerifiedFromUtterances": true
      },
      "knownSuccessfulCallCostUsd": 0.00774,
      "paidRetries": 0
    },
    {
      "callOrdinal": 2,
      "preflight": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/cost-preflight-2.json",
        "sha256": "869a3a07fb86056037b26f1e9edcbc38125ba0cc8f6210242f68b832172df6c2",
        "bytes": 1136
      },
      "attemptRecord": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-attempt-2.json",
        "sha256": "5b35e81546c38578786acfb8fc7d9bb6ecc43d2d5c41f899d72fafe06d3b04bd",
        "bytes": 206
      },
      "result": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-2.json",
        "sha256": "dac7b7235dbebb666673212db263acdea8c140f233f096ec96f5b67ceefa0168",
        "bytes": 1171
      },
      "rawResult": {
        "path": ".assessment-cache/captions/vJGRgxkzrjA/criteria-aligned-verification.json",
        "sha256": "9f55710ea6db77576e97462007ea0ce6e99e10cf919eec2daccc28535b0d41df",
        "bytes": 1681
      },
      "media": {
        "path": ".assessment-cache/captions/vJGRgxkzrjA/publisher-criteria-aligned.mp3",
        "sha256": "3b3b83d024009527683c76a89069cc258f6511f487395f4902443d6e4a6f2677",
        "bytes": 720396,
        "durationSeconds": 90,
        "publisherWindowSeconds": [
          915,
          1005
        ]
      },
      "knownSuccessfulCallCostUsd": 0.00282125,
      "paidRetries": 0
    },
    {
      "callOrdinal": 3,
      "preflight": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/cost-preflight-3.json",
        "sha256": "711e7adb750546ce02406a536d7586fcc27cdca8900d83e79ea12a1218af027f",
        "bytes": 905
      },
      "attemptRecord": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-attempt-3.json",
        "sha256": "2ad1e9a473074c5765c9bf2313b9e7eaf3e161ac99d739fcb65d9366a9143b87",
        "bytes": 206
      },
      "result": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-3.json",
        "sha256": "195b9275e3d8cce1dad530e91602821b285803f0900e1a47643d9d33ae9ee9ad",
        "bytes": 1014
      },
      "rawResult": {
        "path": ".assessment-cache/captions/vJGRgxkzrjA/source-claims-verification.json",
        "sha256": "023a646c2ba5ce9f1737959c6b967da7ae77efcb05e024f93da5bdcf0a06b148",
        "bytes": 4492
      },
      "media": {
        "path": ".assessment-cache/captions/vJGRgxkzrjA/publisher-source-claims.mp3",
        "sha256": "a91df53d0cb0f584d9bbfbf71eb6ea26aa822c70485c599dd34c9e438d832644",
        "bytes": 2160475,
        "durationSeconds": 270,
        "publisherWindowSeconds": [
          2090,
          2360
        ]
      },
      "knownSuccessfulCallCostUsd": 0.00840125,
      "paidRetries": 0
    },
    {
      "callOrdinal": 4,
      "preflight": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/cost-preflight-4.json",
        "sha256": "d1199d9ae32eacb62fb63c112955ffe1b68589aaa5f512a30b3ed85b0bb43eb7",
        "bytes": 850
      },
      "attemptRecord": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-attempt-4.json",
        "sha256": "ecabee3d5fbb80fecabd2136e95ca68d5aa143614fb127d42c7df14b8e642efd",
        "bytes": 206
      },
      "result": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-4.json",
        "sha256": "55d9922d6d28a59580e80352787f6578edaf206f72c4a5a8e4c703029fd3797f",
        "bytes": 1010
      },
      "rawResult": {
        "path": ".assessment-cache/captions/vJGRgxkzrjA/group-analogy-verification.json",
        "sha256": "a766f7badd093dee4b200b04f4790a06b0581114adccb2eb2a38a9176658118d",
        "bytes": 2752
      },
      "media": {
        "path": ".assessment-cache/captions/vJGRgxkzrjA/publisher-group-analogy.mp3",
        "sha256": "7b9fbff471b5b00ba01401ffb86cb2ece2492ad25204d1367ca5c9c21d250312",
        "bytes": 1280462,
        "durationSeconds": 160,
        "publisherWindowSeconds": [
          2440,
          2600
        ]
      },
      "knownSuccessfulCallCostUsd": 0.0049625,
      "paidRetries": 0
    },
    {
      "callOrdinal": 5,
      "preflight": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/cost-preflight-5.json",
        "sha256": "f64858a9aba74c6c452251cf4bd4d8bf0e45cb721937e81f9653eec440b0544d",
        "bytes": 912
      },
      "attemptRecord": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-attempt-5.json",
        "sha256": "eab78f2c628fb734f2993ebc1bc4e12de9866e34bfbf139f549287cc4f6a0b30",
        "bytes": 206
      },
      "result": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-5.json",
        "sha256": "91814c0a2e96dc569f8932854ce8e13501aa05dcd6454ff0dcf4acbdd586a6a3",
        "bytes": 1111
      },
      "rawResult": {
        "path": ".assessment-cache/captions/vJGRgxkzrjA/death-evidence-verification.json",
        "sha256": "213d82c3959bd8ca0b47f7f9e885c9aadf1ef09398870be20e062ba6294b7058",
        "bytes": 5735
      },
      "media": {
        "path": ".assessment-cache/captions/vJGRgxkzrjA/publisher-death-evidence.mp3",
        "sha256": "811ade40a49b16db5cac79151051c68261329929b1f8daee4c173083742b10bb",
        "bytes": 2720540,
        "durationSeconds": 340,
        "publisherWindowSeconds": [
          2680,
          3020
        ]
      },
      "knownSuccessfulCallCostUsd": 0.01064125,
      "paidRetries": 0
    },
    {
      "callOrdinal": 6,
      "preflight": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/cost-preflight-6.json",
        "sha256": "c46081a6745f14975b1221ed9b6dc9d46e48974e10de1538ff1de002301713b4",
        "bytes": 918
      },
      "attemptRecord": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-attempt-6.json",
        "sha256": "945f3f9fdffce38ccc56bcf6ceacf000c36c8c2b7623dc5c5fe2700e50d5835e",
        "bytes": 206
      },
      "result": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-6.json",
        "sha256": "6eb6b76443e0e5b06ef459d7f72b85af711f7ef495d40e28316e58d011baf6df",
        "bytes": 1267
      },
      "rawResult": {
        "path": ".assessment-cache/captions/vJGRgxkzrjA/checkability-verification.json",
        "sha256": "444045c5d3074ee9eac691447d968a94d237b0ba2f2a2dc748455865af8a66e0",
        "bytes": 5496
      },
      "media": {
        "path": ".assessment-cache/captions/vJGRgxkzrjA/publisher-checkability.mp3",
        "sha256": "859c6a1d09e69a34785d7f259bc5ff5347be6b42f346ae177e3a337543e02c51",
        "bytes": 2640501,
        "durationSeconds": 330,
        "publisherWindowSeconds": [
          3020,
          3350
        ]
      },
      "knownSuccessfulCallCostUsd": 0.01017875,
      "paidRetries": 0
    },
    {
      "callOrdinal": 7,
      "preflight": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/cost-preflight-7.json",
        "sha256": "a55ec1671cbc6c7651d0a89c279af19a5f80dacaf3b2c6f3ce1be89538bc4a8e",
        "bytes": 916
      },
      "attemptRecord": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-attempt-7.json",
        "sha256": "402162b22c939ecdf613b2bbf9dba036f4646c337710ab38db6e78c377e652e4",
        "bytes": 206
      },
      "result": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-7.json",
        "sha256": "955fd4ef33315c51d7d4b9fe9b21cd1a6906cddb7c2f090548853510ba295094",
        "bytes": 880
      },
      "rawResult": {
        "path": ".assessment-cache/captions/vJGRgxkzrjA/motivation-verification.json",
        "sha256": "ea409af5148a16822098acca406db9b190b1dc4528426f4867cc1dc90a8188c0",
        "bytes": 4228
      },
      "media": {
        "path": ".assessment-cache/captions/vJGRgxkzrjA/publisher-motivation.mp3",
        "sha256": "483ed1f2f0d08a44e2120e3abcddd2ef39a247564774103df120afaee216f69d",
        "bytes": 1920358,
        "durationSeconds": 240,
        "publisherWindowSeconds": [
          3720,
          3960
        ]
      },
      "knownSuccessfulCallCostUsd": 0.007495,
      "paidRetries": 0
    },
    {
      "callOrdinal": 8,
      "preflight": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/cost-preflight-8.json",
        "sha256": "db20abcf930f8c3259ac4d0a0c7b5a5e7d93af90ea18f543f0e4894978950bd7",
        "bytes": 966
      },
      "attemptRecord": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-attempt-8.json",
        "sha256": "08f842ae1bfae5ef30aec0141becfe3476ec357b9267a91c9cd7245e2d9f92c8",
        "bytes": 206
      },
      "result": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-293/audio/paid-call-result-8.json",
        "sha256": "1356ed7f554727fdcba79789214a8e49e7a3dbcdc692b591c336a50012f53fba",
        "bytes": 939
      },
      "rawResult": {
        "path": ".assessment-cache/captions/vJGRgxkzrjA/motivation-aligned-verification.json",
        "sha256": "a8a8276df9294b7bf3c3e61e73b9707f2feb80031d1e4cc201961c4627aa4a95",
        "bytes": 2823
      },
      "media": {
        "path": ".assessment-cache/captions/vJGRgxkzrjA/publisher-motivation-aligned.mp3",
        "sha256": "3d069ab1201edb6484172a84dd6eef5cfe364198cd1d12f144b555c2b8bd20e7",
        "bytes": 1240547,
        "durationSeconds": 155,
        "publisherWindowSeconds": [
          3960,
          4115
        ]
      },
      "knownSuccessfulCallCostUsd": 0.00497375,
      "paidRetries": 0
    }
  ],
  "cost": {
    "model": "gpt-4o-mini-transcribe",
    "knownSuccessfulCallCostUsd": 0.05721375,
    "maximumPossibleTotalCostUsd": 0.05721375,
    "directCostUsd": 0.05721375,
    "paidCalls": 8,
    "uncertainCalls": 0,
    "failedPaidCalls": 0,
    "automaticRetries": 0,
    "communicatedCumulativeEstimateUsd": 0.1,
    "authorizedRunCapUsd": 1,
    "withinCommunicatedEstimate": true
  },
  "wordingLimitations": [
    "Independent automated transcripts are verification evidence, not direct listening.",
    "The criteria phrase chose not to die remains literally uncertain and must not be silently inverted, quoted, treated as an independent premise or penalized. Clear eyewitness/recantation/actual-death distinction remains eligible.",
    "Exact garbled player names, probability labels and numerical consensus/population estimates do not independently justify a rating or exact quotation.",
    "Earlier caption-only notes remain historical records; these completed checks qualify their initial warnings. Source scope and original caption bytes remain unchanged."
  ],
  "audit": {
    "requiredAttributionChecks": 9,
    "completedAttributionChecks": 9,
    "unresolvedAttributionChecks": 0,
    "unresolvedMaterialWordingsExcludedFromJudgment": true,
    "directAudioListeningClaimed": false,
    "originalCaptionChainUnchanged": true,
    "allScopeExclusionsUnchanged": true
  }
}
