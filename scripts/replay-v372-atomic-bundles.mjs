#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { semanticOptionMap, V371_DEBATES, V371_INITIAL_PASSES } from "./lib/v371-gold-audit.mjs";
import { assert, compileBundles, compareBundlePasses, V372_ROOT } from "./lib/v372-atomic-bundles.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${V372_ROOT}/replay-manifest.json`), manifest = JSON.parse(manifestText);
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
const spec = JSON.parse(await read(manifest.specification.path));
const priorManifest = JSON.parse(await read(manifest.priorV371.manifestPath));
const priorAnalysisText = await read(manifest.priorV371.analysisPath), priorAnalysis = JSON.parse(priorAnalysisText);
const sealedMap = JSON.parse(await read(priorManifest.sealedOptionMap.path));

const initialValues = {};
for (const reviewerPass of V371_INITIAL_PASSES) {
  initialValues[reviewerPass] = new Map();
  for (const debateNumber of V371_DEBATES) {
    const output = JSON.parse(await read(priorManifest.outputs.initial[reviewerPass][debateNumber]));
    const optionMap = semanticOptionMap(sealedMap, debateNumber, reviewerPass);
    for (const decision of output.decisions) {
      const value = optionMap.get(`${decision.auditId}::${decision.optionId}`);
      assert(value !== undefined, `${reviewerPass}.${decision.auditId}: semantic option missing`);
      initialValues[reviewerPass].set(decision.auditId, value);
    }
  }
}
const finalValues = new Map(priorAnalysis.results.final.decisions.map((item) => [item.auditId, item.finalValue]));
assert(finalValues.size === 14, "final two-vote field coverage invalid");
const compiled = {
  passA: compileBundles(spec, initialValues["pass-a"], "pass-a"),
  passB: compileBundles(spec, initialValues["pass-b"], "pass-b"),
  final: compileBundles(spec, finalValues, "final")
};
const comparisons = compareBundlePasses(compiled.passA, compiled.passB);
const passAInvalid = compiled.passA.filter((item) => !item.valid), passBInvalid = compiled.passB.filter((item) => !item.valid), finalInvalid = compiled.final.filter((item) => !item.valid);
const discretionaryRepairs = Object.values(compiled).flat().reduce((sum, item) => sum + item.discretionaryRepairs, 0);
const mechanics = {
  initialPassesCompiled: 2,
  bundleCoveragePerPass: compiled.passA.length,
  finalBundlesCompiled: compiled.final.length,
  validFinalBundles: compiled.final.filter((item) => item.valid).length,
  auditFieldsConsumed: 14,
  independentScalars: 12,
  derivedWitnesses: 2,
  discretionaryRepairs,
  modelContexts: 0,
  paidTranscriptionCalls: 0,
  meteredApiCostUsd: 0
};
const gates = {
  initialPassCompilation: mechanics.initialPassesCompiled === manifest.developmentAcceptance.compiledInitialPasses,
  bundleCoverage: mechanics.bundleCoveragePerPass === manifest.developmentAcceptance.bundleCoveragePerPass,
  finalCompilation: mechanics.finalBundlesCompiled === manifest.developmentAcceptance.compiledFinalBundles,
  finalValidity: mechanics.validFinalBundles === manifest.developmentAcceptance.validFinalBundles,
  discretionaryRepair: discretionaryRepairs <= manifest.developmentAcceptance.discretionaryRepairsMaximum,
  modelContexts: mechanics.modelContexts === manifest.developmentAcceptance.modelContexts,
  paidTranscription: mechanics.paidTranscriptionCalls === manifest.developmentAcceptance.paidTranscriptionCalls,
  meteredCost: mechanics.meteredApiCostUsd <= manifest.developmentAcceptance.meteredApiCostUsdMaximum
};
const compilerPassed = Object.values(gates).every(Boolean);
const replay = {
  schemaVersion: "3.7.2-atomic-bundle-replay-analysis",
  analyzedAt: manifest.frozenAt,
  status: compilerPassed ? "compiler-pass-semantic-repeatability-fail" : "compiler-fail",
  warning: "This retrospective development replay measures atomic-bundle mechanics and saved-pass repeatability. It is not a promotion gate and cannot authorize its two-vote values as a benchmark key.",
  sources: { manifestSha256: sha256(manifestText), priorAnalysisSha256: sha256(priorAnalysisText) },
  mechanics,
  semanticDiagnostics: {
    atomicBundleCount: comparisons.length,
    initialAgreements: comparisons.filter((item) => item.agreed).length,
    initialDisagreements: comparisons.filter((item) => !item.agreed).length,
    initialAgreementRate: comparisons.filter((item) => item.agreed).length / comparisons.length,
    invalidInitialBundles: passAInvalid.length + passBInvalid.length,
    passAInvalidBundles: passAInvalid.map((item) => ({ bundleId: item.bundleId, issues: item.issues })),
    passBInvalidBundles: passBInvalid.map((item) => ({ bundleId: item.bundleId, issues: item.issues })),
    finalInvalidBundles: finalInvalid.map((item) => ({ bundleId: item.bundleId, issues: item.issues })),
    comparisons
  },
  compiled,
  gates,
  compilerPassed,
  decision: {
    atomicPacketDevelopmentAuthorized: compilerPassed,
    freshModelExecutionAuthorized: false,
    resolvedValuesAuthorizedAsBenchmarkKey: false,
    heldOutAccessAuthorized: false,
    numericalParticipantScoringAuthorized: false,
    assessmentProseAuthorized: false,
    productionMutationAuthorized: false
  }
};
const outputText = `${JSON.stringify(replay, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, manifest.replayPath), outputText);
console.log(outputText);
