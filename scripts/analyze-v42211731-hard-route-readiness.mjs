#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";

const shouldWrite = process.argv.includes("--write");
const root = "docs/calibration/v4.2.21.17.31/hard-route-workflow-readiness";
const paths = {
  discoveryExecution: "docs/calibration/v4.2.21.17.20/hard-route-held-out-discovery/model-execution.json",
  discoveryRecovery: "docs/calibration/v4.2.21.17.23/mechanical-discovery-recovery/recovery-analysis.json",
  inventoryExecution: "docs/calibration/v4.2.21.17.24/hard-route-score-blind-inventory/model-execution.json",
  inventoryAnalysis: "docs/calibration/v4.2.21.17.24/hard-route-score-blind-inventory/analysis.json",
  judgmentExecution: "docs/calibration/v4.2.21.17.25/hard-route-independent-judgments/model-execution.json",
  judgmentAnalysis: "docs/calibration/v4.2.21.17.25/hard-route-independent-judgments/analysis.json",
  disagreement: "docs/calibration/v4.2.21.17.26/hard-route-disagreement-audio-prep/analysis.json",
  audioExecution: "docs/calibration/v4.2.21.17.27/hard-route-audio-verification/model-execution.json",
  audioAudit: "docs/calibration/v4.2.21.17.27/hard-route-audio-verification/audio-verification.json",
  audioAnalysis: "docs/calibration/v4.2.21.17.27/hard-route-audio-verification/analysis.json",
  adjudicationExecution: "docs/calibration/v4.2.21.17.28/hard-route-dispute-only-adjudication/model-execution.json",
  adjudicationAnalysis: "docs/calibration/v4.2.21.17.28/hard-route-dispute-only-adjudication/analysis.json",
  finalLedger: "docs/calibration/v4.2.21.17.29/hard-route-final-ledger/analysis.json",
  scores: "docs/calibration/v4.2.21.17.30/hard-route-single-score-pass/calculated-scores.json",
  scoreAnalysis: "docs/calibration/v4.2.21.17.30/hard-route-single-score-pass/analysis.json"
};
const loaded = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, file]) => [key, JSON.parse(await readFile(file, "utf8"))])));
const debates = ["51", "63", "90", "153", "165"];
const byDebate = (execution, debateNumber) => execution.results.filter((result) => result.debateNumber === debateNumber);

function slotMakespan(milliseconds, slotsCount) {
  const slots = Array(slotsCount).fill(0);
  for (const duration of [...milliseconds].sort((left, right) => right - left)) {
    const index = slots.indexOf(Math.min(...slots));
    slots[index] += duration;
  }
  return Math.max(...slots);
}

const audioByDebate = new Map(loaded.audioAudit.debates.map((debate) => [debate.debateNumber, new Set(debate.moves.map((move) => move.moveId))]));
const timings = debates.map((debateNumber) => {
  const discovery = byDebate(loaded.discoveryExecution, debateNumber).map((result) => result.elapsedMs);
  const inventory = byDebate(loaded.inventoryExecution, debateNumber)[0].elapsedMs;
  const judgments = byDebate(loaded.judgmentExecution, debateNumber).map((result) => result.elapsedMs);
  const adjudication = byDebate(loaded.adjudicationExecution, debateNumber)[0].elapsedMs;
  const audioMoveIds = audioByDebate.get(debateNumber) ?? new Set();
  const audio = loaded.audioExecution.results.filter((result) => audioMoveIds.has(result.moveId)).map((result) => result.elapsedMs);
  const discoveryParallel = slotMakespan(discovery, 4);
  const judgmentParallel = Math.max(...judgments);
  const audioSerial = audio.reduce((sum, value) => sum + value, 0);
  const criticalPathMs = discoveryParallel + inventory + judgmentParallel + audioSerial + adjudication;
  const serialWorkMs = discovery.reduce((sum, value) => sum + value, 0) + inventory + judgments.reduce((sum, value) => sum + value, 0) + audioSerial + adjudication;
  return {
    debateNumber,
    discoveryContexts: discovery.length,
    lockedMoves: loaded.disagreement.debates.find((debate) => debate.debateNumber === debateNumber).moveCount,
    discoveryParallelMinutes: Number((discoveryParallel / 60000).toFixed(2)),
    inventoryMinutes: Number((inventory / 60000).toFixed(2)),
    independentJudgmentsParallelMinutes: Number((judgmentParallel / 60000).toFixed(2)),
    audioMinutes: Number((audioSerial / 60000).toFixed(2)),
    adjudicationMinutes: Number((adjudication / 60000).toFixed(2)),
    criticalPathMinutes: Number((criticalPathMs / 60000).toFixed(2)),
    serialWorkMinutes: Number((serialWorkMs / 60000).toFixed(2))
  };
});

const sumElapsed = (execution) => execution.results.reduce((sum, result) => sum + result.elapsedMs, 0);
const stageObservedMinutes = {
  discovery: sumElapsed(loaded.discoveryExecution) / 60000,
  inventory: sumElapsed(loaded.inventoryExecution) / 60000,
  independentJudgments: sumElapsed(loaded.judgmentExecution) / 60000,
  audio: sumElapsed(loaded.audioExecution) / 60000,
  adjudication: sumElapsed(loaded.adjudicationExecution) / 60000
};
const scale = 195 / debates.length;
const stageConcurrency = { discovery: 4, inventory: 2, independentJudgments: 2, audio: 2, adjudication: 2 };
const projectedStageBatchedHours = Object.fromEntries(Object.entries(stageObservedMinutes).map(([stage, minutes]) => [stage, Number((minutes * scale / stageConcurrency[stage] / 60).toFixed(2))]));
const projected195StageBatchedThroughScoresHours = Number((Object.values(projectedStageBatchedHours).reduce((sum, value) => sum + value, 0)).toFixed(2));
const meanCriticalPathMinutes = timings.reduce((sum, row) => sum + row.criticalPathMinutes, 0) / timings.length;
const meanSerialWorkMinutes = timings.reduce((sum, row) => sum + row.serialWorkMinutes, 0) / timings.length;
const targetHours = 50;
const publicationAndOrchestrationBudgetHours = Number((targetHours - projected195StageBatchedThroughScoresHours).toFixed(2));
const publicationMeanMinutesAtTwoSlotsIfNoOtherOverhead = Number((publicationAndOrchestrationBudgetHours * 60 * 2 / 195).toFixed(2));
const scoreDebates = loaded.scores.debates.map((debate) => ({ debateNumber: debate.debateNumber, passAWinner: debate.passA.winner, passBWinner: debate.passB.winner, finalWinner: debate.final.winner, finalScores: { pro: debate.final.overall.pro.score, con: debate.final.overall.con.score }, productionWinnerDiagnostic: debate.productionReferenceDiagnosticOnly.winner, productionWinnerMatches: debate.productionReferenceDiagnosticOnly.finalWinnerMatches }));
const qualityPass = loaded.discoveryExecution.status === "hard-route-held-out-discovery-complete-with-failure"
  && loaded.discoveryRecovery.status === "hard-route-discovery-mechanically-recovered-independent-judgment-packet-preparation-authorized"
  && loaded.discoveryRecovery.independentJudgmentEvidenceHeldOut
  && loaded.inventoryExecution.validContexts === 5
  && loaded.judgmentExecution.validContexts === 10
  && loaded.audioAudit.totals.verified === 3
  && loaded.audioAudit.totals.unresolved === 0
  && loaded.adjudicationExecution.validContexts === 5
  && loaded.adjudicationAnalysis.gate.semanticPass
  && loaded.finalLedger.status === "hard-route-deterministic-final-ledger-gate-passed"
  && loaded.scores.totals.scoringPasses === 1
  && loaded.scores.totals.acceptancePassed;
const publicationGateRequired = qualityPass;
const analysis = {
  schemaVersion: "4.2.21.17.31-hard-route-workflow-readiness-analysis",
  protocolId: "v4.2.21.17.31-hard-route-workflow-readiness",
  status: qualityPass ? "hard-route-five-passed-through-scores-publication-gate-required" : "hard-route-five-readiness-failed",
  calibrationOnly: true,
  AIOnly: true,
  evidenceStatus: { hardRouteDebates: debates, cleanDownstreamIndependentJudgmentEvidence: true, originalDiscoveryGatePassed: false, discoveryGateRelabeledAsPassed: false, discoveryRecoveryFieldPreservingAndOrderOnly: true, retiredRegressionOutputs: 63, endToEndSemanticPipelineCompleteThroughScores: qualityPass, publicationReconstructionTestedUnderCurrentWorkflow: false },
  quality: {
    scoreBlindInventoriesAccepted: loaded.inventoryExecution.validContexts,
    independentJudgmentsAccepted: loaded.judgmentExecution.validContexts,
    independentJudgmentsRequired: 10,
    totalMoves: loaded.disagreement.adjudicationWorkload.totalMoves,
    disputedMoves: loaded.disagreement.adjudicationWorkload.disputedMoves,
    disputedMoveRate: loaded.disagreement.adjudicationWorkload.disputedMoveRate,
    candidateSelectionsAdjudicated: loaded.disagreement.adjudicationWorkload.candidateSelections,
    confidenceTriggeredAudioVerified: loaded.audioAudit.totals.verified,
    confidenceTriggeredAudioUnresolved: loaded.audioAudit.totals.unresolved,
    finalLedgersSourceValidated: loaded.finalLedger.validation.debates,
    scorePasses: loaded.scores.totals.scoringPasses,
    scoreStabilityPassed: loaded.scores.totals.acceptancePassed,
    scoreStability: loaded.scores.stability,
    scoreDebates,
    productionWinnerMatchesDiagnosticOnly: scoreDebates.filter((debate) => debate.productionWinnerMatches).length,
    productionWinnerDifferencesDiagnosticOnly: scoreDebates.filter((debate) => !debate.productionWinnerMatches).map((debate) => debate.debateNumber),
    semanticRepairsAfterIndependentJudgment: 0,
    judgmentRetries: loaded.judgmentExecution.retries,
    adjudicationRetries: loaded.adjudicationExecution.retries
  },
  compute: {
    timings,
    observedSerialWorkMinutesFiveDebates: Number((Object.values(stageObservedMinutes).reduce((sum, value) => sum + value, 0)).toFixed(2)),
    meanSerialWorkMinutesPerDebate: Number(meanSerialWorkMinutes.toFixed(2)),
    projected195SerialWorkHours: Number((meanSerialWorkMinutes * 195 / 60).toFixed(2)),
    meanPerDebateDependencyCriticalPathMinutes: Number(meanCriticalPathMinutes.toFixed(2)),
    projected195PerDebateSerialCriticalPathHours: Number((meanCriticalPathMinutes * 195 / 60).toFixed(2)),
    stageObservedMinutes: Object.fromEntries(Object.entries(stageObservedMinutes).map(([key, value]) => [key, Number(value.toFixed(2))])),
    productionStageConcurrency: stageConcurrency,
    projected195StageBatchedHours: projectedStageBatchedHours,
    projected195StageBatchedThroughScoresHours,
    targetHours,
    publicationAndOrchestrationBudgetHours,
    publicationMeanMinutesAtTwoSlotsIfNoOtherOverhead,
    publicationSynthesisComputeMeasured: false,
    mechanicalOrchestrationAndSourcePreparationMeasured: false,
    transcriptionExposureObservedUsd: loaded.audioExecution.estimatedProcessingExposureUsd,
    meteredJudgmentModelApiCostUsd: 0,
    projectionFinding: "The production-shaped two/four-slot stage-batched projection is the planning estimate; serial work and debate-by-debate critical-path extrapolations are reported as capacity diagnostics, not expected wall time."
  },
  publicationGateRequirements: {
    debates,
    oneIsolatedFinalizationContextPerDebate: true,
    model: "5.6 Sol",
    reasoningEffort: "low",
    ChatGPTSubscription: true,
    maximumConcurrency: 2,
    attemptsPerDebate: 1,
    retries: 0,
    corrections: 0,
    maximumMinutesPerDebate: 8,
    maximumMeanMinutes: 6,
    lockedScoresAndMoveJudgmentsImmutable: true,
    completeAssessmentRequired: true,
    overallCommentaryRequired: true,
    aiExtensionRequired: true,
    aiExtensionClearlyLabeledAsAIContribution: true,
    aiExtensionAccordionRequired: true,
    aiExtensionDefaultCollapsed: true,
    aiExtensionDistinctStylingRequired: true,
    forbiddenAIExtensionWordingAbsent: true,
    noveltyMapRequired: true,
    balancedStrengthenedFinalArgumentsAndNewArgumentsRequired: true,
    noScoreEffectFromAIExtension: true,
    deterministicSchemaAndSourceValidationRequired: true,
    desktopAndMobileRenderingVerificationRequired: true,
    projectedTotalMustNotExceedTargetHours: true
  },
  decision: {
    qualityAssessment: "The adjudicated-consensus lane is source-complete, score-blind until ledger lock, internally stable, and operationally successful on all five hard-route debates. The 94% move-dispute rate means adjudication is essential rather than exceptional.",
    discoveryAssessment: "The original discovery gate remains failed; the current evidence is admissible downstream because the sole defect was ordering, recovery changed no candidate field, and the corrected validator passed a 63-output retired regression.",
    scoreAssessment: "All five independent winner agreements survived adjudication, and every prospective stability threshold passed with substantial margin. The Debate 153 winner change from production is a diagnostic difference, not a gate input.",
    computeAssessment: `Observed serial work projects to ${Number((meanSerialWorkMinutes * 195 / 60).toFixed(2))} hours, while the tested stage-batched concurrency projects to ${projected195StageBatchedThroughScoresHours} wall hours through scores. Publication and mechanical orchestration remain unmeasured.`,
    readyForPublicationFinalizationPreparation: publicationGateRequired,
    readyForPublicationFinalizationExecution: false,
    readyForAll195: false,
    reasonAll195Blocked: "The current adjudicated ledger has not yet regenerated and rendered the five public assessments, including Overall Commentary and the separately disclosed AI Extension, and publication runtime has not been measured."
  },
  authorization: { publicationFinalizationPreparation: publicationGateRequired, publicationFinalizationExecution: false, readinessPromotionAfterPublicationGate: false, productionMutation: false, all195Debates: false },
  sources: paths
};
const report = `# Slugfester v4.2.21.17.31 hard-route workflow readiness\n\n## Decision\n\nThe workflow is **ready for the five-debate publication-reconstruction gate, but not yet for the 195-debate campaign**. The entire transcript-to-score path has now passed on Debates 51, 63, 90, 153, and 165.\n\n## Quality\n\n- Five score-blind inventories, ten independent Sol judgments, five dispute-only adjudications, five final ledgers, and the sole authorized score pass all validated.\n- ${analysis.quality.disputedMoves} of ${analysis.quality.totalMoves} moves opened at least one material field dispute. This ${Math.round(analysis.quality.disputedMoveRate * 100)}% rate makes the third pass a core reliability control, not an occasional fallback.\n- All ${analysis.quality.candidateSelectionsAdjudicated} disputed candidate selections were resolved. All ${analysis.quality.confidenceTriggeredAudioVerified} confidence-triggered moves were verified from locally saved diarized transcripts; none remained unresolved.\n- All five A/B winner agreements were preserved. Mean final-to-pass distance was ${analysis.quality.scoreStability.meanAbsoluteDistanceToInitialPasses} points, maximum distance was ${analysis.quality.scoreStability.maximumAbsoluteDistanceToEitherInitialPass}, and maximum movement outside the A/B interval was ${analysis.quality.scoreStability.maximumOutsideInitialRange}.\n- Debate 153 changes the historical production winner, but both independent passes and the adjudicated result agree on the new winner. Existing production scores remain diagnostic only.\n\n## Discovery qualification\n\nThe original discovery gate remains failed and is not relabeled. Its one rejected output differed only in candidate ordering. The v17.23 recovery changed no semantic field, produced identical compiled content before and after canonical ordering, and followed a 63-output retired regression of the corrected validator. The later independent-judgment evidence remained held out from that diagnosis.\n\n## Compute\n\nObserved serial model/API work projects to **${analysis.compute.projected195SerialWorkHours} hours**. That is a capacity measure, not expected wall time. With the tested production concurrency—four discovery contexts and two contexts for inventory, judgments, audio, and adjudication—the stage-batched projection is **${analysis.compute.projected195StageBatchedThroughScoresHours} hours through scores**. This leaves ${analysis.compute.publicationAndOrchestrationBudgetHours} hours inside the 50-hour target for publication synthesis and mechanical orchestration. Publication must now be measured rather than assumed.\n\n## Final pre-corpus gate\n\nGenerate one isolated public assessment for each of the five debates from only its locked final ledger and calculated scores. Preserve every judgment and score. Require Overall Commentary and a clearly AI-labeled, visually distinct, default-collapsed accordion AI Extension with balanced strengthened final arguments, genuinely new arguments, a novelty map, no score effect, and no forbidden wording. Accept no retry or correction. Validate the structured content and desktop/mobile rendering, then recompute the full 195-debate wall projection.\n`;
if (shouldWrite) {
  await mkdir(root, { recursive: true });
  await writeFile(`${root}/analysis.json`, `${JSON.stringify(analysis, null, 2)}\n`);
  await writeFile(`${root}/readiness-assessment.md`, report);
}
console.log(JSON.stringify({ status: analysis.status, qualityPass, disputedMoveRate: analysis.quality.disputedMoveRate, scoreStability: { meanDistance: analysis.quality.scoreStability.meanAbsoluteDistanceToInitialPasses, maximumDistance: analysis.quality.scoreStability.maximumAbsoluteDistanceToEitherInitialPass, maximumOutsideRange: analysis.quality.scoreStability.maximumOutsideInitialRange }, projected195SerialWorkHours: analysis.compute.projected195SerialWorkHours, projected195StageBatchedThroughScoresHours, publicationAndOrchestrationBudgetHours, readyForPublicationFinalizationPreparation: publicationGateRequired, readyForAll195: false, nextAuthorized: publicationGateRequired ? "five-debate-publication-finalization-preparation" : "failure-diagnosis-only" }, null, 2));
