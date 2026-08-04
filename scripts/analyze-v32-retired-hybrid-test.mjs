#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { compoundFields, deriveDiagnostic, deriveReframe, derivedTuple, sameSemantic, semanticValue, sha256 } from "./lib/v32-risk-adjudication.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.2/retired-three-debate-test";
const manifestPath = `${gateRoot}/gate-manifest.json`, outputPath = `${gateRoot}/reliability-analysis.json`;
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(manifestPath), manifest = JSON.parse(manifestText);
const mean = (values) => values.length ? values.filter(Boolean).length / values.length : null;
const allRows = [], debateStats = [];
let mediumOrLowMoveCount = 0, audioVerifiedMediumOrLowMoveCount = 0;
for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId];
  const [inputText, goldText, passAText, passBText, packetText, adjudicationText, finalText, scoringText, sourceAuditText] = await Promise.all([
    read(debate.path), read(debate.gold.path), read(outputs.passA), read(outputs.passB), read(outputs.disputePacket), read(outputs.adjudication), read(outputs.finalLock), read(outputs.scoringInput), read(debate.sourceAudit.path)
  ]);
  const input = JSON.parse(inputText), gold = JSON.parse(goldText), passA = JSON.parse(passAText), passB = JSON.parse(passBText);
  const packet = JSON.parse(packetText), adjudication = JSON.parse(adjudicationText), finalLock = JSON.parse(finalText), sourceAudit = JSON.parse(sourceAuditText);
  const maps = {
    A: new Map(passA.annotations.map((item) => [item.caseId, item])), B: new Map(passB.annotations.map((item) => [item.caseId, item])),
    K: new Map(gold.annotations.map((item) => [item.caseId, item])), F: new Map(finalLock.cases.map((item) => [item.caseId, item.annotation]))
  };
  const packetMap = new Map();
  for (const itemCase of packet.cases) for (const field of itemCase.fields) packetMap.set(`${field.caseId}::${field.fieldPath}`, field);
  const resolutionMap = new Map(adjudication.resolutions.map((item) => [item.disputeId, item]));
  allRows.push(...input.cases.map((challengeCase) => ({ challengeCase, packetMap, resolutionMap, A: maps.A.get(challengeCase.caseId), B: maps.B.get(challengeCase.caseId), K: maps.K.get(challengeCase.caseId), F: maps.F.get(challengeCase.caseId), lane: debate.lane })));
  mediumOrLowMoveCount += sourceAudit.mediumOrLowMoveCount;
  audioVerifiedMediumOrLowMoveCount += sourceAudit.audioVerifiedMediumOrLowMoveCount;
  debateStats.push({
    debateId: debate.debateId, debateNumber: debate.debateNumber, lane: debate.lane, role: debate.role, caseCount: input.caseCount, fieldCount: packet.fieldCount,
    counts: packet.counts, selectionCounts: Object.fromEntries(["A", "B", "retain", "override"].map((key) => [key, adjudication.resolutions.filter((item) => item.selection === key).length])),
    unflaggedAlterations: finalLock.audit.unflaggedAlterations, unresolvedFields: finalLock.audit.unresolvedFields,
    finalLockSha256: sha256(finalText), scoringInputSha256: sha256(scoringText)
  });
}

function comparisonMetrics(rows, leftKey, rightKey) {
  const componentPairs = rows.flatMap(({ [leftKey]: left, [rightKey]: right }) => left.componentContacts.map((item, index) => [item.contacted, right.componentContacts[index].contacted]));
  const exact = (selector) => mean(rows.map((row) => selector(row[leftKey], row.challengeCase) === selector(row[rightKey], row.challengeCase)));
  return {
    originalTargetContactExact: exact((item) => item.originalTargetContact), connectedExampleExact: exact((item) => item.connectedExample),
    scopeExact: exact((item) => item.scopeRelation), burdenAdjustmentExact: exact((item) => item.burdenAdjustment),
    componentContactMicroExact: mean(componentPairs.map(([left, right]) => left === right)), coverageExact: exact((item, challengeCase) => derivedTuple(challengeCase, item).coverage),
    defectTypeExact: exact((item) => item.defectType), consequenceExact: exact((item) => item.consequenceStated), diagnosticExact: exact(deriveDiagnostic),
    reframeExact: exact(deriveReframe), burdenRelevanceExact: exact((item, challengeCase) => derivedTuple(challengeCase, item).burdenRelevance),
    exactDerivedTupleExact: exact((item, challengeCase) => JSON.stringify(derivedTuple(challengeCase, item)))
  };
}

const semanticRows = allRows.flatMap((row) => {
  const maps = Object.fromEntries(["A", "B", "K", "F"].map((key) => [key, new Map(compoundFields(row[key]))]));
  return [...maps.A].map(([fieldPath, aValue]) => {
    const bValue = maps.B.get(fieldPath), kValue = maps.K.get(fieldPath), fValue = maps.F.get(fieldPath);
    const packetItem = row.packetMap.get(`${row.challengeCase.caseId}::${fieldPath}`), resolution = packetItem ? row.resolutionMap.get(packetItem.disputeId) : null;
    return {
      debateId: row.challengeCase.debateId, caseId: row.challengeCase.caseId, fieldPath, packetKind: packetItem?.triggerKind ?? null, selection: resolution?.selection ?? null,
      rawAgreement: sameSemantic(fieldPath, aValue, bValue), aExact: sameSemantic(fieldPath, aValue, kValue), bExact: sameSemantic(fieldPath, bValue, kValue),
      finalExact: sameSemantic(fieldPath, fValue, kValue), finalMatchesA: sameSemantic(fieldPath, fValue, aValue),
      goldJson: JSON.stringify(semanticValue(fieldPath, kValue)), finalJson: JSON.stringify(semanticValue(fieldPath, fValue))
    };
  });
});
const rawAgreements = semanticRows.filter((item) => item.rawAgreement), sharedErrors = rawAgreements.filter((item) => !item.aExact);
const conflicts = semanticRows.filter((item) => !item.rawAgreement), overrides = semanticRows.filter((item) => item.selection === "override");
const finalAccuracy = comparisonMetrics(allRows, "F", "K");
const diagnosticGoldPositive = allRows.filter(({ K }) => deriveDiagnostic(K)), reframeGoldPositive = allRows.filter(({ K }) => deriveReframe(K));
finalAccuracy.diagnosticPositiveRecall = mean(diagnosticGoldPositive.map(({ F }) => deriveDiagnostic(F)));
finalAccuracy.reframePositiveRecall = mean(reframeGoldPositive.map(({ F }) => deriveReframe(F)));
const passAAccuracy = comparisonMetrics(allRows, "A", "K"), passBAccuracy = comparisonMetrics(allRows, "B", "K"), rawAgreement = comparisonMetrics(allRows, "A", "B");
const thresholds = manifest.thresholds;
const unflaggedAlterations = debateStats.reduce((sum, item) => sum + item.unflaggedAlterations, 0), unresolvedFields = debateStats.reduce((sum, item) => sum + item.unresolvedFields, 0);
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
  unresolvedFields: unresolvedFields <= thresholds.unresolvedDisputesMaximum,
  unflaggedAlterations: unflaggedAlterations <= thresholds.nondisputedAlterationsMaximum,
  mediumLowAudioVerificationRate: (mediumOrLowMoveCount ? audioVerifiedMediumOrLowMoveCount / mediumOrLowMoveCount : 1) >= thresholds.mediumLowAudioVerificationRate
};
const passed = Object.values(gates).every(Boolean);
let v31Accuracy = null;
try { v31Accuracy = JSON.parse(await read("docs/calibration/v3.1/retired-three-debate-test/reliability-analysis.json")).finalFocusedAccuracy; } catch {}
const analysis = {
  schemaVersion: "3.2-retired-hybrid-analysis", workflowVersion: manifest.workflowVersion, rubricVersion: manifest.rubricVersion, analyzedAt: new Date().toISOString(),
  sources: { manifestPath, manifestSha256: sha256(manifestText) }, sample: { debateCount: manifest.sample.debateCount, caseCount: allRows.length, semanticFieldCount: semanticRows.length, diagnosticGoldPositiveCount: diagnosticGoldPositive.length, reframeGoldPositiveCount: reframeGoldPositive.length },
  passAAccuracy, passBAccuracy, crossModelAgreementMonitoring: rawAgreement, finalHybridAccuracy: finalAccuracy,
  semanticReliability: {
    rawAgreementCount: rawAgreements.length, sharedRawErrorCount: sharedErrors.length, sharedRawErrorRate: mean(rawAgreements.map((item) => !item.aExact)),
    sharedErrorsRiskCaptured: sharedErrors.filter((item) => item.packetKind !== null).length, sharedErrorRiskCaptureRate: mean(sharedErrors.map((item) => item.packetKind !== null)),
    sharedErrorsCorrected: sharedErrors.filter((item) => item.finalExact).length, sharedErrorCorrectionRate: mean(sharedErrors.map((item) => item.finalExact)),
    semanticConflictCount: conflicts.length, conflictsWithCorrectCandidate: conflicts.filter((item) => item.aExact || item.bExact).length,
    adjudicatorCorrectOnConflicts: conflicts.filter((item) => item.finalExact).length, adjudicatorConflictAccuracy: mean(conflicts.map((item) => item.finalExact)),
    agreementOverrideCount: overrides.length, correctAgreementOverrides: overrides.filter((item) => item.finalExact && !item.aExact).length,
    harmfulAgreementOverrides: overrides.filter((item) => !item.finalExact && item.aExact).length, wrongToDifferentWrongOverrides: overrides.filter((item) => !item.finalExact && !item.aExact).length
  },
  adjudication: { debates: debateStats, completeContexts: manifest.sample.debateCount * 2, adjudicatorContexts: manifest.sample.debateCount },
  sourceGate: { mediumOrLowMoveCount, audioVerifiedMediumOrLowMoveCount, audioVerificationRate: mediumOrLowMoveCount ? audioVerifiedMediumOrLowMoveCount / mediumOrLowMoveCount : 1 },
  comparisonToV31: v31Accuracy ? Object.fromEntries(Object.keys(finalAccuracy).filter((key) => typeof finalAccuracy[key] === "number" && typeof v31Accuracy[key] === "number").map((key) => [key, finalAccuracy[key] - v31Accuracy[key]])) : null,
  thresholds, gates,
  decision: {
    passed, retiredExecutionGatePassed: passed, heldOutGatePreregistrationAuthorized: passed, heldOutTranscriptsAuthorized: false,
    numericalScoringAuthorized: false, productionMutationAuthorized: false,
    nextStep: passed ? "Preregister a new disjoint held-out hybrid classification gate before opening its transcripts." : "Freeze v3.2 as failed; do not open held-out material or score production debates."
  }
};
const outputText = `${JSON.stringify(analysis, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, outputPath), outputText);
console.log(outputText);
