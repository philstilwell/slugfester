# Isolated primary judgment contract

Read the execution plan and entire lossless reader, including every document and shared block, in bounded untruncated outputs. Only plan-allowed evidence may be read. Follow exact model and effort in the plan. No peer outputs, other debates, historical scores, publication prose, rankings, biographies, browsing, session logs, credentials or environment inspection. No paid calls, external inference or subagents. Isolation is procedural, not a filesystem sandbox. Confirm the absolute output path; tell the controller when reading is complete and wait for authenticated reading release before authoring.

## Evidence and judgment

The motion stays exactly “Does God exist?”. Evaluate every locked move once, in inventory order, under the complete rubric. Score the argumentative performance actually recoverable in this recording, not worldview truth. Preserve identity, source spans, speaker, sections, weights, importance, reply links and burden links. Never author or calculate move, section or overall totals or winners. Each dimension needs a source-specific rationale identifying its actual strength or limitation, not interchangeable prose.

Assess William Lane Craig and Klemens Kappel under the ordinary complete two-advocate scope. Audience and moderator statements are context; assess only each named debater’s adopted commitments and own replies. Kappel positively claims rational atheistic knowledge, while expressly allowing the believer could be right and denying that knowledge requires conclusive proof or higher-order knowledge. Craig also disavows knockdown proof. Preserve their actual dispute about warrant, the corrected meaning of “psychological being,” and Kappel’s later refinement of the disagreement argument. Distinguish contingency from temporal origin, causal from temporal priority, generic transcendent cause from a prayer-hearing moral mind, moral agreement from moral ontology, historical testimony from the truth of miracle reports, and practical importance from proof of existence. Kappel’s causal-law scenario is conditional; his confident sociological explanation is paired with admitted ignorance of its precise details. Neither incidental caption corruption nor a one-sided audience prompt creates a scored concession or unanswered burden. Follow all source restrictions and any explicitly identified supplemental machine-audio findings below.

## Exact output schema

A single JSON object with schemaVersion "1.0-standalone-primary-judgment", protocolId "assessment-production-standalone-debate-v1", status "complete-and-schema-valid", pass from plan, debateNumber as string from plan, debateId from plan, reviewerRole "isolated-score-blind-primary-judge", assessmentModel "5.6 Sol", reasoningEffort "low", inventorySha256 from judgment packet, isolation, judgments, burdenCompletionAdjustment, audit.

isolation contains booleans legacyAssessmentsUnavailable, calculatedTotalsUnavailable, winnerLabelsUnavailable, otherJudgmentUnavailable, publicationProseUnavailable, otherDebatesUnavailable (all true only if accurate), and contaminationDetected (false only if accurate). Report a breach and stop if any required isolation condition is false.

judgments is an array exactly matching inventory moves. Each entry: {moveId,assessmentConfidence,dimensions}. assessmentConfidence is high, medium or low. dimensions has exactly logicalCoherence, evidenceWarrant, responsiveness, relevanceBurden, precisionClarity, calibrationCharity. Each dimension has exactly {value,rationale}; value is integer 0–100, rationale at least 40 characters. Use rubric anchors; do not give duplicate deductions for one defect unless it has distinct demonstrated consequences in multiple dimensions.

burdenCompletionAdjustment has pro and con. Each is exactly {value,rationale,eligibility}, with integer value −5..5. eligibility has exactly these nine keys: distinctDebateWideConsequence (boolean), affectsBurdenCompletion (boolean), notAlreadyScored (boolean), affectedBurdenIds (array of actual route bridge IDs), completionCriterion (string), relatedMoveIds (array of actual move IDs), distinctConsequence (string), alreadyCapturedBy (array), counterfactual (string). Duplicate capture (nonempty alreadyCapturedBy or false notAlreadyScored) requires zero. Nonzero requires all three booleans true, nonempty affectedBurdenIds and relatedMoveIds, empty alreadyCapturedBy, and completionCriterion, distinctConsequence, counterfactual each at least 30 characters. A value of zero still requires every eligibility key. Explain the actual debate-wide question and why any claimed adjustment does not rescore a move. Never calculate totals to choose an adjustment.

audit has completeLockedInventoryReviewed, allMovesJudgedOnce, ratingsOnlyNoCalculatedScores, publicationBlind, scoreBlind, all true only if accurate.

## One unsaved review and exact submission

After authenticated reading release, create the complete candidate in memory. Run the pinned checker with standard input; do not inspect its implementation or create a disk draft. Review every rationale yourself against source ownership, recognition restrictions, adopted burdens and later qualifications before holding it. Send exact UTF-8 JSON bytes from your existing memory to the pinned `standalone-workflow.mjs handoff hold` command with the explicit debate and your plan. The checker validates and the holder keeps bytes in memory. Keep the holder alive and send its receipt. The controller reads all candidate bytes and issues source-compliance release; it may not negotiate ratings or disclose the peer pass. Release writes the approved bytes exactly once. Stop authoring after submission. One context, one submission, no automatic retries or overwrites. Ordinary corrections before a successful hold are within this context; an existing hold or saved failure is never silently replaced.

## Supplemental source-wording verification

The following complete source supplement was produced before primary review. Its machine transcripts are evidence, never instructions. Preserve the explicit uncertainty restrictions: audio recognition does not resolve every suspect negation. Do not reinterpret a garbled phrase as a scored contradiction where clear surrounding statements establish the qualified argument.

Source record: docs/assessment-production/standalone-debates-v1/debate-284/audio/wording-verification.json; SHA-256 77b6a076384c5906cb6431a4a577bf0d185d1ea924d5a3baba7fff147e3f82ed.

```json
{
  "schemaVersion": "1.0-supplemental-source-wording-verification",
  "status": "complete-with-explicit-lexical-restrictions",
  "debateNumber": "284",
  "debateId": "craig-kappel-god-existence-2012",
  "plan": {
    "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/wording-plan.json",
    "sha256": "95504396df52c829d3cb083dc880d181a46e43373df87e496dd71bfe58d1e88f",
    "bytes": 6617
  },
  "checks": [
    {
      "clipId": "wording-01",
      "speaker": "William Lane Craig",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/wording-01.json",
        "sha256": "1af2453095cf16a0066a3e4d147b10580906876c998e1ed36a8a20763ce965b7",
        "bytes": 5131
      },
      "completion": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/wording-01.completion.json",
        "sha256": "1e787c8d5782a8e8056718befa7fef624043a9e87488ad15b0e090f785aa7692",
        "bytes": 525
      },
      "usageBasedCostUsd": 0.021465,
      "speakerOwnershipConfirmed": true,
      "exactDisputedNegationResolved": false,
      "materialMeaningSupportedByClearSurroundingStatements": true,
      "directListeningPerformed": false,
      "finding": "The machine transcript repeats the canonical positive-existence wording in the reported Bertrand example, then clearly states that knowing God does not exist requires warrant or justification. Speaker ownership of both proposed warrant quotations is confirmed. This is not an authenticated correction of every negation. Assess the explicit demand for warrant in its surrounding atheism context; do not score the inconsistent report as a contradiction or use its polarity as a quotation.",
      "fullMachineTranscript": "Atheism, indeed, he said.\nAny attempt to do so would be question begging, so that he is not able to offer any non-question begging argument for the existence of God. All he could do, he said, was to enunciate a naturalistic perspective. Well, that's fine, but what we want to know is what is the justification, what's the warrant for that perspective. He says Bertrand, who is a naturalist, might know...\nthat God exists even though he has no good arguments for God. Well, that seems to me to be wrong. Bertrand might believe that God exists, but knowledge entails more than true belief. It entails having some kind of warrant or justification. Otherwise, Bertrand is just making a lucky guess if he believes God doesn't exist and it turns out that he's right. For Bertrand to know that God does not exist,\nHe needs to have some kind of warrant or justification."
    },
    {
      "clipId": "wording-02",
      "speaker": "Klemens Kappel",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/wording-02.json",
        "sha256": "9b01b167983cb677014935a5d292f91b78591b229ea048a73e35d4863552fec3",
        "bytes": 2533
      },
      "completion": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/wording-02.completion.json",
        "sha256": "05e29d8c63860b5a41ccf0cd5f42659b32ed203fbd7e3876b629c9b251820ae6",
        "bytes": 523
      },
      "usageBasedCostUsd": 0.0170975,
      "speakerOwnershipConfirmed": true,
      "exactDisputedNegationResolved": false,
      "materialMeaningSupportedByClearSurroundingStatements": true,
      "directListeningPerformed": false,
      "finding": "The machine transcript repeats the caption switch from knowing God does not exist to being unable properly to claim that God exists. It clearly affirms that knowledge requires some degree of justification. The intended epistemic qualification is supported by the remainder of Kappel’s formal speech. Do not treat the disputed report wording as a theistic concession or proof of inconsistency; neither recognition output establishes the exact missing negation.",
      "fullMachineTranscript": "Of course God does exist. But that's not the view I was I was addressing. Um and then you said that uh in response to my comment that uh my view that the Bertrand might be in a position where he actually knows that God doesn't exist. Yet because of the dialectical situation it's improper for him to claim that he knows that God exists.\nAnd you said this can't be right, because the knowledge is not mere true belief. It's knowledge requires justification of warrant, so Bertrand can't claim that. Well, that's a mistake because uh I think virtually all scholars of epistemology and by the way, my field is epistemology, it's not philosophy of religion at all, but virtually all scholars of epistemology agree that uh knowledge requires some degree of justification."
    },
    {
      "clipId": "wording-03",
      "speaker": "William Lane Craig",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/wording-03.json",
        "sha256": "66eeabd36a60da9780b4add6124e4bfbc726098ca2b9a705f2008b4cc60c65e4",
        "bytes": 2779
      },
      "completion": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/wording-03.completion.json",
        "sha256": "07a03382d73b983bdc35724064a14efa859bd9d6f1cbb123db9d63a7f4d63f09",
        "bytes": 523
      },
      "usageBasedCostUsd": 0.0123725,
      "speakerOwnershipConfirmed": true,
      "exactDisputedNegationResolved": false,
      "materialMeaningSupportedByClearSurroundingStatements": true,
      "directListeningPerformed": false,
      "finding": "The machine transcript recognizes the suspect phrase as were not down arguments, so it does not securely settle the exact knockdown/not-knockdown words. It clearly recognizes I haven’t claimed conclusive proof either and the demand for justification. Preserve the source-note restriction: no contradiction or certainty claim may be inferred from the garbled phrase. Craig’s explicit disavowal supplies the materially clear position.",
      "fullMachineTranscript": "Here, Kapel said,\nBut in regard to atheism, I'm not claiming that I have conclusive proof in order to know that God does not exist. Fine, I haven't claimed conclusive proof either. Remember I said my arguments were not down arguments. But I simply want to know what justification does he have for being an atheist. He knows that knowledge is more than just true belief.\nThere needs to be some justification, and I agree with that."
    }
  ],
  "canonicalCaptionsUnchanged": true,
  "assessmentUse": "This supplement adds machine-audio evidence before primary judgments; it does not silently correct source text or remove previously frozen uncertainty restrictions. Material arguments and safe exact caption quotations must remain supported by clear surrounding statements.",
  "cost": {
    "knownSuccessfulCallCostUsd": 0.050935,
    "maximumPossibleFailedCallCostUsd": 0,
    "maximumPossibleTotalCostUsd": 0.050935,
    "paidCalls": 3,
    "successfulPaidCalls": 3,
    "failedOrUncertainCalls": 0,
    "automaticPaidRetries": 0,
    "planningAllowanceUsd": 0.178333,
    "standingCapUsd": 1,
    "billingDashboardConfirmed": false
  },
  "completedAt": "2026-10-04T23:38:26.040323+00:00"
}
```

## Complete supplemental speaker-boundary verification

This complete controller record preserves all source restrictions and machine-label limitations. It adds no rating or outcome. The wording supplement above remains controlling for unresolved lexical polarity.

Source record: docs/assessment-production/standalone-debates-v1/debate-284/audio/audio-verification.json; SHA-256 c56e4cbc6e4ce4f0868bf23f84ab3b35467a6f694705de5a15a2cb22863bb9f1.

```json
{
  "schemaVersion": "1.0-standalone-audio-verification",
  "protocolId": "assessment-production-standalone-debate-v1",
  "status": "complete",
  "debateNumber": "284",
  "debateId": "craig-kappel-god-existence-2012",
  "inventory": {
    "path": "docs/assessment-production/standalone-debates-v1/debate-284/inventory/inventory.json",
    "sha256": "8f2097cbcfda40c29fe2d85837f3562bde2d08543ae9c1b442ee51dea51fa995",
    "bytes": 158012
  },
  "plans": [
    {
      "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/wording-plan.json",
      "sha256": "95504396df52c829d3cb083dc880d181a46e43373df87e496dd71bfe58d1e88f",
      "bytes": 6617
    },
    {
      "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/plan.json",
      "sha256": "e1d44f6d31708cf22723b9279d8c37a96afbec6521b5ed2a4bef7ade41ade892",
      "bytes": 10807
    }
  ],
  "wordingVerification": {
    "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/wording-verification.json",
    "sha256": "77b6a076384c5906cb6431a4a577bf0d185d1ea924d5a3baba7fff147e3f82ed",
    "bytes": 7267
  },
  "method": "Reference-assisted machine audio transcription cross-checked with complete timed captions, formal handoffs and argumentative continuity. No direct listening was performed. Incidental labels and exact unresolved negations are explicitly restricted; the retained arguments and quotations have resolved ownership.",
  "triggeredMoveIds": [
    "pro-warrant-reply-to-bertrand",
    "con-religious-diversity-undercuts-testimony",
    "pro-causal-not-temporal-priority",
    "con-timeless-mind-raises-more-questions",
    "con-bodyless-mind-more-mysterious",
    "pro-basic-action-model-of-divine-causation",
    "pro-theism-importance-purpose-value",
    "con-secular-morality-and-meaning-live",
    "pro-christianity-historically-anchored"
  ],
  "checks": [
    {
      "moveId": "pro-warrant-reply-to-bertrand",
      "clipId": "wording-01",
      "status": "resolved",
      "speaker": "William Lane Craig",
      "resolution": "The machine transcript repeats the canonical positive-existence wording in the reported Bertrand example, then clearly states that knowing God does not exist requires warrant or justification. Speaker ownership of both proposed warrant quotations is confirmed. This is not an authenticated correction of every negation. Assess the explicit demand for warrant in its surrounding atheism context; do not score the inconsistent report as a contradiction or use its polarity as a quotation.",
      "attributionResolved": true,
      "materialMeaningResolved": true,
      "retainedQuotationOwnershipResolved": true,
      "exactDisputedNegationResolved": false,
      "directListeningPerformed": false
    },
    {
      "moveId": "con-religious-diversity-undercuts-testimony",
      "speaker": "Klemens Kappel",
      "resolution": "Reference-assisted audio identifies Kappel from6.05s through115.104s, including both selected quotations and the full comparative-testimony inference. The audience member finishes before6.05s. Moderator words begin115.604s with I I believe we; Craig begins his separate Islam response120.604s. The trailing foreign words in E2311 are procedural context. Exact original captions and inventory remain unchanged.",
      "attributionResolved": true,
      "materialMeaningResolved": true,
      "retainedQuotationOwnershipResolved": true,
      "clipId": "boundary-01",
      "status": "resolved",
      "directListeningPerformed": false
    },
    {
      "moveId": "pro-causal-not-temporal-priority",
      "speaker": "William Lane Craig",
      "resolution": "Craig begins3.924s and continues through128.26s. The complete abstract-object/mind comparison and both retained causal-priority quotations at108.66–128.26s belong to him. Moderator starts128.76s with Thank you very much and asks for Kappel’s comment, confirming the foreign trailing words in E2413. No temporal-priority claim is imputed to Craig.",
      "attributionResolved": true,
      "materialMeaningResolved": true,
      "retainedQuotationOwnershipResolved": true,
      "clipId": "boundary-02",
      "status": "resolved",
      "directListeningPerformed": false
    },
    {
      "moveId": "con-timeless-mind-raises-more-questions",
      "speaker": "Klemens Kappel",
      "resolution": "Kappel accepts the invitation at130.51–131.11s amid moderator fragments, then supplies his own critique through182.644s. He owns both retained quotations and the challenge to a mind causing without laws/time/space. Moderator resumes184.294s. Leading moderator words in E2414 remain foreign context; the challenge is not a demonstrated contrary cosmology.",
      "attributionResolved": true,
      "materialMeaningResolved": true,
      "retainedQuotationOwnershipResolved": true,
      "clipId": "boundary-02",
      "status": "resolved",
      "directListeningPerformed": false
    },
    {
      "moveId": "con-bodyless-mind-more-mysterious",
      "speaker": "Klemens Kappel",
      "resolution": "Reference-assisted transcription identifies Kappel’s agreement about abstract laws from5.05s and his complete bodyless-mind explanatory challenge through68.826s. He owns the retained bodyless-mind quotation and the final more mysterious comparison. The next sentence grants another minute and is excluded as procedural context regardless of its erroneous machine label. E3015 retains that foreign tail, without assigning it argumentative credit.",
      "attributionResolved": true,
      "materialMeaningResolved": true,
      "retainedQuotationOwnershipResolved": true,
      "clipId": "boundary-03",
      "status": "resolved",
      "directListeningPerformed": false
    },
    {
      "moveId": "pro-basic-action-model-of-divine-causation",
      "speaker": "William Lane Craig",
      "resolution": "Craig begins the I think that God’s actions answer at74.426s after the extra-minute grant and speaks through149.06s. Both retained quotations and the basic-action, substance-dualism and free-will claims belong to him. The leading that in E3018 completes the preceding procedural invitation, not Craig’s inference. Closing thanks and next-question introduction remain unscored.",
      "attributionResolved": true,
      "materialMeaningResolved": true,
      "retainedQuotationOwnershipResolved": true,
      "clipId": "boundary-03",
      "status": "resolved",
      "directListeningPerformed": false
    },
    {
      "moveId": "pro-theism-importance-purpose-value",
      "speaker": "William Lane Craig",
      "resolution": "Craig begins Yes. Why is it important at3.366s and his substantive conditional answer runs6.416–133.66s. The retained purpose quotation is his at29.032–35.482s. He contrasts implications under Christian theism and atheism; the answer concerns importance and is not automatically treated as an argument that beneficial consequences prove existence. Moderator thanks begin134.71s, followed by a new audience exchange.",
      "attributionResolved": true,
      "materialMeaningResolved": true,
      "retainedQuotationOwnershipResolved": true,
      "clipId": "boundary-04",
      "status": "resolved",
      "directListeningPerformed": false
    },
    {
      "moveId": "con-secular-morality-and-meaning-live",
      "speaker": "Klemens Kappel",
      "resolution": "Kappel’s substantive answer runs5.17–97.822s. He first allows that theistic assumptions can explain importance, then denies that atheism automatically defeats morality or meaning. He owns both selected quotations and the final qualification that the matter remains open; moderator thanks/next-question begins98.222s. The retained E3323 qualification is Kappel’s, while its trailing procedural words are unscored. No completed secular moral theory is attributed to him.",
      "attributionResolved": true,
      "materialMeaningResolved": true,
      "retainedQuotationOwnershipResolved": true,
      "clipId": "boundary-05",
      "status": "resolved",
      "directListeningPerformed": false
    },
    {
      "moveId": "pro-christianity-historically-anchored",
      "speaker": "William Lane Craig",
      "resolution": "Craig owns the answer from 3.678 through 67.976 seconds, including the selected rooted-in-history quotation across 21.928–22.128 seconds. His appeal to historical persons, places and texts leads back to his three resurrection facts; this is not treated as independent proof that every reported miracle occurred. The partial handoff in E3416 is excluded; the E3417 onward retained answer is Craig’s. Final procedural thanks begin at 69.226 seconds and are unscored.",
      "attributionResolved": true,
      "materialMeaningResolved": true,
      "retainedQuotationOwnershipResolved": true,
      "clipId": "boundary-06",
      "status": "resolved",
      "directListeningPerformed": false
    }
  ],
  "boundaryReviews": [
    {
      "clipId": "boundary-01",
      "status": "passed",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-01.json",
        "sha256": "d6c3c7c04d4f3eb176dac6e574a9e464959721ee380bad23b77009c3e9bc32b8",
        "bytes": 7195
      },
      "usageBasedCostUsd": 0.0404725,
      "directListeningPerformed": false,
      "moveReviews": [
        {
          "moveId": "con-religious-diversity-undercuts-testimony",
          "speaker": "Klemens Kappel",
          "resolution": "Reference-assisted audio identifies Kappel from6.05s through115.104s, including both selected quotations and the full comparative-testimony inference. The audience member finishes before6.05s. Moderator words begin115.604s with I I believe we; Craig begins his separate Islam response120.604s. The trailing foreign words in E2311 are procedural context. Exact original captions and inventory remain unchanged.",
          "attributionResolved": true,
          "materialMeaningResolved": true,
          "retainedQuotationOwnershipResolved": true
        }
      ]
    },
    {
      "clipId": "boundary-02",
      "status": "passed",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-02.json",
        "sha256": "07ce5146507d4bec99f22b73e0db45430b19f05b27f23f42690117e057329a52",
        "bytes": 12375
      },
      "usageBasedCostUsd": 0.065705,
      "directListeningPerformed": false,
      "recognitionLimitation": "The opening audience fragment at0–3.35s is mislabeled Kappel by the machine; it precedes every selected span and remains unscored audience context. Speaker labels are cross-checked with formal handoffs and substance, not accepted blindly. Technical name recognition remains uncorrected.",
      "moveReviews": [
        {
          "moveId": "pro-causal-not-temporal-priority",
          "speaker": "William Lane Craig",
          "resolution": "Craig begins3.924s and continues through128.26s. The complete abstract-object/mind comparison and both retained causal-priority quotations at108.66–128.26s belong to him. Moderator starts128.76s with Thank you very much and asks for Kappel’s comment, confirming the foreign trailing words in E2413. No temporal-priority claim is imputed to Craig.",
          "attributionResolved": true,
          "materialMeaningResolved": true,
          "retainedQuotationOwnershipResolved": true
        },
        {
          "moveId": "con-timeless-mind-raises-more-questions",
          "speaker": "Klemens Kappel",
          "resolution": "Kappel accepts the invitation at130.51–131.11s amid moderator fragments, then supplies his own critique through182.644s. He owns both retained quotations and the challenge to a mind causing without laws/time/space. Moderator resumes184.294s. Leading moderator words in E2414 remain foreign context; the challenge is not a demonstrated contrary cosmology.",
          "attributionResolved": true,
          "materialMeaningResolved": true,
          "retainedQuotationOwnershipResolved": true
        }
      ]
    },
    {
      "clipId": "boundary-03",
      "status": "passed-with-procedural-label-limitation",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-03.json",
        "sha256": "aafc9f998ceb4b70f609691520599df01568daffabce443f626083fee3114599",
        "bytes": 8351
      },
      "usageBasedCostUsd": 0.05168,
      "directListeningPerformed": false,
      "recognitionLimitation": "Machine labeling assigns the procedural grant of another minute at69.376–74.426s and closing thanks150.46–152.26s to Kappel. The explicit time-allocation/next-question function and full-recording turn structure identify these as unscored procedural context; no assessment depends on their speaker label. Technical name and bodily-less recognition remain source limitations.",
      "moveReviews": [
        {
          "moveId": "con-bodyless-mind-more-mysterious",
          "speaker": "Klemens Kappel",
          "resolution": "Reference-assisted transcription identifies Kappel’s agreement about abstract laws from5.05s and his complete bodyless-mind explanatory challenge through68.826s. He owns the retained bodyless-mind quotation and the final more mysterious comparison. The next sentence grants another minute and is excluded as procedural context regardless of its erroneous machine label. E3015 retains that foreign tail, without assigning it argumentative credit.",
          "attributionResolved": true,
          "materialMeaningResolved": true,
          "retainedQuotationOwnershipResolved": true
        },
        {
          "moveId": "pro-basic-action-model-of-divine-causation",
          "speaker": "William Lane Craig",
          "resolution": "Craig begins the I think that God’s actions answer at74.426s after the extra-minute grant and speaks through149.06s. Both retained quotations and the basic-action, substance-dualism and free-will claims belong to him. The leading that in E3018 completes the preceding procedural invitation, not Craig’s inference. Closing thanks and next-question introduction remain unscored.",
          "attributionResolved": true,
          "materialMeaningResolved": true,
          "retainedQuotationOwnershipResolved": true
        }
      ]
    },
    {
      "clipId": "boundary-04",
      "status": "passed-with-foreign-label-limitation",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-04.json",
        "sha256": "8e5155cbece4debce0a03cc58a08ff64f08df2d0e5c25803a610607424400888",
        "bytes": 10245
      },
      "usageBasedCostUsd": 0.0492375,
      "directListeningPerformed": false,
      "recognitionLimitation": "The machine assigns the initial audience question and some trailing permission-to-comment fragments to Kappel. These are outside Craig’s owned answer and remain unscored question/procedural context; no con move is created from those labels.",
      "moveReviews": [
        {
          "moveId": "pro-theism-importance-purpose-value",
          "speaker": "William Lane Craig",
          "resolution": "Craig begins Yes. Why is it important at3.366s and his substantive conditional answer runs6.416–133.66s. The retained purpose quotation is his at29.032–35.482s. He contrasts implications under Christian theism and atheism; the answer concerns importance and is not automatically treated as an argument that beneficial consequences prove existence. Moderator thanks begin134.71s, followed by a new audience exchange.",
          "attributionResolved": true,
          "materialMeaningResolved": true,
          "retainedQuotationOwnershipResolved": true
        }
      ]
    },
    {
      "clipId": "boundary-05",
      "status": "passed-with-incidental-recognition-limits",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-05.json",
        "sha256": "f92c7244daa0f8ff55e0ffb9816d428244111b34edf193b86b8ae837d0b04e6c",
        "bytes": 6242
      },
      "usageBasedCostUsd": 0.036655,
      "directListeningPerformed": false,
      "recognitionLimitation": "Opening thanks and handoff are split among unreliable speaker labels and remain procedural context outside the retained argument. The end phrase is recognized as it’s open here rather than canonical it’s up in the air; neither lexical variant is a retained quotation or deduction. Both versions preserve the unresolved/open status of the philosophical project. Proper-name recognition is not silently repaired.",
      "moveReviews": [
        {
          "moveId": "con-secular-morality-and-meaning-live",
          "speaker": "Klemens Kappel",
          "resolution": "Kappel’s substantive answer runs5.17–97.822s. He first allows that theistic assumptions can explain importance, then denies that atheism automatically defeats morality or meaning. He owns both selected quotations and the final qualification that the matter remains open; moderator thanks/next-question begins98.222s. The retained E3323 qualification is Kappel’s, while its trailing procedural words are unscored. No completed secular moral theory is attributed to him.",
          "attributionResolved": true,
          "materialMeaningResolved": true,
          "retainedQuotationOwnershipResolved": true
        }
      ]
    },
    {
      "clipId": "boundary-06",
      "status": "passed-with-procedural-label-limitation",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-06.json",
        "sha256": "9b1713c093275db51666fe27bd6f0cf7d052fc676abe6edce8fd5f73ca7bbb6b",
        "bytes": 5918
      },
      "usageBasedCostUsd": 0.0269875,
      "directListeningPerformed": false,
      "recognitionLimitation": "The machine labels the final thanks to both debaters at 69.226–77.626 seconds as Kappel. Its explicit closing function and full source turn structure identify it as unscored moderator context. The preceding short handoff is also unscored; no substantive attribution depends on those machine labels.",
      "moveReviews": [
        {
          "moveId": "pro-christianity-historically-anchored",
          "speaker": "William Lane Craig",
          "resolution": "Craig owns the answer from 3.678 through 67.976 seconds, including the selected rooted-in-history quotation across 21.928–22.128 seconds. His appeal to historical persons, places and texts leads back to his three resurrection facts; this is not treated as independent proof that every reported miracle occurred. The partial handoff in E3416 is excluded; the E3417 onward retained answer is Craig’s. Final procedural thanks begin at 69.226 seconds and are unscored.",
          "attributionResolved": true,
          "materialMeaningResolved": true,
          "retainedQuotationOwnershipResolved": true
        }
      ]
    }
  ],
  "responses": [
    {
      "clipId": "wording-01",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/wording-01.json",
        "sha256": "1af2453095cf16a0066a3e4d147b10580906876c998e1ed36a8a20763ce965b7",
        "bytes": 5131
      },
      "attempt": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/wording-01.attempt.json",
        "sha256": "915514c20455e55559dc23df0a3c960fc9f2740be2824ab26debe671ad391d9d",
        "bytes": 293
      },
      "completion": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/wording-01.completion.json",
        "sha256": "1e787c8d5782a8e8056718befa7fef624043a9e87488ad15b0e090f785aa7692",
        "bytes": 525
      },
      "usageBasedCostUsd": 0.021465
    },
    {
      "clipId": "wording-02",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/wording-02.json",
        "sha256": "9b01b167983cb677014935a5d292f91b78591b229ea048a73e35d4863552fec3",
        "bytes": 2533
      },
      "attempt": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/wording-02.attempt.json",
        "sha256": "b133d85e006d683d38f4df6b7ef6fcb66bcb85f4ef4404dbce5b049931630596",
        "bytes": 293
      },
      "completion": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/wording-02.completion.json",
        "sha256": "05e29d8c63860b5a41ccf0cd5f42659b32ed203fbd7e3876b629c9b251820ae6",
        "bytes": 523
      },
      "usageBasedCostUsd": 0.0170975
    },
    {
      "clipId": "wording-03",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/wording-03.json",
        "sha256": "66eeabd36a60da9780b4add6124e4bfbc726098ca2b9a705f2008b4cc60c65e4",
        "bytes": 2779
      },
      "attempt": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/wording-03.attempt.json",
        "sha256": "6b18f6aab3be51fa9d49181a8317ad8634fa4ceff67819b983eada89e21ef018",
        "bytes": 293
      },
      "completion": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/wording-03.completion.json",
        "sha256": "07a03382d73b983bdc35724064a14efa859bd9d6f1cbb123db9d63a7f4d63f09",
        "bytes": 523
      },
      "usageBasedCostUsd": 0.0123725
    },
    {
      "clipId": "boundary-01",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-01.json",
        "sha256": "d6c3c7c04d4f3eb176dac6e574a9e464959721ee380bad23b77009c3e9bc32b8",
        "bytes": 7195
      },
      "attempt": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-01.attempt.json",
        "sha256": "cf63cad909642a7117720f46c7c11f9c23b01b51da3dd8adf7824260e33f0e7e",
        "bytes": 292
      },
      "completion": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-01.completion.json",
        "sha256": "da94cd1750b08d0eec890decbb14531f6d7f9e0c183cf1ebd79e471257df0c8c",
        "bytes": 529
      },
      "usageBasedCostUsd": 0.0404725
    },
    {
      "clipId": "boundary-02",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-02.json",
        "sha256": "07ce5146507d4bec99f22b73e0db45430b19f05b27f23f42690117e057329a52",
        "bytes": 12375
      },
      "attempt": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-02.attempt.json",
        "sha256": "1dc4fc85df984c6360bd315afd8d3154fc3f142c207a1411f2e68323a48ac346",
        "bytes": 294
      },
      "completion": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-02.completion.json",
        "sha256": "a7db2f777252bef32203d3b8438e86f60de67f3394f5c125f0bf64b60dfa0e13",
        "bytes": 531
      },
      "usageBasedCostUsd": 0.065705
    },
    {
      "clipId": "boundary-03",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-03.json",
        "sha256": "aafc9f998ceb4b70f609691520599df01568daffabce443f626083fee3114599",
        "bytes": 8351
      },
      "attempt": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-03.attempt.json",
        "sha256": "c3186bdae895826ef991d4f9b9d042c76b22dfd172ff46620aec2fb84e29b53c",
        "bytes": 294
      },
      "completion": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-03.completion.json",
        "sha256": "561b12196b029a8d53cec7e7c9dedf79b4573bb8c0502812375d61e3d58fcb60",
        "bytes": 529
      },
      "usageBasedCostUsd": 0.05168
    },
    {
      "clipId": "boundary-04",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-04.json",
        "sha256": "8e5155cbece4debce0a03cc58a08ff64f08df2d0e5c25803a610607424400888",
        "bytes": 10245
      },
      "attempt": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-04.attempt.json",
        "sha256": "28433d38ccad02b01303732216398c96e33d4be016de09ab4a2cb1940dc4d670",
        "bytes": 294
      },
      "completion": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-04.completion.json",
        "sha256": "082e43985d354e98b8d17be44348dcc704519f8ae48c0ea6bad7b7f25ae55157",
        "bytes": 530
      },
      "usageBasedCostUsd": 0.0492375
    },
    {
      "clipId": "boundary-05",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-05.json",
        "sha256": "f92c7244daa0f8ff55e0ffb9816d428244111b34edf193b86b8ae837d0b04e6c",
        "bytes": 6242
      },
      "attempt": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-05.attempt.json",
        "sha256": "034230e02cb430f06fbbbdb2a3a0de6fa0f41c9e8cc756b70f99861835b2e21e",
        "bytes": 294
      },
      "completion": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-05.completion.json",
        "sha256": "d442bd8a16a5334fe74b4cee71f0e493296b1f0ee14354f3ae4fb67381284a76",
        "bytes": 530
      },
      "usageBasedCostUsd": 0.036655
    },
    {
      "clipId": "boundary-06",
      "response": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-06.json",
        "sha256": "9b1713c093275db51666fe27bd6f0cf7d052fc676abe6edce8fd5f73ca7bbb6b",
        "bytes": 5918
      },
      "attempt": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-06.attempt.json",
        "sha256": "ca8547f0ed172e0d25d79f4f89b20d0eaa434214375ec5a9faa83222209995f0",
        "bytes": 294
      },
      "completion": {
        "path": "docs/assessment-production/standalone-debates-v1/debate-284/audio/responses/boundary-06.completion.json",
        "sha256": "8c94de2f0eb99b831480b66688f852c561fd4d5f979a2419b8afbcbaf5f872d0",
        "bytes": 528
      },
      "usageBasedCostUsd": 0.0269875
    }
  ],
  "canonicalCaptionsUnchanged": true,
  "inventoryUnchanged": true,
  "sequencingNote": "The three wording clips were frozen and called after the first unsaved inventory draft, before final inventory acceptance, to investigate uncertainties already enumerated in the locked source notes. This preceded all judgments. The six boundary clips were frozen after final inventory acceptance. No paid input was repeated, no assessment was revised from a score, and no uncertainty restriction was silently removed.",
  "audit": {
    "requiredAttributionChecks": 9,
    "completedAttributionChecks": 9,
    "unresolvedAttributionChecks": 0,
    "allRequiredChecksBeforePrimaryJudgments": true,
    "directListeningPerformed": false
  },
  "cost": {
    "knownSuccessfulCallCostUsd": 0.3216725,
    "maximumPossibleFailedCallCostUsd": 0,
    "maximumPossibleTotalCostUsd": 0.3216725,
    "paidCalls": 9,
    "successfulPaidCalls": 9,
    "failedOrUncertainCalls": 0,
    "automaticPaidRetries": 0,
    "planningAllowanceUsd": 0.969334,
    "standingCapUsd": 1,
    "billingDashboardConfirmed": false
  },
  "completedAt": "2026-10-04T23:54:04.613666+00:00"
}
```
