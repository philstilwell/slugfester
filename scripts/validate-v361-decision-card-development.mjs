#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { assert, sha256 } from "./lib/v36-decision-cards.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.6.1/decision-card-development", read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`), manifest = JSON.parse(manifestText);
assert(manifest.status === "frozen-before-normalization" && manifest.correction === "deterministic-unique-word-boundary-evidence-context" && manifest.maximumEvidenceWindowCharacters === 160, "manifest correction identity invalid");
assert(manifest.calibrationOnly && manifest.retiredGoldUsedForValidatorFixtures && !manifest.independentModelAccuracyTest, "development scope invalid");
assert(manifest.modelContextsExecuted === 0 && manifest.meteredApiCostUsd === 0 && manifest.transcriptionCostUsd === 0, "execution/cost scope invalid");
assert(!manifest.heldOutMaterialOpened && !manifest.numericalScoringAuthorized && !manifest.productionMutationAuthorized, "manifest over-authorizes work");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `decision-source hash mismatch: ${file}`);
for (const debate of manifest.sample.debates) for (const source of Object.values(debate.sources)) assert(sha256(await read(source.path)) === source.sha256, `${debate.debateId}: source hash mismatch`);
execFileSync(process.execPath, ["scripts/normalize-v361-retired-decision-fixtures.mjs"], { cwd: root, stdio: "ignore" });
execFileSync(process.execPath, ["scripts/test-v361-decision-cards.mjs"], { cwd: root, stdio: "ignore" });
const fixtureText = await read(manifest.outputs.normalizedRetiredFixtures), analysisText = await read(manifest.outputs.fixtureAnalysis), analysis = JSON.parse(analysisText);
assert(analysis.sources.manifestSha256 === sha256(manifestText) && analysis.sources.normalizedRetiredFixturesSha256 === sha256(fixtureText), "analysis provenance invalid");
assert(analysis.passed === Object.values(analysis.gates).every(Boolean) && analysis.decision.remoteSchemaSmokeTestPreregistrationAuthorized === analysis.passed, "analysis decision mismatch");
assert(!analysis.decision.modelBatchAuthorized && !analysis.decision.heldOutAccessAuthorized && !analysis.decision.numericalScoringAuthorized && !analysis.decision.productionMutationAuthorized, "analysis over-authorizes next work");
console.log(JSON.stringify({ status: "passed", fixtureGatePassed: analysis.passed, remoteSchemaSmokeTestPreregistrationAuthorized: analysis.decision.remoteSchemaSmokeTestPreregistrationAuthorized, modelBatchAuthorized: false, results: analysis.results, analysisSha256: sha256(analysisText) }, null, 2));
