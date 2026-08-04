#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assert, sha256 } from "./lib/v36-decision-cards.mjs";
import { V373_ROOT } from "./lib/v373-atomic-packets.mjs";

const root = process.cwd(), read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${V373_ROOT}/development-manifest.json`), manifest = JSON.parse(manifestText);
assert(manifest.status === "frozen-packet-development-model-execution-blocked" && manifest.correctionSmokeOnly && manifest.exposedDevelopmentCases, "manifest identity invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
const dryText = await read(manifest.dryFixture.path), dry = JSON.parse(dryText);
assert(sha256(dryText) === manifest.dryFixture.sha256 && dry.passed && dry.initialContextCount === 6 && dry.distinctBundleCount === 8 && dry.modelContextsExecuted === 0, "dry fixture invalid");
const mapText = await read(manifest.sealedOptionMap.path), mapping = JSON.parse(mapText);
assert(sha256(mapText) === manifest.sealedOptionMap.sha256 && mapping.status === "sealed-from-model-contexts", "sealed option map invalid");
for (const [pass, bundles] of Object.entries(mapping.passes)) {
  assert(["pass-a", "pass-b"].includes(pass) && Object.keys(bundles).length === 8, `${pass}: option-map bundle coverage invalid`);
  for (const item of Object.values(bundles)) assert(item.options.length >= 2 && item.options.length <= 4 && item.options.filter((option) => option.matchesRetiredExpected).length === 1, "option-map candidate origin coverage invalid");
}
execFileSync(process.execPath, ["scripts/test-v373-atomic-packets.mjs"], { cwd: root, stdio: "ignore" });
assert(manifest.frozenThresholds.initialAtomicBundleAgreementsMinimum === 7 && manifest.frozenThresholds.initialInvalidBundlesMaximum === 0 && manifest.frozenThresholds.finalTwoVoteBundlesRequired === 8, "frozen thresholds invalid");
assert(!manifest.developmentState.executionRunnerImplemented && !manifest.developmentState.disagreementExtractorImplemented && !manifest.developmentState.adjudicationRunnerImplemented && !manifest.developmentState.analyzerImplemented && !manifest.developmentState.modelExecutionAuthorized, "development state overstates readiness");
assert(manifest.prohibitions.modelExecution && manifest.prohibitions.correctedBenchmarkKey && manifest.prohibitions.heldOutAccess && manifest.prohibitions.numericalParticipantScoring && manifest.prohibitions.assessmentProse && manifest.prohibitions.productionMutation, "prohibitions invalid");
console.log(JSON.stringify({ status: "passed", artifactIntegrityPassed: true, packetDevelopmentPassed: true, initialContexts: dry.initialContextCount, atomicBundles: dry.distinctBundleCount, frozenThresholds: manifest.frozenThresholds, modelExecutionAuthorized: false, manifestSha256: sha256(manifestText) }, null, 2));
