#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  deriveDiagnostic, deriveReframe, derivedTuple, equal, sha256
} from "./lib/v30-consensus.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.0/retired-three-debate-test";
const manifestPath = `${gateRoot}/gate-manifest.json`;
const outputPath = `${gateRoot}/reliability-analysis.json`;
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(manifestPath);
const manifest = JSON.parse(manifestText);
const mean = (values) => values.length ? values.filter(Boolean).length / values.length : null;
const allRows = [];
const debateStats = [];
let mediumOrLowMoveCount = 0;
let audioVerifiedMediumOrLowMoveCount = 0;
for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId];
  const [inputText, goldText, passAText, passBText, packetText, adjudicationText, finalLockText, scoringInputText, sourceAuditText] = await Promise.all([
    read(debate.path), read(debate.gold.path), read(outputs.passA), read(outputs.passB), read(outputs.disputePacket), read(outputs.adjudication), read(outputs.finalLock), read(outputs.scoringInput), read(debate.sourceAudit.path)
  ]);
  const input = JSON.parse(inputText);
  const gold = JSON.parse(goldText);
  const passA = JSON.parse(passAText);
  const passB = JSON.parse(passBText);
  const packet = JSON.parse(packetText);
  const adjudication = JSON.parse(adjudicationText);
  const finalLock = JSON.parse(finalLockText);
  const scoringInput = JSON.parse(scoringInputText);
  const sourceAudit = JSON.parse(sourceAuditText);
  const maps = {
    A: new Map(passA.annotations.map((item) => [item.caseId, item])),
    B: new Map(passB.annotations.map((item) => [item.caseId, item])),
    K: new Map(gold.annotations.map((item) => [item.caseId, item])),
    F: new Map(finalLock.cases.map((item) => [item.caseId, item.annotation]))
  };
  const rows = input.cases.map((challengeCase) => ({ challengeCase, A: maps.A.get(challengeCase.caseId), B: maps.B.get(challengeCase.caseId), K: maps.K.get(challengeCase.caseId), F: maps.F.get(challengeCase.caseId) }));
  allRows.push(...rows);
  mediumOrLowMoveCount += sourceAudit.mediumOrLowMoveCount;
  audioVerifiedMediumOrLowMoveCount += sourceAudit.audioVerifiedMediumOrLowMoveCount;
  debateStats.push({
    debateId: debate.debateId,
    debateNumber: debate.debateNumber,
    lane: debate.lane,
    role: debate.role,
    caseCount: rows.length,
    disputedCaseCount: packet.caseCount,
    disputeCount: packet.disputeCount,
    selectionCounts: Object.fromEntries(["A", "B", "novel"].map((selection) => [selection, adjudication.resolutions.filter((item) => item.selection === selection).length])),
    unresolvedDisputes: finalLock.audit.unresolvedDisputes,
    nondisputedAlterations: finalLock.audit.nondisputedAlterations,
    finalLockSha256: sha256(finalLockText),
    scoringInputSha256: sha256(scoringInputText)
  });
}

function comparisonMetrics(rows, leftKey, rightKey) {
  const componentPairs = rows.flatMap(({ [leftKey]: left, [rightKey]: right }) => left.componentContacts.map((item, index) => [item.contacted, right.componentContacts[index].contacted]));
  const leftRight = (selector) => mean(rows.map((row) => selector(row[leftKey], row.challengeCase) === selector(row[rightKey], row.challengeCase)));
  return {
    originalTargetContactExact: leftRight((item) => item.originalTargetContact),
    connectedExampleExact: leftRight((item) => item.connectedExample),
    scopeExact: leftRight((item) => item.scopeRelation),
    burdenAdjustmentExact: leftRight((item) => item.burdenAdjustment),
    componentContactMicroExact: mean(componentPairs.map(([left, right]) => left === right)),
    coverageExact: leftRight((item, challengeCase) => derivedTuple(challengeCase, item).coverage),
    defectTypeExact: leftRight((item) => item.defectType),
    consequenceExact: leftRight((item) => item.consequenceStated),
    diagnosticExact: leftRight(deriveDiagnostic),
    reframeExact: leftRight(deriveReframe),
    burdenRelevanceExact: leftRight((item, challengeCase) => derivedTuple(challengeCase, item).burdenRelevance),
    exactDerivedTupleExact: leftRight((item, challengeCase) => JSON.stringify(derivedTuple(challengeCase, item)))
  };
}

const rawAgreement = comparisonMetrics(allRows, "A", "B");
const finalAccuracy = comparisonMetrics(allRows, "F", "K");
const diagnosticGoldPositive = allRows.filter(({ K }) => deriveDiagnostic(K));
const reframeGoldPositive = allRows.filter(({ K }) => deriveReframe(K));
finalAccuracy.diagnosticPositiveRecall = mean(diagnosticGoldPositive.map(({ F }) => deriveDiagnostic(F)));
finalAccuracy.reframePositiveRecall = mean(reframeGoldPositive.map(({ F }) => deriveReframe(F)));
const finalByLane = Object.fromEntries(["dyadic", "multi-speaker"].map((lane) => [lane, comparisonMetrics(allRows.filter(({ challengeCase }) => challengeCase.lane === lane), "F", "K")]));
const thresholds = manifest.thresholds;
const gates = {
  finalOriginalTargetContactExact: finalAccuracy.originalTargetContactExact >= thresholds.finalOriginalTargetContactExact,
  finalScopeExact: finalAccuracy.scopeExact >= thresholds.finalScopeExact,
  finalBurdenAdjustmentExact: finalAccuracy.burdenAdjustmentExact >= thresholds.finalBurdenAdjustmentExact,
  finalComponentContactMicroExact: finalAccuracy.componentContactMicroExact >= thresholds.finalComponentContactMicroExact,
  finalCoverageExact: finalAccuracy.coverageExact >= thresholds.finalCoverageExact,
  finalDefectTypeExact: finalAccuracy.defectTypeExact >= thresholds.finalDefectTypeExact,
  finalConsequenceExact: finalAccuracy.consequenceExact >= thresholds.finalConsequenceExact,
  finalDiagnosticExact: finalAccuracy.diagnosticExact >= thresholds.finalDiagnosticExact,
  finalReframeExact: finalAccuracy.reframeExact >= thresholds.finalReframeExact,
  finalBurdenRelevanceExact: finalAccuracy.burdenRelevanceExact >= thresholds.finalBurdenRelevanceExact,
  finalExactDerivedTupleExact: finalAccuracy.exactDerivedTupleExact >= thresholds.finalExactDerivedTupleExact,
  finalDiagnosticPositiveRecall: finalAccuracy.diagnosticPositiveRecall >= thresholds.finalDiagnosticPositiveRecall,
  finalReframePositiveRecall: finalAccuracy.reframePositiveRecall >= thresholds.finalReframePositiveRecall,
  unresolvedDisputes: debateStats.reduce((sum, item) => sum + item.unresolvedDisputes, 0) <= thresholds.unresolvedDisputesMaximum,
  nondisputedAlterations: debateStats.reduce((sum, item) => sum + item.nondisputedAlterations, 0) <= thresholds.nondisputedAlterationsMaximum,
  mediumLowAudioVerificationRate: (mediumOrLowMoveCount ? audioVerifiedMediumOrLowMoveCount / mediumOrLowMoveCount : 1) >= thresholds.mediumLowAudioVerificationRate
};
const passed = Object.values(gates).every(Boolean);
const analysis = {
  schemaVersion: "3.0-retired-consensus-analysis",
  workflowVersion: manifest.workflowVersion,
  rubricVersion: manifest.rubricVersion,
  analyzedAt: new Date().toISOString(),
  sources: { manifestPath, manifestSha256: sha256(manifestText) },
  sample: { debateCount: manifest.sample.debateCount, caseCount: allRows.length, laneCounts: { dyadic: allRows.filter(({ challengeCase }) => challengeCase.lane === "dyadic").length, multiSpeaker: allRows.filter(({ challengeCase }) => challengeCase.lane === "multi-speaker").length }, diagnosticGoldPositiveCount: diagnosticGoldPositive.length, reframeGoldPositiveCount: reframeGoldPositive.length },
  rawPassAgreementMonitoring: rawAgreement,
  finalAdjudicatedAccuracy: finalAccuracy,
  finalAccuracyByLane: finalByLane,
  adjudication: { debates: debateStats, totalDisputedCases: debateStats.reduce((sum, item) => sum + item.disputedCaseCount, 0), totalDisputes: debateStats.reduce((sum, item) => sum + item.disputeCount, 0), selectionCounts: Object.fromEntries(["A", "B", "novel"].map((selection) => [selection, debateStats.reduce((sum, item) => sum + item.selectionCounts[selection], 0)])) },
  sourceGate: { mediumOrLowMoveCount, audioVerifiedMediumOrLowMoveCount, audioVerificationRate: mediumOrLowMoveCount ? audioVerifiedMediumOrLowMoveCount / mediumOrLowMoveCount : 1 },
  thresholds,
  gates,
  decision: {
    passed,
    retiredExecutionGatePassed: passed,
    heldOutGatePreregistrationAuthorized: passed,
    heldOutTranscriptsAuthorized: false,
    numericalScoringAuthorized: false,
    productionMutationAuthorized: false,
    nextStep: passed ? "Preregister a new disjoint held-out adjudicated-consensus classification gate before opening its transcripts." : "Freeze this retired test as failed and repair the adjudicated-consensus architecture without opening held-out material."
  }
};
const outputText = `${JSON.stringify(analysis, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, outputPath), outputText);
console.log(outputText);

