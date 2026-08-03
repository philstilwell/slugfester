#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { compoundFields, deriveDiagnostic, deriveReframe, derivedTuple, sameSemantic, semanticValue, sha256 } from "./lib/v31-verification.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.1/retired-three-debate-test";
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
  const [inputText, goldText, passAText, passBText, disagreementText, finalLockText, scoringInputText, sourceAuditText] = await Promise.all([
    read(debate.path), read(debate.gold.path), read(outputs.passA), read(outputs.passB), read(outputs.semanticDisagreements), read(outputs.finalLock), read(outputs.scoringInput), read(debate.sourceAudit.path)
  ]);
  const input = JSON.parse(inputText);
  const gold = JSON.parse(goldText);
  const passA = JSON.parse(passAText);
  const passB = JSON.parse(passBText);
  const disagreement = JSON.parse(disagreementText);
  const finalLock = JSON.parse(finalLockText);
  const scoringInput = JSON.parse(scoringInputText);
  const sourceAudit = JSON.parse(sourceAuditText);
  const maps = {
    A: new Map(passA.annotations.map((item) => [item.caseId, item])), B: new Map(passB.annotations.map((item) => [item.caseId, item])),
    K: new Map(gold.annotations.map((item) => [item.caseId, item])), F: new Map(finalLock.cases.map((item) => [item.caseId, item.annotation]))
  };
  const rows = input.cases.map((challengeCase) => ({ challengeCase, A: maps.A.get(challengeCase.caseId), B: maps.B.get(challengeCase.caseId), K: maps.K.get(challengeCase.caseId), F: maps.F.get(challengeCase.caseId) }));
  allRows.push(...rows);
  mediumOrLowMoveCount += sourceAudit.mediumOrLowMoveCount;
  audioVerifiedMediumOrLowMoveCount += sourceAudit.audioVerifiedMediumOrLowMoveCount;
  debateStats.push({
    debateId: debate.debateId, debateNumber: debate.debateNumber, lane: debate.lane, role: debate.role, caseCount: rows.length,
    fieldCount: disagreement.fieldCount, disagreementCounts: disagreement.counts,
    sharedAgreementOverrides: finalLock.audit.sharedAgreementOverrides, semanticConflictResolutions: finalLock.audit.semanticConflictResolutions,
    evidenceCanonicalizations: finalLock.audit.evidenceCanonicalizations, unresolvedFields: finalLock.audit.unresolvedFields,
    finalLockSha256: sha256(finalLockText), scoringInputSha256: sha256(scoringInputText)
  });
}

function comparisonMetrics(rows, leftKey, rightKey) {
  const componentPairs = rows.flatMap(({ [leftKey]: left, [rightKey]: right }) => left.componentContacts.map((item, index) => [item.contacted, right.componentContacts[index].contacted]));
  const leftRight = (selector) => mean(rows.map((row) => selector(row[leftKey], row.challengeCase) === selector(row[rightKey], row.challengeCase)));
  return {
    originalTargetContactExact: leftRight((item) => item.originalTargetContact), connectedExampleExact: leftRight((item) => item.connectedExample),
    scopeExact: leftRight((item) => item.scopeRelation), burdenAdjustmentExact: leftRight((item) => item.burdenAdjustment),
    componentContactMicroExact: mean(componentPairs.map(([left, right]) => left === right)), coverageExact: leftRight((item, challengeCase) => derivedTuple(challengeCase, item).coverage),
    defectTypeExact: leftRight((item) => item.defectType), consequenceExact: leftRight((item) => item.consequenceStated), diagnosticExact: leftRight(deriveDiagnostic),
    reframeExact: leftRight(deriveReframe), burdenRelevanceExact: leftRight((item, challengeCase) => derivedTuple(challengeCase, item).burdenRelevance),
    exactDerivedTupleExact: leftRight((item, challengeCase) => JSON.stringify(derivedTuple(challengeCase, item)))
  };
}

const semanticRows = allRows.flatMap((row) => {
  const bFields = new Map(compoundFields(row.B));
  const kFields = new Map(compoundFields(row.K));
  const fFields = new Map(compoundFields(row.F));
  return compoundFields(row.A).map(([fieldPath, aValue]) => {
    const bValue = bFields.get(fieldPath), kValue = kFields.get(fieldPath), fValue = fFields.get(fieldPath);
    const rawAgreement = sameSemantic(fieldPath, aValue, bValue);
    const rawAExact = sameSemantic(fieldPath, aValue, kValue), rawBExact = sameSemantic(fieldPath, bValue, kValue), finalExact = sameSemantic(fieldPath, fValue, kValue);
    return { debateId: row.challengeCase.debateId, caseId: row.challengeCase.caseId, fieldPath, rawAgreement, rawAExact, rawBExact, finalExact, finalOverridesAgreement: rawAgreement && !sameSemantic(fieldPath, fValue, aValue), goldJson: JSON.stringify(semanticValue(fieldPath, kValue)), finalJson: JSON.stringify(semanticValue(fieldPath, fValue)) };
  });
});
const rawAgreements = semanticRows.filter((item) => item.rawAgreement);
const sharedRawErrors = rawAgreements.filter((item) => !item.rawAExact);
const sharedErrorsCorrected = sharedRawErrors.filter((item) => item.finalExact);
const semanticConflicts = semanticRows.filter((item) => !item.rawAgreement);
const conflictWithCorrectCandidate = semanticConflicts.filter((item) => item.rawAExact || item.rawBExact);
const finalAccuracy = comparisonMetrics(allRows, "F", "K");
const diagnosticGoldPositive = allRows.filter(({ K }) => deriveDiagnostic(K));
const reframeGoldPositive = allRows.filter(({ K }) => deriveReframe(K));
finalAccuracy.diagnosticPositiveRecall = mean(diagnosticGoldPositive.map(({ F }) => deriveDiagnostic(F)));
finalAccuracy.reframePositiveRecall = mean(reframeGoldPositive.map(({ F }) => deriveReframe(F)));
const rawAgreement = comparisonMetrics(allRows, "A", "B");
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
  unresolvedFields: debateStats.reduce((sum, item) => sum + item.unresolvedFields, 0) <= thresholds.unresolvedDisputesMaximum,
  mediumLowAudioVerificationRate: (mediumOrLowMoveCount ? audioVerifiedMediumOrLowMoveCount / mediumOrLowMoveCount : 1) >= thresholds.mediumLowAudioVerificationRate
};
const passed = Object.values(gates).every(Boolean);
let v30FinalAccuracy = null;
try { v30FinalAccuracy = JSON.parse(await read("docs/calibration/v3.0/retired-three-debate-test/reliability-analysis.json")).finalAdjudicatedAccuracy; } catch {}
const analysis = {
  schemaVersion: "3.1-retired-focused-verification-analysis", workflowVersion: manifest.workflowVersion, rubricVersion: manifest.rubricVersion,
  analyzedAt: new Date().toISOString(), sources: { manifestPath, manifestSha256: sha256(manifestText) },
  sample: { debateCount: manifest.sample.debateCount, caseCount: allRows.length, semanticFieldCount: semanticRows.length, diagnosticGoldPositiveCount: diagnosticGoldPositive.length, reframeGoldPositiveCount: reframeGoldPositive.length },
  rawPassAgreementMonitoring: rawAgreement, finalFocusedAccuracy: finalAccuracy,
  semanticReliability: {
    rawAgreementCount: rawAgreements.length, sharedRawErrorCount: sharedRawErrors.length, sharedRawErrorRate: mean(rawAgreements.map((item) => item.rawAExact === false)),
    sharedErrorsCorrected: sharedErrorsCorrected.length, sharedErrorCorrectionRate: mean(sharedRawErrors.map((item) => item.finalExact)),
    semanticConflictCount: semanticConflicts.length, conflictsWithCorrectRawCandidate: conflictWithCorrectCandidate.length,
    focusedCorrectOnSemanticConflicts: semanticConflicts.filter((item) => item.finalExact).length, focusedSemanticConflictAccuracy: mean(semanticConflicts.map((item) => item.finalExact)),
    focusedOverrideCount: semanticRows.filter((item) => item.finalOverridesAgreement).length
  },
  verification: { debates: debateStats, familyContexts: manifest.sample.debateCount * 4, rawContexts: manifest.sample.debateCount * 2 },
  sourceGate: { mediumOrLowMoveCount, audioVerifiedMediumOrLowMoveCount, audioVerificationRate: mediumOrLowMoveCount ? audioVerifiedMediumOrLowMoveCount / mediumOrLowMoveCount : 1 },
  comparisonToV30: v30FinalAccuracy ? Object.fromEntries(Object.keys(finalAccuracy).filter((key) => typeof finalAccuracy[key] === "number" && typeof v30FinalAccuracy[key] === "number").map((key) => [key, finalAccuracy[key] - v30FinalAccuracy[key]])) : null,
  thresholds, gates,
  decision: {
    passed, retiredExecutionGatePassed: passed, heldOutGatePreregistrationAuthorized: passed, heldOutTranscriptsAuthorized: false,
    numericalScoringAuthorized: false, productionMutationAuthorized: false,
    nextStep: passed ? "Preregister a new disjoint held-out focused-verification classification gate before opening its transcripts." : "Freeze this attempt, preserve the AI-only assumption, and use the measured error profile to select the next model-only repair."
  }
};
const outputText = `${JSON.stringify(analysis, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, outputPath), outputText);
console.log(outputText);
