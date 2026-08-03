#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  canonicalBridges, canonicalDiagnosticObject, canonicalOperations, cohenKappa, derivedTuple,
  deriveDiagnostic, deriveReframe, deriveTargetDisposition, equal,
} from "./lib/v282-semantics.mjs";

const root = process.cwd();
const directory = "docs/calibration/v2.8/development/attempt-3";
const inputPath = `${directory}/challenge-input.json`;
const keyPath = `${directory}/challenge-key.json`;
const manifestPath = `${directory}/challenge-manifest.json`;
const outputPath = `${directory}/challenge-analysis.json`;
const argumentsList = process.argv.slice(2);
const selfTest = argumentsList.includes("--self-test");
const shouldWrite = argumentsList.includes("--write");
const valueAfter = (flag, fallback) => {
  const index = argumentsList.indexOf(flag);
  return index === -1 ? fallback : argumentsList[index + 1];
};
const passAPath = valueAfter("--pass-a", `${directory}/challenge-pass-a.json`);
const passBPath = valueAfter("--pass-b", `${directory}/challenge-pass-b.json`);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const mean = (values) => values.length === 0 ? null : values.filter(Boolean).length / values.length;

const [inputText, keyText, manifestText] = await Promise.all([
  readFile(path.resolve(root, inputPath), "utf8"), readFile(path.resolve(root, keyPath), "utf8"),
  selfTest ? Promise.resolve("{}") : readFile(path.resolve(root, manifestPath), "utf8"),
]);
const input = JSON.parse(inputText);
const key = JSON.parse(keyText);
const manifest = selfTest ? { thresholds: {
  targetObjectExact: 0.90, targetScopeExact: 0.85, targetBurdenExact: 0.90,
  componentContactMicroExact: 0.90, responsiveCoverageExact: 0.85, responsiveCoverageKappa: 0.75,
  defectTypeExact: 0.85, diagnosticObjectExact: 0.85, impactModeExact: 0.90,
  diagnosticExact: 0.90, reframeExact: 0.90, burdenExact: 0.80, burdenKappa: 0.70,
  exactDerivedTupleExact: 0.70, diagnosticPositiveRecall: 0.80, reframePositiveRecall: 1.00,
} } : JSON.parse(manifestText);
const [passAText, passBText] = selfTest ? [keyText, keyText] : await Promise.all([
  readFile(path.resolve(root, passAPath), "utf8"), readFile(path.resolve(root, passBPath), "utf8"),
]);
const passA = JSON.parse(passAText);
const passB = JSON.parse(passBText);
const caseById = new Map(input.cases.map((item) => [item.caseId, item]));
const annotationMap = (artifact) => new Map(artifact.annotations.map((item) => [item.caseId, item]));
const maps = { A: annotationMap(passA), B: annotationMap(passB), K: annotationMap(key) };
const rows = input.cases.map((challengeCase) => ({
  challengeCase,
  A: maps.A.get(challengeCase.caseId), B: maps.B.get(challengeCase.caseId), K: maps.K.get(challengeCase.caseId),
}));
const preservedAB = rows.filter(({ A, B }) => deriveTargetDisposition(A) === "preserved" && deriveTargetDisposition(B) === "preserved");
const independentScope = rows.filter(({ A, B }) => A.targetObjectRelation === "same" && B.targetObjectRelation === "same");
const diagnosticObjectRows = preservedAB.filter(({ A, B }) => A.defectType !== "none" || B.defectType !== "none");
const componentPairs = rows.flatMap(({ A, B }) => A.componentOperations.map((item, index) => [item, B.componentOperations[index]]));
const coveragePairs = rows.map(({ A, B }) => [derivedTuple(caseById.get(A.caseId), A).coverage, derivedTuple(caseById.get(B.caseId), B).coverage]);
const burdenPairs = rows.map(({ A, B }) => [derivedTuple(caseById.get(A.caseId), A).burdenRelation, derivedTuple(caseById.get(B.caseId), B).burdenRelation]);
const metrics = {
  mappingBasisExact: mean(rows.map(({ A, B }) => A.mappingBasis === B.mappingBasis)),
  targetObjectExact: mean(rows.map(({ A, B }) => A.targetObjectRelation === B.targetObjectRelation)),
  targetScopeExact: mean(independentScope.map(({ A, B }) => A.targetScopeRelation === B.targetScopeRelation)),
  targetBurdenExact: mean(rows.map(({ A, B }) => A.targetBurdenRelation === B.targetBurdenRelation)),
  componentContactMicroExact: mean(componentPairs.map(([A, B]) => (A.operation === null) === (B.operation === null))),
  componentOperationMicroExact: mean(componentPairs.map(([A, B]) => A.operation === B.operation)),
  responsiveCoverageExact: mean(coveragePairs.map(([A, B]) => A === B)),
  responsiveCoverageKappa: cohenKappa(coveragePairs),
  defectTypeExact: mean(preservedAB.map(({ A, B }) => A.defectType === B.defectType)),
  diagnosticObjectExact: mean(diagnosticObjectRows.map(({ A, B }) => canonicalDiagnosticObject(A.defectObject) === canonicalDiagnosticObject(B.defectObject))),
  impactModeExact: mean(preservedAB.map(({ A, B }) => A.impactMode === B.impactMode)),
  diagnosticExact: mean(rows.map(({ A, B }) => deriveDiagnostic(A) === deriveDiagnostic(B))),
  reframeExact: mean(rows.map(({ A, B }) => deriveReframe(A) === deriveReframe(B))),
  bridgeSetExact: mean(rows.map(({ A, B }) => equal(canonicalBridges(A.contactedBridges), canonicalBridges(B.contactedBridges)))),
  burdenExact: mean(burdenPairs.map(([A, B]) => A === B)),
  burdenKappa: cohenKappa(burdenPairs),
  exactDerivedTupleExact: mean(rows.map(({ challengeCase, A, B }) => equal(derivedTuple(challengeCase, A), derivedTuple(challengeCase, B)))),
  cascadeDisagreementCount: rows.filter(({ A, B }) => A.targetObjectRelation !== B.targetObjectRelation || A.targetBurdenRelation !== B.targetBurdenRelation).length,
};
const accuracy = (passLabel) => {
  const passMap = maps[passLabel];
  const field = (selector) => mean(rows.map(({ K }) => selector(passMap.get(K.caseId)) === selector(K)));
  const diagnosticPositiveKeys = rows.filter(({ K }) => deriveDiagnostic(K));
  const reframePositiveKeys = rows.filter(({ K }) => deriveReframe(K));
  return {
    targetObjectRelation: field((item) => item.targetObjectRelation),
    targetScopeRelation: field((item) => item.targetScopeRelation),
    targetBurdenRelation: field((item) => item.targetBurdenRelation),
    coverage: field((item) => derivedTuple(caseById.get(item.caseId), item).coverage),
    defectType: field((item) => item.defectType),
    diagnosticObject: field((item) => canonicalDiagnosticObject(item.defectObject)),
    impactMode: field((item) => item.impactMode),
    diagnostic: field((item) => deriveDiagnostic(item)),
    reframe: field((item) => deriveReframe(item)),
    burdenRelation: field((item) => derivedTuple(caseById.get(item.caseId), item).burdenRelation),
    componentOperations: mean(rows.map(({ K }) => equal(canonicalOperations(passMap.get(K.caseId).componentOperations), canonicalOperations(K.componentOperations)))),
    diagnosticPositiveRecall: mean(diagnosticPositiveKeys.map(({ K }) => deriveDiagnostic(passMap.get(K.caseId)))),
    reframePositiveRecall: mean(reframePositiveKeys.map(({ K }) => deriveReframe(passMap.get(K.caseId)))),
  };
};
const keyAccuracy = { A: accuracy("A"), B: accuracy("B") };
const thresholds = manifest.thresholds;
const gates = {
  targetObjectExact: metrics.targetObjectExact >= thresholds.targetObjectExact,
  targetScopeExact: metrics.targetScopeExact >= thresholds.targetScopeExact,
  targetBurdenExact: metrics.targetBurdenExact >= thresholds.targetBurdenExact,
  componentContactMicroExact: metrics.componentContactMicroExact >= thresholds.componentContactMicroExact,
  responsiveCoverageExact: metrics.responsiveCoverageExact >= thresholds.responsiveCoverageExact,
  responsiveCoverageKappa: metrics.responsiveCoverageKappa !== null && metrics.responsiveCoverageKappa >= thresholds.responsiveCoverageKappa,
  defectTypeExact: metrics.defectTypeExact >= thresholds.defectTypeExact,
  diagnosticObjectExact: metrics.diagnosticObjectExact >= thresholds.diagnosticObjectExact,
  impactModeExact: metrics.impactModeExact >= thresholds.impactModeExact,
  diagnosticExact: metrics.diagnosticExact >= thresholds.diagnosticExact,
  reframeExact: metrics.reframeExact >= thresholds.reframeExact,
  bridgeSetExact: metrics.bridgeSetExact >= 0.80,
  burdenExact: metrics.burdenExact >= thresholds.burdenExact,
  burdenKappa: metrics.burdenKappa !== null && metrics.burdenKappa >= thresholds.burdenKappa,
  exactDerivedTupleExact: metrics.exactDerivedTupleExact >= thresholds.exactDerivedTupleExact,
  keyDiagnosticPositiveRecallA: keyAccuracy.A.diagnosticPositiveRecall >= thresholds.diagnosticPositiveRecall,
  keyDiagnosticPositiveRecallB: keyAccuracy.B.diagnosticPositiveRecall >= thresholds.diagnosticPositiveRecall,
  keyReframePositiveRecallA: keyAccuracy.A.reframePositiveRecall >= thresholds.reframePositiveRecall,
  keyReframePositiveRecallB: keyAccuracy.B.reframePositiveRecall >= thresholds.reframePositiveRecall,
};
const passed = Object.values(gates).every(Boolean);
const perCase = rows.map(({ challengeCase, A, B, K }) => ({
  caseId: challengeCase.caseId,
  lane: challengeCase.lane,
  targetAgreement: A.targetObjectRelation === B.targetObjectRelation,
  coverageAgreement: derivedTuple(challengeCase, A).coverage === derivedTuple(challengeCase, B).coverage,
  diagnosticAgreement: deriveDiagnostic(A) === deriveDiagnostic(B),
  reframeAgreement: deriveReframe(A) === deriveReframe(B),
  exactDerivedTupleAgreement: equal(derivedTuple(challengeCase, A), derivedTuple(challengeCase, B)),
  keyDiagnostic: deriveDiagnostic(K),
  keyReframe: deriveReframe(K),
}));
const analysis = {
  schemaVersion: "2.8.2-development-challenge-analysis",
  workflowVersion: input.workflowVersion,
  rubricVersion: input.rubricVersion,
  analyzedAt: new Date().toISOString(),
  sources: selfTest ? { selfTest: true } : {
    manifestPath, manifestSha256: sha256(manifestText), inputPath, inputSha256: sha256(inputText), keyPath, keySha256: sha256(keyText),
    passAPath, passASha256: sha256(passAText), passBPath, passBSha256: sha256(passBText),
  },
  denominators: { cases: rows.length, independentScope: independentScope.length, preservedAB: preservedAB.length, diagnosticObject: diagnosticObjectRows.length, components: componentPairs.length },
  keyFeatureCounts: {
    diagnosticPositive: rows.filter(({ K }) => deriveDiagnostic(K)).length,
    diagnosticNegative: rows.filter(({ K }) => !deriveDiagnostic(K)).length,
    reframePositive: rows.filter(({ K }) => deriveReframe(K)).length,
    reframeNegative: rows.filter(({ K }) => !deriveReframe(K)).length,
  },
  metrics, keyAccuracy, thresholds, gates, perCase,
  decision: {
    passed,
    executablePreflightAuthorized: passed,
    heldOutSelectionAuthorized: false,
    numericalScoringAuthorized: false,
    nextStep: passed ? "Run the frozen executable preflight before selecting any fresh held-out transcript." : "Freeze attempt 2 as failed and revise under a new version without opening fresh held-out transcripts.",
  },
};
if (selfTest) {
  if (!passed || Object.values(metrics).some((value) => typeof value === "number" && value < 1 && ![metrics.cascadeDisagreementCount].includes(value))) throw new Error("analyzer self-test failed");
  console.log(JSON.stringify({ status: "passed", kind: "v2.8.2-analyzer-self-test", caseCount: rows.length }, null, 2));
} else {
  if (shouldWrite) await writeFile(path.resolve(root, outputPath), `${JSON.stringify(analysis, null, 2)}\n`);
  console.log(JSON.stringify(analysis, null, 2));
}

