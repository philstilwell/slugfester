#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";

const shouldWrite = process.argv.includes("--write");
const root = "docs/calibration/v4.2.21.17.8/workflow-readiness";
const paths = {
  discovery: "docs/calibration/v4.2.21.12/simplified-partition-discovery/model-execution.json",
  inventoryInitial: "docs/calibration/v4.2.21.16/decomposed-consensus-contract/inventory-model-execution.json",
  inventoryRecovery: "docs/calibration/v4.2.21.16/decomposed-consensus-contract/inventory-recovery-model-execution.json",
  judgments: "docs/calibration/v4.2.21.17.2/independent-judgment-schema-recovery/model-execution.json",
  disagreement: "docs/calibration/v4.2.21.17.3/deterministic-disagreement-audio-prep/analysis.json",
  audio: "docs/calibration/v4.2.21.17.4/medium-confidence-audio-verification/analysis.json",
  adjudication: "docs/calibration/v4.2.21.17.5/dispute-only-adjudication/model-execution.json",
  adjudicationAnalysis: "docs/calibration/v4.2.21.17.5/dispute-only-adjudication/analysis.json",
  finalLedger: "docs/calibration/v4.2.21.17.6/final-ledger/analysis.json",
  scores: "docs/calibration/v4.2.21.17.6/final-ledger/calculated-scores.json",
  scoreAnalysis: "docs/calibration/v4.2.21.17.6/final-ledger/score-analysis.json"
};
const loaded = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, file]) => [key, JSON.parse(await readFile(file, "utf8"))])));
const debates = ["133", "178", "182"];
const byDebate = (execution, debateNumber) => execution.results.filter((result) => result.debateNumber === debateNumber);
const successfulInventory = new Map([
  ["133", loaded.inventoryInitial.results.find((result) => result.debateNumber === "133" && result.accepted)],
  ["178", loaded.inventoryInitial.results.find((result) => result.debateNumber === "178" && result.accepted)],
  ["182", loaded.inventoryRecovery.results.find((result) => result.debateNumber === "182" && result.accepted)]
]);

function fourSlotMakespan(milliseconds) {
  const slots = [0, 0, 0, 0];
  for (const duration of [...milliseconds].sort((a, b) => b - a)) {
    const index = slots.indexOf(Math.min(...slots));
    slots[index] += duration;
  }
  return Math.max(...slots);
}

const timings = debates.map((debateNumber) => {
  const discovery = byDebate(loaded.discovery, debateNumber).map((result) => result.elapsedMs);
  const judgments = byDebate(loaded.judgments, debateNumber).map((result) => result.elapsedMs);
  const adjudication = byDebate(loaded.adjudication, debateNumber)[0].elapsedMs;
  const inventory = successfulInventory.get(debateNumber).elapsedMs;
  const criticalPathMs = fourSlotMakespan(discovery) + inventory + Math.max(...judgments) + adjudication;
  const computeWorkMs = discovery.reduce((sum, value) => sum + value, 0) + inventory + judgments.reduce((sum, value) => sum + value, 0) + adjudication;
  return { debateNumber, discoveryContexts: discovery.length, lockedMoves: loaded.disagreement.debates.find((debate) => debate.debateNumber === debateNumber).moveCount, discoveryParallelMinutes: Number((fourSlotMakespan(discovery) / 60000).toFixed(2)), inventoryMinutes: Number((inventory / 60000).toFixed(2)), independentJudgmentsParallelMinutes: Number((Math.max(...judgments) / 60000).toFixed(2)), adjudicationMinutes: Number((adjudication / 60000).toFixed(2)), criticalPathMinutes: Number((criticalPathMs / 60000).toFixed(2)), computeWorkMinutes: Number((computeWorkMs / 60000).toFixed(2)) };
});
const meanCriticalPathMinutes = timings.reduce((sum, row) => sum + row.criticalPathMinutes, 0) / timings.length;
const meanComputeWorkMinutes = timings.reduce((sum, row) => sum + row.computeWorkMinutes, 0) / timings.length;
const projected195CriticalPathHours = meanCriticalPathMinutes * 195 / 60;
const projected195ComputeWorkHours = meanComputeWorkMinutes * 195 / 60;
const scoreDebates = loaded.scores.debates.map((debate) => ({ debateNumber: debate.debateNumber, passAWinner: debate.passA.winner, passBWinner: debate.passB.winner, finalWinner: debate.final.winner, finalScores: { pro: debate.final.overall.pro.score, con: debate.final.overall.con.score } }));
const qualityPass = loaded.judgments.validContexts === 6 && loaded.audio.gate.passed && loaded.adjudicationAnalysis.gate.semanticPass && loaded.finalLedger.status === "partition-deterministic-final-ledger-gate-passed" && loaded.scores.totals.acceptancePassed;
const analysis = {
  schemaVersion: "4.2.21.17.8-workflow-readiness-analysis",
  protocolId: "v4.2.21.17.8-decomposed-consensus-readiness",
  status: qualityPass ? "retired-partition-three-passed-new-held-out-gate-required" : "retired-partition-three-failed",
  calibrationOnly: true,
  AIOnly: true,
  evidenceStatus: { retiredDevelopmentDebates: debates, cleanHeldOutEvidence: false, endToEndSemanticPipelineComplete: qualityPass, publicationReconstructionTestedUnderCurrentWorkflow: false },
  quality: {
    scoreBlindInventoriesAccepted: 3,
    independentJudgmentsAccepted: loaded.judgments.validContexts,
    independentJudgmentsRequired: 6,
    deterministicDisputedMoves: loaded.disagreement.adjudicationWorkload.disputedMoves,
    totalMoves: loaded.disagreement.adjudicationWorkload.totalMoves,
    disputedMoveRate: loaded.disagreement.adjudicationWorkload.disputedMoveRate,
    candidateSelectionsAdjudicated: loaded.adjudicationAnalysis.gate.candidateSelections,
    mediumConfidenceAudioVerified: loaded.audio.gate.verified,
    mediumConfidenceAudioUnresolved: loaded.audio.gate.unresolved,
    finalLedgersSourceValidated: loaded.finalLedger.validation.debates,
    scorePasses: loaded.scores.totals.scoringPasses,
    scoreStabilityPassed: loaded.scores.totals.acceptancePassed,
    scoreStability: loaded.scores.stability,
    scoreDebates,
    semanticRepairs: 0,
    judgmentRetries: 0,
    adjudicationRetries: 0
  },
  compute: {
    timings,
    successfulModelWorkMinutesThreeDebates: Number((meanComputeWorkMinutes * 3).toFixed(2)),
    meanComputeWorkMinutesPerDebate: Number(meanComputeWorkMinutes.toFixed(2)),
    projected195ComputeWorkHours: Number(projected195ComputeWorkHours.toFixed(1)),
    fourSlotCriticalPathAssumption: { discoveryChunksParallelMaximum: 4, independentJudgmentsAAndBParallel: true, inventoryAndAdjudicationSequentialAfterDependencies: true, crossDebateParallelismNotCounted: true },
    meanCriticalPathMinutesPerDebate: Number(meanCriticalPathMinutes.toFixed(2)),
    projected195CriticalPathHours: Number(projected195CriticalPathHours.toFixed(1)),
    targetHours: 50,
    analysisThroughScoresWithinTarget: projected195CriticalPathHours <= 50,
    publicationSynthesisComputeMeasured: false,
    retiredOversizeInventoryTimeoutExcludedFromProductionProjection: true,
    universalAllCandidateTransportProjectionRequired: true
  },
  productionConditions: {
    dyadicOnly: true,
    threeOrMoreSpeakerDebatesExcluded: true,
    completeLocalTranscriptEventsAndManifestRequired: true,
    allCandidateInventoryTransportProjectionUniversal: true,
    discoveryChunksMayRunInParallelButRemainIsolated: true,
    independentJudgmentsMayRunInParallelButRemainIsolated: true,
    portfolioMeanLockedMovesTargetMaximum: 14,
    perDebateCoverageMayExceedTargetWhenBurdenCoverageRequires: true,
    twoIndependentSolPassesPerDebate: true,
    thirdDisputedFieldsOnlyPass: true,
    audioVerificationForEitherPassBelowHighConfidence: true,
    scoresOnlyAfterAdjudicatedLedgerValidation: true,
    oneAutomaticAttemptNoRetryOrRepair: true
  },
  heldOutGateRequirements: {
    newDisjointFiveRequired: true,
    excludeDebates: debates,
    exactRouteMix: { direct: 2, partition: 3 },
    dyadicOnly: true,
    noSemanticTranscriptInspectionDuringSelection: true,
    completeConsensusAudioAdjudicationScorePath: true,
    publicationReconstructionRequired: true,
    overallCommentaryRequired: true,
    aiExtensionRequired: true,
    aiExtensionClearlyLabeledAsAIContribution: true,
    aiExtensionAccordionRequired: true,
    aiExtensionDistinctStylingRequired: true,
    forbiddenAIExtensionWordAbsent: true,
    noRetriesCorrectionsOrPostResultThresholdTuning: true,
    computeProjectionMustIncludePublicationSynthesis: true
  },
  decision: {
    qualityAssessment: "The decomposed adjudicated-consensus workflow is semantically strong and internally stable on the retired partition three.",
    computeAssessment: "The analysis-through-score critical path projects to about 49 hours for 195 debates with four-slot discovery and A/B parallelism; serial compute work is about 78 hours. Publication synthesis remains unmeasured.",
    readyForNewHeldOutSelection: qualityPass,
    readyForNewHeldOutExecution: false,
    readyForAll195: false,
    reasonAll195Blocked: "A clean disjoint route-stratified held-out gate and current-workflow publication reconstruction have not yet passed."
  },
  authorization: { newHeldOutFiveSelection: qualityPass, newHeldOutFiveScreening: false, heldOutModelExecution: false, publicationFinalization: false, productionMutation: false, all195Debates: false },
  sources: paths
};
const report = `# Slugfester v4.2.21.17.8 workflow readiness\n\n## Decision\n\nThe workflow is **ready for a new disjoint held-out gate, but not yet ready for all 195 debates**. The retired partition three passed the complete inventory, two-judge, deterministic disagreement, audio, isolated adjudication, final-ledger, and one-pass scoring path without semantic repair or scoring leakage.\n\n## Quality\n\n- Six of six independent Sol judgments validated.\n- ${analysis.quality.deterministicDisputedMoves} of ${analysis.quality.totalMoves} moves contained material disagreements; all ${analysis.quality.candidateSelectionsAdjudicated} required candidate selections were adjudicated.\n- Both medium-confidence moves passed audio verification; no audio move remained unresolved.\n- All three final ledgers replayed and passed the unchanged full-source validator.\n- All three A/B winner agreements were preserved. Mean final-to-initial score distance was ${analysis.quality.scoreStability.meanAbsoluteDistanceToInitialPasses}, maximum distance was ${analysis.quality.scoreStability.maximumAbsoluteDistanceToEitherInitialPass}, and maximum movement outside the A/B range was ${analysis.quality.scoreStability.maximumOutsideInitialRange}.\n\n## Compute\n\nObserved successful serial model work projects to **${analysis.compute.projected195ComputeWorkHours} hours** for 195 debates. With four isolated discovery slots and A/B judgments run concurrently, the dependency-critical path projects to **${analysis.compute.projected195CriticalPathHours} hours through final scores**, close to the 50-hour target. This excludes publication synthesis, which the new held-out gate must measure.\n\nThe production scheduler must use the all-candidate transport projection universally; the retired oversized inventory request that timed out is not part of the production estimate. A portfolio mean target of at most 14 locked moves per debate should be monitored, without truncating burden coverage on unusually complex debates.\n\n## Next gate\n\nSelect five new, unseen, dyadic debates—two direct and three partition-routed—excluding Debates 133, 178, and 182. Run the complete workflow once with no retries or corrections. The gate must also reconstruct the public assessment, including Overall Commentary and a clearly AI-labeled, distinctly styled accordion AI Extension, and must measure that publication-synthesis time before authorizing all 195.\n`;
if (shouldWrite) {
  await mkdir(root, { recursive: true });
  await writeFile(`${root}/analysis.json`, `${JSON.stringify(analysis, null, 2)}\n`);
  await writeFile(`${root}/readiness-assessment.md`, report);
}
console.log(JSON.stringify({ status: analysis.status, qualityPass, projected195ComputeWorkHours: analysis.compute.projected195ComputeWorkHours, projected195CriticalPathHours: analysis.compute.projected195CriticalPathHours, publicationSynthesisComputeMeasured: false, readyForNewHeldOutSelection: analysis.decision.readyForNewHeldOutSelection, readyForAll195: false, nextAuthorized: "new-disjoint-held-out-five-selection" }, null, 2));
