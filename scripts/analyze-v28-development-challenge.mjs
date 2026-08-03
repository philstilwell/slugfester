#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  canonicalDiagnosticObject, canonicalOperations, cohenKappa, equal,
} from "./lib/v28-semantics.mjs";

const shouldWrite = process.argv.includes("--write");
const root = process.cwd();
const files = {
  input: "docs/calibration/v2.8/development/challenge-input.json",
  key: "docs/calibration/v2.8/development/challenge-key.json",
  passA: "docs/calibration/v2.8/development/challenge-pass-a.json",
  passB: "docs/calibration/v2.8/development/challenge-pass-b.json",
  manifest: "docs/calibration/v2.8/development/challenge-manifest.json",
  output: "docs/calibration/v2.8/development/challenge-analysis.json",
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const load = async (file) => {
  const text = await readFile(path.resolve(root, file), "utf8");
  return { text, value: JSON.parse(text) };
};
const rate = (numerator, denominator) => denominator > 0 ? numerator / denominator : null;
const atLeast = (value, threshold) => value !== null && value >= threshold;
const semanticObject = (annotation) => canonicalDiagnosticObject(annotation.defectObject);
const semanticOperations = (annotation) => canonicalOperations(annotation.componentOperations);
const annotationTuple = (annotation) => JSON.stringify([
  annotation.derivedTargetDisposition, annotation.derivedTargetCoverage, annotation.derivedDiagnostic,
  annotation.derivedReframe, annotation.derivedBurdenRelation,
]);

const [inputSource, keySource, aSource, bSource, manifestSource] = await Promise.all([
  load(files.input), load(files.key), load(files.passA), load(files.passB), load(files.manifest),
]);
const input = inputSource.value;
const key = keySource.value;
const a = aSource.value;
const b = bSource.value;
const manifest = manifestSource.value;
if (a.pass !== "A" || b.pass !== "B" || a.annotations.length !== input.caseCount || b.annotations.length !== input.caseCount) throw new Error("challenge pass identity mismatch");
if (manifest.sources.challengeInputSha256 !== sha256(inputSource.text) || manifest.sources.challengeKeySha256 !== sha256(keySource.text)) throw new Error("challenge manifest source hash mismatch");
const inputById = new Map(input.cases.map((item) => [item.caseId, item]));
const keyById = new Map(key.cases.map((item) => [item.caseId, item.expected]));
const aById = new Map(a.annotations.map((item) => [item.caseId, item]));
const bById = new Map(b.annotations.map((item) => [item.caseId, item]));

const counts = {
  cases: input.caseCount,
  targetObject: 0, targetScope: 0, targetBurden: 0, coverage: 0, defectType: 0, impactMode: 0,
  diagnostic: 0, reframe: 0, burden: 0, exactTuple: 0,
  diagnosticObjectJudgments: 0, diagnosticObject: 0,
  componentJudgments: 0, componentContact: 0, componentOperation: 0,
};
const pairs = { coverage: [], burden: [] };
const keyCorrect = { A: {}, B: {} };
const keyTotals = {};
const cascadeCases = [];
const perCase = [];
const fields = ["targetObjectRelation", "targetScopeRelation", "targetBurdenRelation", "derivedTargetCoverage", "defectType", "impactMode", "derivedDiagnostic", "derivedReframe", "derivedBurdenRelation"];
for (const field of fields) { keyCorrect.A[field] = 0; keyCorrect.B[field] = 0; keyTotals[field] = input.caseCount; }
let diagnosticPositiveA = 0; let diagnosticPositiveB = 0; let reframePositiveA = 0; let reframePositiveB = 0;
let diagnosticKeyPositiveA = 0; let diagnosticKeyPositiveB = 0; let reframeKeyPositiveA = 0; let reframeKeyPositiveB = 0;

for (const challengeCase of input.cases) {
  const left = aById.get(challengeCase.caseId);
  const right = bById.get(challengeCase.caseId);
  const expected = keyById.get(challengeCase.caseId);
  if (!left || !right || !expected) throw new Error(`${challengeCase.caseId}: challenge artifact missing`);
  if (left.targetObjectRelation === right.targetObjectRelation) counts.targetObject += 1;
  if (left.targetScopeRelation === right.targetScopeRelation) counts.targetScope += 1;
  if (left.targetBurdenRelation === right.targetBurdenRelation) counts.targetBurden += 1;
  if (left.derivedTargetCoverage === right.derivedTargetCoverage) counts.coverage += 1;
  if (left.defectType === right.defectType) counts.defectType += 1;
  if (left.impactMode === right.impactMode) counts.impactMode += 1;
  if (left.derivedDiagnostic === right.derivedDiagnostic) counts.diagnostic += 1;
  if (left.derivedReframe === right.derivedReframe) counts.reframe += 1;
  if (left.derivedBurdenRelation === right.derivedBurdenRelation) counts.burden += 1;
  if (annotationTuple(left) === annotationTuple(right)) counts.exactTuple += 1;
  pairs.coverage.push([left.derivedTargetCoverage, right.derivedTargetCoverage]);
  pairs.burden.push([left.derivedBurdenRelation, right.derivedBurdenRelation]);
  if (left.defectType !== "none" || right.defectType !== "none") {
    counts.diagnosticObjectJudgments += 1;
    if (semanticObject(left) === semanticObject(right)) counts.diagnosticObject += 1;
  }
  if (left.derivedTargetDisposition === "preserved" && right.derivedTargetDisposition === "preserved") {
    const leftMap = new Map(left.componentOperations.map((item) => [item.componentId, item.operation]));
    const rightMap = new Map(right.componentOperations.map((item) => [item.componentId, item.operation]));
    for (const component of challengeCase.targetPacket.indispensableComponents) {
      const leftOperation = leftMap.get(component.id);
      const rightOperation = rightMap.get(component.id);
      counts.componentJudgments += 1;
      if ((leftOperation !== null) === (rightOperation !== null)) counts.componentContact += 1;
      if (leftOperation === rightOperation) counts.componentOperation += 1;
    }
  }
  for (const field of fields) {
    if (equal(left[field], expected[field])) keyCorrect.A[field] += 1;
    if (equal(right[field], expected[field])) keyCorrect.B[field] += 1;
  }
  const expectedObject = expected.defectObject;
  if (expected.defectType !== "none") {
    keyTotals.diagnosticObject = (keyTotals.diagnosticObject ?? 0) + 1;
    keyCorrect.A.diagnosticObject = (keyCorrect.A.diagnosticObject ?? 0) + Number(semanticObject(left) === expectedObject);
    keyCorrect.B.diagnosticObject = (keyCorrect.B.diagnosticObject ?? 0) + Number(semanticObject(right) === expectedObject);
  }
  const expectedOperations = expected.componentOperations;
  keyTotals.componentOperations = (keyTotals.componentOperations ?? 0) + 1;
  keyCorrect.A.componentOperations = (keyCorrect.A.componentOperations ?? 0) + Number(equal(semanticOperations(left), expectedOperations));
  keyCorrect.B.componentOperations = (keyCorrect.B.componentOperations ?? 0) + Number(equal(semanticOperations(right), expectedOperations));
  if (left.derivedDiagnostic) diagnosticPositiveA += 1;
  if (right.derivedDiagnostic) diagnosticPositiveB += 1;
  if (left.derivedReframe) reframePositiveA += 1;
  if (right.derivedReframe) reframePositiveB += 1;
  if (expected.derivedDiagnostic) {
    diagnosticKeyPositiveA += Number(left.derivedDiagnostic);
    diagnosticKeyPositiveB += Number(right.derivedDiagnostic);
  }
  if (expected.derivedReframe) {
    reframeKeyPositiveA += Number(left.derivedReframe);
    reframeKeyPositiveB += Number(right.derivedReframe);
  }
  const objectDisagreement = left.targetObjectRelation !== right.targetObjectRelation;
  const downstreamDisagreement = left.derivedTargetCoverage !== right.derivedTargetCoverage || !equal(semanticOperations(left), semanticOperations(right));
  if (objectDisagreement && downstreamDisagreement) cascadeCases.push(challengeCase.caseId);
  perCase.push({
    caseId: challengeCase.caseId,
    targetObjectAgreement: !objectDisagreement,
    coverageAgreement: left.derivedTargetCoverage === right.derivedTargetCoverage,
    diagnosticAgreement: left.derivedDiagnostic === right.derivedDiagnostic,
    reframeAgreement: left.derivedReframe === right.derivedReframe,
    cascadeDisagreement: objectDisagreement && downstreamDisagreement,
  });
}

const metrics = {
  targetObjectExact: rate(counts.targetObject, counts.cases),
  targetScopeExact: rate(counts.targetScope, counts.cases),
  targetBurdenExact: rate(counts.targetBurden, counts.cases),
  componentContactMicroExact: rate(counts.componentContact, counts.componentJudgments),
  componentOperationMicroExact: rate(counts.componentOperation, counts.componentJudgments),
  responsiveCoverageExact: rate(counts.coverage, counts.cases),
  responsiveCoverageKappa: cohenKappa(pairs.coverage),
  defectTypeExact: rate(counts.defectType, counts.cases),
  diagnosticObjectExact: rate(counts.diagnosticObject, counts.diagnosticObjectJudgments),
  impactModeExact: rate(counts.impactMode, counts.cases),
  diagnosticExact: rate(counts.diagnostic, counts.cases),
  reframeExact: rate(counts.reframe, counts.cases),
  burdenExact: rate(counts.burden, counts.cases),
  burdenKappa: cohenKappa(pairs.burden),
  exactDerivedTupleExact: rate(counts.exactTuple, counts.cases),
  diagnosticPositiveCountA: diagnosticPositiveA,
  diagnosticPositiveCountB: diagnosticPositiveB,
  reframePositiveCountA: reframePositiveA,
  reframePositiveCountB: reframePositiveB,
  cascadeDisagreementCount: cascadeCases.length,
};
const keyAccuracy = { A: {}, B: {} };
for (const pass of ["A", "B"]) for (const [field, total] of Object.entries(keyTotals)) keyAccuracy[pass][field] = rate(keyCorrect[pass][field], total);
const diagnosticPositiveTotal = key.rareFeatureAudit.diagnosticPositiveCaseIds.length;
const reframePositiveTotal = key.rareFeatureAudit.reframePositiveCaseIds.length;
keyAccuracy.A.diagnosticPositiveRecall = rate(diagnosticKeyPositiveA, diagnosticPositiveTotal);
keyAccuracy.B.diagnosticPositiveRecall = rate(diagnosticKeyPositiveB, diagnosticPositiveTotal);
keyAccuracy.A.reframePositiveRecall = rate(reframeKeyPositiveA, reframePositiveTotal);
keyAccuracy.B.reframePositiveRecall = rate(reframeKeyPositiveB, reframePositiveTotal);

const threshold = manifest.thresholds;
const gates = {
  targetObjectExact: atLeast(metrics.targetObjectExact, threshold.targetObjectExact),
  targetScopeExact: atLeast(metrics.targetScopeExact, threshold.targetScopeExact),
  targetBurdenExact: atLeast(metrics.targetBurdenExact, threshold.targetBurdenExact),
  componentContactMicroExact: atLeast(metrics.componentContactMicroExact, threshold.componentContactMicroExact),
  responsiveCoverageExact: atLeast(metrics.responsiveCoverageExact, threshold.responsiveCoverageExact),
  responsiveCoverageKappa: atLeast(metrics.responsiveCoverageKappa, threshold.responsiveCoverageKappa),
  defectTypeExact: atLeast(metrics.defectTypeExact, threshold.defectTypeExact),
  diagnosticObjectExact: atLeast(metrics.diagnosticObjectExact, threshold.diagnosticObjectExact),
  impactModeExact: atLeast(metrics.impactModeExact, threshold.impactModeExact),
  diagnosticExact: atLeast(metrics.diagnosticExact, threshold.diagnosticExact),
  reframeExact: atLeast(metrics.reframeExact, threshold.reframeExact),
  burdenExact: atLeast(metrics.burdenExact, threshold.burdenExact),
  burdenKappa: atLeast(metrics.burdenKappa, threshold.burdenKappa),
  exactDerivedTupleExact: atLeast(metrics.exactDerivedTupleExact, threshold.exactDerivedTupleExact),
  keyDiagnosticPositiveRecallA: atLeast(keyAccuracy.A.diagnosticPositiveRecall, threshold.diagnosticPositiveRecall),
  keyDiagnosticPositiveRecallB: atLeast(keyAccuracy.B.diagnosticPositiveRecall, threshold.diagnosticPositiveRecall),
  keyReframePositiveRecallA: atLeast(keyAccuracy.A.reframePositiveRecall, threshold.reframePositiveRecall),
  keyReframePositiveRecallB: atLeast(keyAccuracy.B.reframePositiveRecall, threshold.reframePositiveRecall),
};
const artifact = {
  schemaVersion: "2.8-development-challenge-analysis",
  workflowVersion: input.workflowVersion,
  rubricVersion: input.rubricVersion,
  analyzedAt: new Date().toISOString(),
  sources: {
    manifestPath: files.manifest, manifestSha256: sha256(manifestSource.text),
    inputPath: files.input, inputSha256: sha256(inputSource.text),
    keyPath: files.key, keySha256: sha256(keySource.text),
    passAPath: files.passA, passASha256: sha256(aSource.text),
    passBPath: files.passB, passBSha256: sha256(bSource.text),
  },
  denominators: counts,
  metrics,
  keyAccuracy,
  thresholds: threshold,
  gates,
  cascadeCases,
  perCase,
  decision: {
    passed: Object.values(gates).every(Boolean),
    heldOutSelectionAuthorized: Object.values(gates).every(Boolean),
    numericalScoringAuthorized: false,
    nextStep: Object.values(gates).every(Boolean) ? "Complete executable preflight, then freeze and select fresh disjoint classification gates." : "Refine v2.8 development rules without opening fresh held-out transcripts, then rerun a new challenge attempt.",
  },
};
const outputText = `${JSON.stringify(artifact, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, files.output), outputText);
else {
  const existing = await load(files.output);
  const normalize = (value) => { const copy = structuredClone(value); delete copy.analyzedAt; return copy; };
  if (!equal(normalize(existing.value), normalize(artifact))) throw new Error("v2.8 development challenge analysis is stale; rerun --write");
}
console.log(JSON.stringify({
  status: artifact.decision.passed ? "passed" : "failed",
  write: shouldWrite,
  metrics,
  failedGates: Object.entries(gates).filter(([, passed]) => !passed).map(([name]) => name),
  keyAccuracy,
  cascadeDisagreementCount: cascadeCases.length,
}, null, 2));
