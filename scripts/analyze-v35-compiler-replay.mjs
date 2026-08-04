#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  compoundFields, deriveDiagnostic, deriveReframe, derivedTuple, sameSemantic, semanticValue, sha256, validateAnnotation
} from "./lib/v34-conservative-review.mjs";
import { assert } from "./lib/v35-semantic-compiler.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.5/v34-six-review-replay";
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`), manifest = JSON.parse(manifestText);
const replaySummaryText = await read(manifest.replaySummaryPath), replaySummary = JSON.parse(replaySummaryText);
const mean = (values) => values.length ? values.filter(Boolean).length / values.length : null;

function comparisonMetrics(rows, leftKey, rightKey) {
  const componentPairs = rows.flatMap(({ [leftKey]: left, [rightKey]: right }) => left.componentContacts.map((item, index) => [item.contacted, right.componentContacts[index].contacted]));
  const exact = (selector) => mean(rows.map((row) => selector(row[leftKey], row.challengeCase) === selector(row[rightKey], row.challengeCase)));
  return {
    originalTargetContactExact: exact((item) => item.originalTargetContact),
    connectedExampleExact: exact((item) => item.connectedExample),
    scopeExact: exact((item) => item.scopeRelation),
    burdenAdjustmentExact: exact((item) => item.burdenAdjustment),
    componentContactMicroExact: mean(componentPairs.map(([left, right]) => left === right)),
    coverageExact: exact((item, challengeCase) => derivedTuple(challengeCase, item).coverage),
    defectTypeExact: exact((item) => item.defectType),
    consequenceExact: exact((item) => item.consequenceStated),
    diagnosticExact: exact(deriveDiagnostic),
    reframeExact: exact(deriveReframe),
    burdenRelevanceExact: exact((item, challengeCase) => derivedTuple(challengeCase, item).burdenRelevance),
    exactDerivedTupleExact: exact((item, challengeCase) => JSON.stringify(derivedTuple(challengeCase, item)))
  };
}

const rows = [], semanticFieldRows = [];
let audioMediumLow = 0, audioVerifiedMediumLow = 0;
for (const debate of manifest.sample.debates) {
  const [inputText, aText, bText, goldText, lockText, auditText] = await Promise.all([
    read(debate.fixtures.input.path), read(debate.fixtures.passA.path), read(debate.fixtures.passB.path), read(debate.gold.path), read(manifest.outputs[debate.debateId].replayLock), read(debate.fixtures.sourceAudit.path)
  ]);
  assert(sha256(goldText) === debate.gold.sha256, `${debate.debateId}: evaluator-only gold hash mismatch`);
  const input = JSON.parse(inputText), A = JSON.parse(aText), B = JSON.parse(bText), K = JSON.parse(goldText), lock = JSON.parse(lockText), audit = JSON.parse(auditText);
  audioMediumLow += audit.mediumOrLowMoveCount;
  audioVerifiedMediumLow += audit.audioVerifiedMediumOrLowMoveCount;
  const maps = Object.fromEntries(Object.entries({ A: A.annotations, B: B.annotations, K: K.annotations, F: lock.cases.map((item) => item.annotation) }).map(([key, values]) => [key, new Map(values.map((item) => [item.caseId, item]))]));
  const provenance = new Map(lock.cases.flatMap((item) => item.provenance.map((field) => [`${item.caseId}::${field.fieldPath}`, field])));
  for (const challengeCase of input.cases) {
    const row = { challengeCase, debateId: debate.debateId, A: maps.A.get(challengeCase.caseId), B: maps.B.get(challengeCase.caseId), K: maps.K.get(challengeCase.caseId), F: maps.F.get(challengeCase.caseId) };
    for (const key of ["A", "B", "K", "F"]) validateAnnotation(row[key], challengeCase, `${debate.debateId}.${challengeCase.caseId}.${key}`);
    const fieldMaps = Object.fromEntries(["A", "B", "K", "F"].map((key) => [key, new Map(compoundFields(row[key]))]));
    for (const [fieldPath, aValue] of fieldMaps.A) {
      const bValue = fieldMaps.B.get(fieldPath), kValue = fieldMaps.K.get(fieldPath), fValue = fieldMaps.F.get(fieldPath);
      const provenancePath = ["defect", "consequence"].includes(fieldPath) ? "diagnosticBundle" : fieldPath;
      const p = provenance.get(`${challengeCase.caseId}::${provenancePath}`);
      semanticFieldRows.push({
        debateId: debate.debateId, caseId: challengeCase.caseId, fieldPath,
        rawAgreement: sameSemantic(fieldPath, aValue, bValue),
        aExact: sameSemantic(fieldPath, aValue, kValue), bExact: sameSemantic(fieldPath, bValue, kValue), finalExact: sameSemantic(fieldPath, fValue, kValue),
        disposition: p?.disposition ?? "compiler-projection", goldJson: JSON.stringify(semanticValue(fieldPath, kValue)), finalJson: JSON.stringify(semanticValue(fieldPath, fValue))
      });
    }
    rows.push(row);
  }
}

const metrics = {
  rawPassAAccuracy: comparisonMetrics(rows, "A", "K"),
  rawPassBAccuracy: comparisonMetrics(rows, "B", "K"),
  replayFinalAccuracy: comparisonMetrics(rows, "F", "K")
};
const diagnosticGoldPositive = rows.filter(({ K }) => deriveDiagnostic(K));
const reframeGoldPositive = rows.filter(({ K }) => deriveReframe(K));
metrics.replayFinalAccuracy.diagnosticPositiveRecall = mean(diagnosticGoldPositive.map(({ F }) => deriveDiagnostic(F)));
metrics.replayFinalAccuracy.reframePositiveRecall = mean(reframeGoldPositive.map(({ F }) => deriveReframe(F)));

const compilerThresholds = manifest.compilerGateThresholds;
const compilerGates = {
  compiledArtifactCount: replaySummary.structural.compiledArtifactCount === compilerThresholds.compiledArtifactCount,
  compiledReviewCaseCount: replaySummary.structural.compiledReviewCaseCount === compilerThresholds.compiledReviewCaseCount,
  replayLockCaseCount: replaySummary.structural.replayLockCaseCount === compilerThresholds.replayLockCaseCount,
  validCompiledReviewRate: replaySummary.structural.validCompiledReviewCount / replaySummary.structural.compiledReviewCaseCount === compilerThresholds.validCompiledReviewRate,
  validReplayLockRate: replaySummary.structural.validReplayLockCount / replaySummary.structural.replayLockCaseCount === compilerThresholds.validReplayLockRate,
  mediumLowAudioVerificationRate: audioVerifiedMediumLow / audioMediumLow === compilerThresholds.mediumLowAudioVerificationRate,
  discretionaryRepairs: replaySummary.structural.discretionaryRepairs <= compilerThresholds.discretionaryRepairsMaximum,
  fallbackCases: replaySummary.structural.fallbackCases <= compilerThresholds.fallbackCasesMaximum,
  modelContexts: replaySummary.execution.modelContextsExecuted <= compilerThresholds.modelContextsMaximum,
  scoringFields: replaySummary.structural.scoringFields <= compilerThresholds.scoringFieldsMaximum
};
const thresholds = manifest.semanticReadinessThresholds;
const semanticGates = {
  finalOriginalTargetContactExact: metrics.replayFinalAccuracy.originalTargetContactExact >= thresholds.finalOriginalTargetContactExact,
  finalScopeExact: metrics.replayFinalAccuracy.scopeExact >= thresholds.finalScopeExact,
  finalBurdenAdjustmentExact: metrics.replayFinalAccuracy.burdenAdjustmentExact >= thresholds.finalBurdenAdjustmentExact,
  finalComponentContactMicroExact: metrics.replayFinalAccuracy.componentContactMicroExact >= thresholds.finalComponentContactMicroExact,
  finalCoverageExact: metrics.replayFinalAccuracy.coverageExact >= thresholds.finalCoverageExact,
  finalDefectTypeExact: metrics.replayFinalAccuracy.defectTypeExact >= thresholds.finalDefectTypeExact,
  finalConsequenceExact: metrics.replayFinalAccuracy.consequenceExact >= thresholds.finalConsequenceExact,
  finalDiagnosticExact: metrics.replayFinalAccuracy.diagnosticExact >= thresholds.finalDiagnosticExact,
  finalReframeExact: metrics.replayFinalAccuracy.reframeExact >= thresholds.finalReframeExact,
  finalBurdenRelevanceExact: metrics.replayFinalAccuracy.burdenRelevanceExact >= thresholds.finalBurdenRelevanceExact,
  finalExactDerivedTupleExact: metrics.replayFinalAccuracy.exactDerivedTupleExact >= thresholds.finalExactDerivedTupleExact,
  finalDiagnosticPositiveRecall: metrics.replayFinalAccuracy.diagnosticPositiveRecall >= thresholds.finalDiagnosticPositiveRecall,
  finalReframePositiveRecall: metrics.replayFinalAccuracy.reframePositiveRecall >= thresholds.finalReframePositiveRecall,
  unresolvedFields: replaySummary.structural.unresolvedFields <= thresholds.unresolvedFieldsMaximum
};
const rawAgreements = semanticFieldRows.filter((item) => item.rawAgreement), conflicts = semanticFieldRows.filter((item) => !item.rawAgreement);
const sharedErrors = rawAgreements.filter((item) => !item.aExact), correctShared = rawAgreements.filter((item) => item.aExact);
const compilerPassed = Object.values(compilerGates).every(Boolean), semanticReady = Object.values(semanticGates).every(Boolean);
const analysis = {
  schemaVersion: "3.5-compiler-replay-analysis",
  analyzedAt: manifest.frozenAt,
  status: compilerPassed && semanticReady ? "compiler-and-semantics-pass" : compilerPassed ? "compiler-pass-semantic-fail" : "compiler-fail",
  warning: "This retrospective development replay adds no independent model judgment and cannot establish generalization.",
  sources: { manifestSha256: sha256(manifestText), replaySummarySha256: sha256(replaySummaryText) },
  sample: { debateCount: manifest.sample.debateCount, caseCount: rows.length, semanticFieldCount: semanticFieldRows.length, mediumOrLowMoveCount: audioMediumLow, audioVerifiedMediumOrLowMoveCount: audioVerifiedMediumLow },
  execution: replaySummary.execution,
  compiler: { gates: compilerGates, passed: compilerPassed, structural: replaySummary.structural },
  semanticMonitoring: metrics,
  reliability: {
    rawAgreementCount: rawAgreements.length,
    sharedRawErrorCount: sharedErrors.length,
    sharedRawErrorsCorrected: sharedErrors.filter((item) => item.finalExact).length,
    correctedSharedErrors: sharedErrors.filter((item) => item.finalExact).map(({ debateId, caseId, fieldPath, disposition, finalJson, goldJson }) => ({ debateId, caseId, fieldPath, disposition, finalJson, goldJson })),
    correctSharedRawValuesHarmed: correctShared.filter((item) => !item.finalExact).length,
    harmedCorrectSharedValues: correctShared.filter((item) => !item.finalExact).map(({ debateId, caseId, fieldPath, disposition, finalJson, goldJson }) => ({ debateId, caseId, fieldPath, disposition, finalJson, goldJson })),
    conflictCount: conflicts.length,
    conflictsCorrect: conflicts.filter((item) => item.finalExact).length,
    conflictAccuracy: mean(conflicts.map((item) => item.finalExact)),
    unresolvedFields: replaySummary.structural.unresolvedFields
  },
  semanticGates,
  semanticReady,
  decision: {
    compilerPassed,
    semanticReady,
    disjointRetiredModelTestAuthorized: compilerPassed && semanticReady,
    heldOutAccessAuthorized: false,
    numericalScoringAuthorized: false,
    productionMutationAuthorized: false
  }
};
const outputText = `${JSON.stringify(analysis, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, manifest.semanticAnalysisPath), outputText);
else assert(await read(manifest.semanticAnalysisPath) === outputText, "semantic analysis is not deterministic or is stale");
console.log(outputText);
