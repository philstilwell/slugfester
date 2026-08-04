#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V33_MODELS, compoundFields, deriveDiagnostic, deriveReframe, derivedTuple, sameSemantic, semanticValue, sha256
} from "./lib/v33-blind-bundles.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.3/retired-three-debate-test";
const shouldWrite = process.argv.includes("--write");
const manifestPath = `${gateRoot}/gate-manifest.json`, outputPath = `${gateRoot}/reliability-analysis.json`;
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(manifestPath), manifest = JSON.parse(manifestText);
const mean = (values) => values.length ? values.filter(Boolean).length / values.length : null;

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

const baseRows = [], variantRows = Object.fromEntries(Object.keys(V33_MODELS).map((key) => [key, []]));
const debateStats = Object.fromEntries(Object.keys(V33_MODELS).map((key) => [key, []]));
let mediumOrLowMoveCount = 0, audioVerifiedMediumOrLowMoveCount = 0, semanticFieldCount = 0;
for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId], source = debate.v32;
  const [inputText, goldText, passAText, passBText, sourceAuditText] = await Promise.all([read(source.input.path), read(source.gold.path), read(source.passA.path), read(source.passB.path), read(source.sourceAudit.path)]);
  const input = JSON.parse(inputText), gold = JSON.parse(goldText), passA = JSON.parse(passAText), passB = JSON.parse(passBText), sourceAudit = JSON.parse(sourceAuditText);
  const A = new Map(passA.annotations.map((item) => [item.caseId, item])), B = new Map(passB.annotations.map((item) => [item.caseId, item])), K = new Map(gold.annotations.map((item) => [item.caseId, item]));
  for (const challengeCase of input.cases) baseRows.push({ challengeCase, A: A.get(challengeCase.caseId), B: B.get(challengeCase.caseId), K: K.get(challengeCase.caseId), lane: debate.lane, debateId: debate.debateId });
  semanticFieldCount += input.cases.reduce((sum, item) => sum + compoundFields(A.get(item.caseId)).length, 0);
  mediumOrLowMoveCount += sourceAudit.mediumOrLowMoveCount;
  audioVerifiedMediumOrLowMoveCount += sourceAudit.audioVerifiedMediumOrLowMoveCount;
  for (const modelKey of Object.keys(V33_MODELS)) {
    const [mappingText, lockText] = await Promise.all([read(outputs.mappingResults[modelKey]), read(outputs.finalLocks[modelKey])]);
    const mapping = JSON.parse(mappingText), lock = JSON.parse(lockText), F = new Map(lock.cases.map((item) => [item.caseId, item.annotation]));
    for (const challengeCase of input.cases) variantRows[modelKey].push({ challengeCase, A: A.get(challengeCase.caseId), B: B.get(challengeCase.caseId), K: K.get(challengeCase.caseId), F: F.get(challengeCase.caseId), lane: debate.lane, debateId: debate.debateId });
    debateStats[modelKey].push({ debateId: debate.debateId, debateNumber: debate.debateNumber, lane: debate.lane, role: debate.role, caseCount: input.caseCount, decisionCount: mapping.audit.decisionCount, ...mapping.audit, unflaggedAlterations: lock.audit.unflaggedAlterations, unresolvedFields: lock.audit.unresolvedFields, finalLockSha256: sha256(lockText) });
  }
}

const rawPassAAccuracy = comparisonMetrics(baseRows, "A", "K"), rawPassBAccuracy = comparisonMetrics(baseRows, "B", "K"), crossModelAgreement = comparisonMetrics(baseRows, "A", "B");
const thresholds = manifest.thresholds;
const variantResults = {};
for (const modelKey of Object.keys(V33_MODELS)) {
  const rows = variantRows[modelKey], accuracy = comparisonMetrics(rows, "F", "K");
  const diagnosticGoldPositive = rows.filter(({ K }) => deriveDiagnostic(K)), reframeGoldPositive = rows.filter(({ K }) => deriveReframe(K));
  accuracy.diagnosticPositiveRecall = mean(diagnosticGoldPositive.map(({ F }) => deriveDiagnostic(F)));
  accuracy.reframePositiveRecall = mean(reframeGoldPositive.map(({ F }) => deriveReframe(F)));
  const semanticRows = rows.flatMap((row) => {
    const maps = Object.fromEntries(["A", "B", "K", "F"].map((key) => [key, new Map(compoundFields(row[key]))]));
    return [...maps.A].map(([fieldPath, aValue]) => {
      const bValue = maps.B.get(fieldPath), kValue = maps.K.get(fieldPath), fValue = maps.F.get(fieldPath);
      return { debateId: row.debateId, caseId: row.challengeCase.caseId, fieldPath, rawAgreement: sameSemantic(fieldPath, aValue, bValue), aExact: sameSemantic(fieldPath, aValue, kValue), bExact: sameSemantic(fieldPath, bValue, kValue), finalExact: sameSemantic(fieldPath, fValue, kValue), goldJson: JSON.stringify(semanticValue(fieldPath, kValue)), finalJson: JSON.stringify(semanticValue(fieldPath, fValue)) };
    });
  });
  const rawAgreements = semanticRows.filter((item) => item.rawAgreement), sharedErrors = rawAgreements.filter((item) => !item.aExact), conflicts = semanticRows.filter((item) => !item.rawAgreement);
  const stats = debateStats[modelKey], unresolvedFields = stats.reduce((sum, item) => sum + item.unresolvedFields, 0), unflaggedAlterations = stats.reduce((sum, item) => sum + item.unflaggedAlterations, 0), retries = stats.reduce((sum, item) => sum + item.modelSchemaOrInvariantRetries, 0), unmappedFields = stats.reduce((sum, item) => sum + item.unmappedFields, 0);
  const gates = {
    finalOriginalTargetContactExact: accuracy.originalTargetContactExact >= thresholds.finalOriginalTargetContactExact,
    finalScopeExact: accuracy.scopeExact >= thresholds.finalScopeExact,
    finalBurdenAdjustmentExact: accuracy.burdenAdjustmentExact >= thresholds.finalBurdenAdjustmentExact,
    finalComponentContactMicroExact: accuracy.componentContactMicroExact >= thresholds.finalComponentContactMicroExact,
    finalCoverageExact: accuracy.coverageExact >= thresholds.finalCoverageExact,
    finalDefectTypeExact: accuracy.defectTypeExact >= thresholds.finalDefectTypeExact,
    finalConsequenceExact: accuracy.consequenceExact >= thresholds.finalConsequenceExact,
    finalDiagnosticExact: accuracy.diagnosticExact >= thresholds.finalDiagnosticExact,
    finalReframeExact: accuracy.reframeExact >= thresholds.finalReframeExact,
    finalBurdenRelevanceExact: accuracy.burdenRelevanceExact >= thresholds.finalBurdenRelevanceExact,
    finalExactDerivedTupleExact: accuracy.exactDerivedTupleExact >= thresholds.finalExactDerivedTupleExact,
    finalDiagnosticPositiveRecall: accuracy.diagnosticPositiveRecall >= thresholds.finalDiagnosticPositiveRecall,
    finalReframePositiveRecall: accuracy.reframePositiveRecall >= thresholds.finalReframePositiveRecall,
    unresolvedFields: unresolvedFields <= thresholds.unresolvedDisputesMaximum,
    unmappedFields: unmappedFields <= thresholds.unmappedFieldsMaximum,
    unflaggedAlterations: unflaggedAlterations <= thresholds.nondisputedAlterationsMaximum,
    modelSchemaOrInvariantRetries: retries <= thresholds.modelSchemaOrInvariantRetriesMaximum,
    mediumLowAudioVerificationRate: (mediumOrLowMoveCount ? audioVerifiedMediumOrLowMoveCount / mediumOrLowMoveCount : 1) >= thresholds.mediumLowAudioVerificationRate
  };
  variantResults[modelKey] = {
    model: V33_MODELS[modelKey], accuracy,
    semanticReliability: { rawAgreementCount: rawAgreements.length, sharedRawErrorCount: sharedErrors.length, sharedRawErrorsCorrected: sharedErrors.filter((item) => item.finalExact).length, sharedRawErrorCorrectionRate: mean(sharedErrors.map((item) => item.finalExact)), semanticConflictCount: conflicts.length, conflictsWithCorrectCandidate: conflicts.filter((item) => item.aExact || item.bExact).length, blindCorrectOnConflicts: conflicts.filter((item) => item.finalExact).length, blindConflictAccuracy: mean(conflicts.map((item) => item.finalExact)) },
    execution: { unresolvedFields, unmappedFields, unflaggedAlterations, modelSchemaOrInvariantRetries: retries, contextsExecuted: manifest.sample.debateCount },
    debates: stats, gates, passed: Object.values(gates).every(Boolean)
  };
}

const qualifying = Object.keys(variantResults).filter((key) => variantResults[key].passed);
const selectedModelKey = qualifying.includes("terra") ? "terra" : qualifying.length === 1 ? qualifying[0] : null;
const analysis = {
  schemaVersion: "3.3-retired-blind-analysis", workflowVersion: manifest.workflowVersion, rubricVersion: manifest.rubricVersion, analyzedAt: new Date().toISOString(),
  sources: { manifestPath, manifestSha256: sha256(manifestText) },
  sample: { debateCount: manifest.sample.debateCount, caseCount: baseRows.length, semanticFieldCount, bundleCount: manifest.sample.bundleCount, routedDecisionCount: manifest.sample.decisionCount },
  rawPassAAccuracy, rawPassBAccuracy, crossModelAgreementMonitoring: crossModelAgreement, variants: variantResults,
  sourceGate: { mediumOrLowMoveCount, audioVerifiedMediumOrLowMoveCount, audioVerificationRate: mediumOrLowMoveCount ? audioVerifiedMediumOrLowMoveCount / mediumOrLowMoveCount : 1 },
  thresholds,
  decision: {
    passed: selectedModelKey !== null, qualifyingVariants: qualifying, selectedModelKey, selectedModel: selectedModelKey ? V33_MODELS[selectedModelKey] : null,
    retiredBakeoffPassed: selectedModelKey !== null, disjointRetiredConfirmationAuthorized: selectedModelKey !== null,
    heldOutGatePreregistrationAuthorized: false, heldOutTranscriptsAuthorized: false, numericalScoringAuthorized: false, productionMutationAuthorized: false,
    nextStep: selectedModelKey ? `Run one disjoint retired confirmation using ${V33_MODELS[selectedModelKey]} under the frozen v3.3 architecture.` : "Freeze v3.3 as failed; do not open held-out material, score participants, or mutate production debates."
  }
};
const outputText = `${JSON.stringify(analysis, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, outputPath), outputText);
console.log(outputText);

