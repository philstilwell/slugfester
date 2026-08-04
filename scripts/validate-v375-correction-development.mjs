#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { V375_ROOT, assert } from "./lib/v375-correction.mjs";

const root = process.cwd(), read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${V375_ROOT}/development-manifest.json`), manifest = JSON.parse(manifestText);
assert(manifest.status === "frozen-packet-development-model-execution-blocked" && manifest.exposedCorrectionCases && !manifest.correctionTargets.thresholdLowering, "manifest identity invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
const dryText = await read(manifest.dryFixture.path), dry = JSON.parse(dryText);
assert(sha256(dryText) === manifest.dryFixture.sha256 && dry.passed && dry.atomicBundleCount === 8 && dry.modelContextsExecuted === 0, "dry fixture invalid");
const mappingText = await read(manifest.sealedOptionMap.path), mapping = JSON.parse(mappingText);
assert(sha256(mappingText) === manifest.sealedOptionMap.sha256, "sealed option map hash invalid");
for (const pass of ["pass-a", "pass-b"]) {
  assert(Object.keys(mapping.passes[pass]).length === 8, `${pass}: map coverage invalid`);
  for (const bundle of Object.values(mapping.passes[pass])) assert(bundle.options.length >= 3 && bundle.options.length <= 4 && bundle.options.filter((item) => item.matchesDevelopmentReference).length === 1, `${pass}: reference option coverage invalid`);
}
execFileSync(process.execPath, ["scripts/test-v375-correction-packets.mjs"], { cwd: root, stdio: "ignore" });
assert(manifest.frozenThresholds.initialAtomicBundleAgreementsRequired === 8 && manifest.frozenThresholds.finalTwoVoteBundlesRequired === 8, "perfect correction thresholds invalid");
assert(!manifest.developmentState.executionRunnerImplemented && !manifest.developmentState.disagreementExtractorImplemented && !manifest.developmentState.adjudicationRunnerImplemented && !manifest.developmentState.analyzerImplemented && !manifest.developmentState.modelExecutionAuthorized, "development state overstates readiness");
assert(manifest.prohibitions.modelExecution && manifest.prohibitions.correctedBenchmarkKey && manifest.prohibitions.largerModelBatch && manifest.prohibitions.heldOutAccess && manifest.prohibitions.numericalParticipantScoring && manifest.prohibitions.assessmentProse && manifest.prohibitions.productionMutation, "prohibitions invalid");
console.log(JSON.stringify({ status: "passed", artifactIntegrityPassed: true, correctionPacketDevelopmentPassed: true, atomicBundles: dry.atomicBundleCount, perfectInitialAgreementRequired: manifest.frozenThresholds.initialAtomicBundleAgreementsRequired, modelExecutionAuthorized: false, manifestSha256: sha256(manifestText) }, null, 2));
