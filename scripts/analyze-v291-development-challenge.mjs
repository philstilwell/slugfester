#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cohenKappa, derivedTuple, deriveDiagnostic, deriveReframe, equal } from "./lib/v291-semantics.mjs";

const root = process.cwd();
const directory = "docs/calibration/v2.9/development/attempt-2";
const inputPath = `${directory}/challenge-input.json`;
const keyPath = `${directory}/challenge-key.json`;
const manifestPath = `${directory}/challenge-manifest.json`;
const outputPath = `${directory}/challenge-analysis.json`;
const args = process.argv.slice(2);
const selfTest = args.includes("--self-test");
const shouldWrite = args.includes("--write");
const valueAfter = (flag, fallback) => { const i = args.indexOf(flag); return i === -1 ? fallback : args[i + 1]; };
const passAPath = valueAfter("--pass-a", `${directory}/challenge-pass-a.json`);
const passBPath = valueAfter("--pass-b", `${directory}/challenge-pass-b.json`);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const mean = (values) => values.length === 0 ? null : values.filter(Boolean).length / values.length;
const thresholdsFallback = { originalTargetContactExact:0.90,scopeExact:0.90,burdenAdjustmentExact:0.90,componentContactMicroExact:0.90,coverageExact:0.85,coverageKappa:0.75,defectTypeExact:0.85,consequenceExact:0.90,diagnosticExact:0.90,reframeExact:0.90,burdenRelevanceExact:0.85,burdenRelevanceKappa:0.75,exactDerivedTupleExact:0.75,diagnosticPositiveRecall:0.80,reframePositiveRecall:0.80 };
const [inputText, keyText, manifestText] = await Promise.all([
  readFile(path.resolve(root, inputPath), "utf8"), readFile(path.resolve(root, keyPath), "utf8"), selfTest ? Promise.resolve("{}") : readFile(path.resolve(root, manifestPath), "utf8"),
]);
const input = JSON.parse(inputText); const key = JSON.parse(keyText); const manifest = selfTest ? { thresholds: thresholdsFallback } : JSON.parse(manifestText);
const [passAText, passBText] = selfTest ? [keyText, keyText] : await Promise.all([readFile(path.resolve(root, passAPath), "utf8"), readFile(path.resolve(root, passBPath), "utf8")]);
const passA = JSON.parse(passAText); const passB = JSON.parse(passBText);
const caseById = new Map(input.cases.map((item) => [item.caseId, item]));
const mapOf = (artifact) => new Map(artifact.annotations.map((item) => [item.caseId, item]));
const maps = { A: mapOf(passA), B: mapOf(passB), K: mapOf(key) };
const allRows = input.cases.map((challengeCase) => ({ challengeCase, A: maps.A.get(challengeCase.caseId), B: maps.B.get(challengeCase.caseId), K: maps.K.get(challengeCase.caseId) }));

function metricsFor(rows) {
  const bothTarget = rows.filter(({ A, B }) => A.originalTargetContact && B.originalTargetContact);
  const componentPairs = rows.flatMap(({ A, B }) => A.componentContacts.map((item, index) => [item.contacted, B.componentContacts[index].contacted]));
  const coveragePairs = rows.map(({ challengeCase, A, B }) => [derivedTuple(challengeCase, A).coverage, derivedTuple(challengeCase, B).coverage]);
  const burdenPairs = rows.map(({ challengeCase, A, B }) => [derivedTuple(challengeCase, A).burdenRelevance, derivedTuple(challengeCase, B).burdenRelevance]);
  return {
    caseCount: rows.length,
    originalTargetContactExact: mean(rows.map(({ A, B }) => A.originalTargetContact === B.originalTargetContact)),
    connectedExampleExact: mean(rows.map(({ A, B }) => A.connectedExample === B.connectedExample)),
    scopeExact: mean(bothTarget.map(({ A, B }) => A.scopeRelation === B.scopeRelation)),
    burdenAdjustmentExact: mean(rows.map(({ A, B }) => A.burdenAdjustment === B.burdenAdjustment)),
    componentContactMicroExact: mean(componentPairs.map(([A, B]) => A === B)),
    coverageExact: mean(coveragePairs.map(([A, B]) => A === B)),
    coverageKappa: cohenKappa(coveragePairs),
    defectTypeExact: mean(bothTarget.map(({ A, B }) => A.defectType === B.defectType)),
    consequenceExact: mean(bothTarget.map(({ A, B }) => A.consequenceStated === B.consequenceStated)),
    diagnosticExact: mean(rows.map(({ A, B }) => deriveDiagnostic(A) === deriveDiagnostic(B))),
    reframeExact: mean(rows.map(({ A, B }) => deriveReframe(A) === deriveReframe(B))),
    burdenRelevanceExact: mean(burdenPairs.map(([A, B]) => A === B)),
    burdenRelevanceKappa: cohenKappa(burdenPairs),
    exactDerivedTupleExact: mean(rows.map(({ challengeCase, A, B }) => equal(derivedTuple(challengeCase, A), derivedTuple(challengeCase, B)))),
  };
}
const metrics = metricsFor(allRows);
const laneMetrics = {
  dyadic: metricsFor(allRows.filter(({ challengeCase }) => challengeCase.lane === "dyadic")),
  multiSpeaker: metricsFor(allRows.filter(({ challengeCase }) => challengeCase.lane === "multi-speaker")),
};
const accuracy = (label) => {
  const candidate = maps[label];
  const field = (selector) => mean(allRows.map(({ K }) => selector(candidate.get(K.caseId)) === selector(K)));
  const diagKeys = allRows.filter(({ K }) => deriveDiagnostic(K));
  const reframeKeys = allRows.filter(({ K }) => deriveReframe(K));
  const componentPairs = allRows.flatMap(({ K }) => candidate.get(K.caseId).componentContacts.map((item, index) => [item.contacted, K.componentContacts[index].contacted]));
  return {
    originalTargetContact: field((item) => item.originalTargetContact), connectedExample: field((item) => item.connectedExample), scopeRelation: field((item) => item.scopeRelation), burdenAdjustment: field((item) => item.burdenAdjustment),
    componentContactMicro: mean(componentPairs.map(([a,b]) => a === b)), coverage: field((item) => derivedTuple(caseById.get(item.caseId), item).coverage), defectType: field((item) => item.defectType), consequenceStated: field((item) => item.consequenceStated), diagnostic: field(deriveDiagnostic), reframe: field(deriveReframe),
    burdenRelevance: field((item) => derivedTuple(caseById.get(item.caseId), item).burdenRelevance),
    diagnosticPositiveRecall: mean(diagKeys.map(({ K }) => deriveDiagnostic(candidate.get(K.caseId)))),
    reframePositiveRecall: mean(reframeKeys.map(({ K }) => deriveReframe(candidate.get(K.caseId)))),
  };
};
const keyAccuracy = { A: accuracy("A"), B: accuracy("B") };
const thresholds = manifest.thresholds;
const gates = {
  originalTargetContactExact: metrics.originalTargetContactExact >= thresholds.originalTargetContactExact,
  scopeExact: metrics.scopeExact >= thresholds.scopeExact,
  burdenAdjustmentExact: metrics.burdenAdjustmentExact >= thresholds.burdenAdjustmentExact,
  componentContactMicroExact: metrics.componentContactMicroExact >= thresholds.componentContactMicroExact,
  coverageExact: metrics.coverageExact >= thresholds.coverageExact,
  coverageKappa: metrics.coverageKappa !== null && metrics.coverageKappa >= thresholds.coverageKappa,
  defectTypeExact: metrics.defectTypeExact >= thresholds.defectTypeExact,
  consequenceExact: metrics.consequenceExact >= thresholds.consequenceExact,
  diagnosticExact: metrics.diagnosticExact >= thresholds.diagnosticExact,
  reframeExact: metrics.reframeExact >= thresholds.reframeExact,
  burdenRelevanceExact: metrics.burdenRelevanceExact >= thresholds.burdenRelevanceExact,
  burdenRelevanceKappa: metrics.burdenRelevanceKappa !== null && metrics.burdenRelevanceKappa >= thresholds.burdenRelevanceKappa,
  exactDerivedTupleExact: metrics.exactDerivedTupleExact >= thresholds.exactDerivedTupleExact,
  keyDiagnosticPositiveRecallA: keyAccuracy.A.diagnosticPositiveRecall >= thresholds.diagnosticPositiveRecall,
  keyDiagnosticPositiveRecallB: keyAccuracy.B.diagnosticPositiveRecall >= thresholds.diagnosticPositiveRecall,
  keyReframePositiveRecallA: keyAccuracy.A.reframePositiveRecall >= thresholds.reframePositiveRecall,
  keyReframePositiveRecallB: keyAccuracy.B.reframePositiveRecall >= thresholds.reframePositiveRecall,
};
const passed = Object.values(gates).every(Boolean);
const perCase = allRows.map(({ challengeCase, A, B, K }) => ({ caseId: challengeCase.caseId, lane: challengeCase.lane, targetAgreement: A.originalTargetContact === B.originalTargetContact, coverageAgreement: derivedTuple(challengeCase,A).coverage === derivedTuple(challengeCase,B).coverage, diagnosticAgreement: deriveDiagnostic(A) === deriveDiagnostic(B), reframeAgreement: deriveReframe(A) === deriveReframe(B), burdenAgreement: derivedTuple(challengeCase,A).burdenRelevance === derivedTuple(challengeCase,B).burdenRelevance, exactTupleAgreement: equal(derivedTuple(challengeCase,A),derivedTuple(challengeCase,B)), keyDiagnostic: deriveDiagnostic(K), keyReframe: deriveReframe(K) }));
const analysis = {
  schemaVersion: "2.9.1-development-challenge-analysis", workflowVersion: input.workflowVersion, rubricVersion: input.rubricVersion, analyzedAt: new Date().toISOString(),
  sources: selfTest ? { selfTest:true } : { manifestPath,manifestSha256:sha256(manifestText),inputPath,inputSha256:sha256(inputText),keyPath,keySha256:sha256(keyText),passAPath,passASha256:sha256(passAText),passBPath,passBSha256:sha256(passBText) },
  keyFeatureCounts: { diagnosticPositive: allRows.filter(({K})=>deriveDiagnostic(K)).length, diagnosticNegative: allRows.filter(({K})=>!deriveDiagnostic(K)).length, reframePositive: allRows.filter(({K})=>deriveReframe(K)).length, reframeNegative: allRows.filter(({K})=>!deriveReframe(K)).length },
  metrics, laneMetrics, keyAccuracy, thresholds, gates, perCase,
  decision: { passed, executablePreflightAuthorized:passed, heldOutSelectionAuthorized:false, numericalScoringAuthorized:false, productionMutationAuthorized:false, nextStep: passed ? "Run the frozen executable preflight before selecting fresh held-out transcripts." : "Freeze v2.9.1 attempt 2 as failed; do not run executable preflight or open held-out transcripts." }
};
if (selfTest) {
  if (!passed || Object.entries(metrics).some(([name,value]) => name !== "caseCount" && typeof value === "number" && value < 1)) throw new Error("analyzer self-test failed");
  console.log(JSON.stringify({status:"passed",kind:"v2.9.1-analyzer-self-test",caseCount:allRows.length},null,2));
} else {
  if (shouldWrite) await writeFile(path.resolve(root, outputPath), `${JSON.stringify(analysis,null,2)}\n`);
  console.log(JSON.stringify(analysis,null,2));
}

