#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const root = "docs/calibration/v4.2.21.7/readiness-assessment";
const files = {
  primaryExecution: "docs/calibration/v4.2.20/source-span-rendering/model-execution.json",
  passBExecution: "docs/calibration/v4.2.21/pass-b-consensus/model-execution.json",
  passBRecovery: "docs/calibration/v4.2.21.1/charity-closure/model-execution.json",
  disagreements: "docs/calibration/v4.2.21.2/disagreement-audio-prep/analysis.json",
  audio: "docs/calibration/v4.2.21.3.1/audio-recovery/audio-verification.json",
  adjudication: "docs/calibration/v4.2.21.4/adjudication/analysis.json",
  ledger: "docs/calibration/v4.2.21.5/final-ledger/analysis.json",
  scores: "docs/calibration/v4.2.21.5/final-ledger/score-analysis.json"
};
const loaded = Object.fromEntries(
  await Promise.all(
    Object.entries(files).map(async ([key, file]) => [
      key,
      JSON.parse(await readFile(path.resolve(file), "utf8"))
    ])
  )
);

assertV4(
  loaded.primaryExecution.status === "three-source-span-primary-contexts-passed",
  "accepted primary timing evidence unavailable"
);
assertV4(
  loaded.passBRecovery.status === "debate-195-pass-b-recovery-passed",
  "accepted Pass B recovery evidence unavailable"
);
assertV4(
  loaded.adjudication.status === "dispute-only-adjudication-gate-passed",
  "accepted adjudication evidence unavailable"
);
assertV4(
  loaded.ledger.status === "deterministic-final-ledger-gate-passed",
  "accepted ledger evidence unavailable"
);
assertV4(
  loaded.scores.status === "three-debate-post-adjudication-score-stability-passed",
  "accepted score-stability evidence unavailable"
);

const acceptedPrimaryMinutes = loaded.primaryExecution.results.map((result) => result.elapsedMs / 60000);
const acceptedPassBMinutes = [
  ...loaded.passBExecution.results
    .filter((result) => result.status === "completed-valid-clean")
    .map((result) => result.elapsedMs / 60000),
  loaded.passBRecovery.result.elapsedMs / 60000
];
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const primaryMinutesPerDebate = mean(acceptedPrimaryMinutes);
const passBMinutesPerDebate = mean(acceptedPassBMinutes);
const adjudicationMinutesPerDebate = loaded.adjudication.gate.meanElapsedMinutes;
const deterministicFinalizationMinutesPerDebateAssumption = 4.25;
const debateCount = 195;
const consensusScoringMinutesPerDebate =
  primaryMinutesPerDebate + passBMinutesPerDebate + adjudicationMinutesPerDebate;
const endToEndMinutesPerDebate =
  consensusScoringMinutesPerDebate + deterministicFinalizationMinutesPerDebateAssumption;
const clipMinutesPerDebate = loaded.audio.totals.clipMinutes / 3;
const projectedTranscriptionMinutes = clipMinutesPerDebate * debateCount;
const projectedTranscriptionCostUsd = projectedTranscriptionMinutes * 0.006;
const fixed = (value, digits = 2) => Number(value.toFixed(digits));

const analysis = {
  schemaVersion: "4.2.21.7-workflow-readiness-assessment",
  protocolId: "v4.2.21-source-span-consensus",
  status: "conditional-five-debate-held-out-gate-required",
  calibrationOnly: true,
  AIOnly: true,
  evidencePopulation: {
    debates: 3,
    moves: loaded.disagreements.adjudicationWorkload.totalMoves,
    topicFamilies: 3,
    twoSpeakerDebatesOnly: true,
    heldOutAfterWorkflowRepair: false,
    publicationFinalizationsTested: 0
  },
  passedDomains: {
    completeLocalTranscriptAndSourceChain: true,
    independentPasses: true,
    deterministicDisagreementExtraction: true,
    mediumConfidenceAudioUnionRule: true,
    disputeOnlyAdjudication: true,
    anonymizedCandidateProvenance: true,
    scoresOnlyAfterAdjudication: true,
    singleScoringPass: true,
    fullLedgerReplay: true,
    prospectiveScoreStability: true
  },
  qualityEvidence: {
    primaryContextsPassed: 3,
    passBContextsAccepted: 3,
    passBRejectedOutputsPreserved: 1,
    passBClosureRecoveryContextsPassed: 1,
    adjudicationContextsPassed: 3,
    adjudicationRetries: 0,
    disputedMoveRate: loaded.disagreements.adjudicationWorkload.disputedMoveRate,
    candidateSelections: loaded.disagreements.adjudicationWorkload.candidateSelections,
    audioMovesVerified: loaded.audio.totals.verified,
    audioMovesUnresolved: loaded.audio.totals.unresolved,
    scoreStability: loaded.scores.stability,
    productionReferenceDiagnostic: loaded.scores.productionReferenceDiagnostic
  },
  runtimeProjection: {
    observedMinutesPerDebate: {
      primary: fixed(primaryMinutesPerDebate),
      passB: fixed(passBMinutesPerDebate),
      adjudication: fixed(adjudicationMinutesPerDebate),
      consensusAndScoring: fixed(consensusScoringMinutesPerDebate),
      publicationFinalizationAssumption: deterministicFinalizationMinutesPerDebateAssumption,
      endToEnd: fixed(endToEndMinutesPerDebate)
    },
    projectedHoursFor195: {
      consensusAndScoring: fixed((consensusScoringMinutesPerDebate * debateCount) / 60),
      publicationFinalization: fixed(
        (deterministicFinalizationMinutesPerDebateAssumption * debateCount) / 60
      ),
      endToEnd: fixed((endToEndMinutesPerDebate * debateCount) / 60)
    },
    fiftyHourTargetCompatibleWithCurrentMandatoryThreeContextPath: false,
    modelAuthentication: "ChatGPT subscription",
    projectedMeteredModelApiCostUsd: 0,
    projectedTranscriptionAtObservedRate: {
      minutes: fixed(projectedTranscriptionMinutes),
      estimatedApiCostUsd: fixed(projectedTranscriptionCostUsd),
      planningRangeUsd: [1, 4],
      ChatGPTSubscriptionApplicable: false
    }
  },
  strengths: [
    "Every accepted raw judgment and final ledger replays against the complete local transcript/source chain.",
    "The third pass saw only disputed fields with independently anonymized candidates and verified audio where required.",
    "The final six side scores stayed inside the ranges formed by the two independent passes.",
    "The prospective stability gate passed without a rerun, correction, offset, or threshold change.",
    "The stricter scale changed score levels but preserved the existing winner classification in all three diagnostic comparisons."
  ],
  materialLimitations: [
    "All 34 sampled moves opened at least one dispute, so adjudication is presently the normal path rather than a sparse exception.",
    "The three debates became development evidence while schema and audio-reference defects were repaired; they are not a final held-out test.",
    "Only one fresh Pass B context has exercised the final charity-closure schema after the rejected output exposed the gap.",
    "The sample covers roughly one-hour two-speaker debates but not the broader duration and source-quality distribution of the corpus.",
    "Publication prose, Overall Commentary, and the labeled accordion AI Extension have not yet been regenerated from the adjudicated ledger.",
    "The observed mandatory three-context path projects above 50 compute-hours before publication finalization."
  ],
  qualityAssessment: {
    sourceAndAuditIntegrity: "high",
    scoreConsistency: "high-with-small-sample-caveat",
    interpassSemanticAgreement: "low",
    operationalReliability: "moderate-to-high",
    computeEfficiency: "below-target",
    generalizationEvidence: "insufficient",
    publicationReadiness: "not-yet-tested",
    overall: "promising-but-not-ready-for-195"
  },
  recommendedNextGate: {
    debates: 5,
    disjointAndUnseenAfterFreeze: true,
    speakersPerDebate: 2,
    stratification: [
      "topic family",
      "duration",
      "caption/source quality",
      "argument density",
      "expected attribution difficulty"
    ],
    requiredStages: [
      "two independent Sol passes",
      "deterministic disagreement extraction",
      "audio verification for every below-high attribution in either pass",
      "isolated dispute-only Sol adjudication",
      "single post-adjudication score pass",
      "publication assessment reconstruction including Overall Commentary and labeled accordion AI Extension"
    ],
    executionPolicy: {
      oneAttemptPerContext: true,
      retries: 0,
      corrections: 0,
      preserveFailures: true,
      freezeAllThresholdsBeforeExecution: true,
      testLowerReasoningEffortOnlyAsASeparatelyFrozenEfficiencyVariant: true
    },
    successCriteria: {
      rawSemanticContextsValidOnFirstAttempt: "all",
      requiredAudioMovesVerified: "all",
      adjudicationContextsValidOnFirstAttempt: "all",
      scoreStabilityGate: "pass frozen v4.2.21.6 thresholds",
      publicationArtifactsValid: "all",
      AIExtensionClearlyLabeledAsAI: true,
      AIExtensionAccordionPresent: true,
      AIExtensionDistinctStylingPresent: true,
      forbiddenUnassailableWordingOccurrences: 0
    }
  },
  recommendation: {
    beginAll195Now: false,
    prepareHeldOutFiveNow: true,
    executeHeldOutFiveWithoutFreshCostEstimate: false,
    acceptCurrentEndToEndComputeProjection: false,
    optimizationDecisionAfterHeldOutEvidence: true
  },
  authorization: {
    heldOutFivePreparation: true,
    heldOutFiveExecution: false,
    publicationFinalization: false,
    productionMutation: false,
    all195Debates: false
  }
};

const markdown = `# Slugfester v4.2.21.7 Workflow Readiness Assessment

## Decision

**Promising, but not ready for the 195-debate run.** The semantic-consensus and scoring pipeline now works end to end on three debates, but a frozen disjoint five-debate held-out gate is still required.

## What passed

- Complete local transcript/source-chain validation for both passes and the final ledger.
- Three independent Pass B judgments accepted after the charity-closure recovery.
- Five medium-confidence audio moves verified with no unresolved attribution.
- Three dispute-only adjudications passed on the first attempt.
- All 160 candidate selections and 64 deferred means replayed deterministically.
- Final score stability passed: mean distance from the initial passes was **${analysis.qualityEvidence.scoreStability.meanAbsoluteDistanceToInitialPasses}**, the maximum was **${analysis.qualityEvidence.scoreStability.maximumAbsoluteDistanceToEitherInitialPass}**, and every final side score stayed inside the Pass A/Pass B interval.

## Why the corpus run is not yet authorized

- Every sampled move opened at least one dispute (**34/34**), making adjudication the normal path.
- The three debates were used while repairing the workflow and are no longer clean held-out evidence.
- Publication prose and the labeled accordion **AI Extension** have not yet been regenerated from the adjudicated ledger.
- Current observed runtime projects to **${analysis.runtimeProjection.projectedHoursFor195.consensusAndScoring} compute-hours** for consensus/scoring and about **${analysis.runtimeProjection.projectedHoursFor195.endToEnd} hours** including the current publication-finalization assumption. That is above the 50-hour target.
- The stricter rubric runs lower than existing production scores by an average of **${Math.abs(analysis.qualityEvidence.productionReferenceDiagnostic.meanSignedSideDelta)} points per side**, although all three winner classifications match. Existing scores remain diagnostic only, not ground truth.

## Next gate

Freeze five unseen two-speaker debates stratified by topic, duration, source quality, density, and attribution difficulty. Run the complete consensus, audio, adjudication, score, and publication reconstruction path once, with no retries or corrections. The publication artifacts must include Overall Commentary and a clearly AI-labeled, distinctly styled accordion AI Extension, with no use of the forbidden wording.

The held-out execution needs a fresh cost estimate. At the observed audio rate, five debates would likely use about **${fixed(clipMinutesPerDebate * 5)} transcription minutes**, approximately **$${fixed(clipMinutesPerDebate * 5 * 0.006, 2)}** at current pricing; model work remains under the ChatGPT subscription.
`;

if (shouldWrite) {
  await mkdir(path.resolve(root), { recursive: true });
  await writeFile(path.resolve(root, "analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`);
  await writeFile(path.resolve(root, "readiness-assessment.md"), markdown);
}
console.log(
  JSON.stringify(
    {
      status: analysis.status,
      qualityAssessment: analysis.qualityAssessment,
      projectedHoursFor195: analysis.runtimeProjection.projectedHoursFor195,
      nextGate: analysis.recommendedNextGate.debates,
      heldOutFivePreparationAuthorized: true,
      heldOutFiveExecutionAuthorized: false,
      all195DebatesAuthorized: false
    },
    null,
    2
  )
);
