#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { assert, sha256 } from "./lib/v36-decision-cards.mjs";
import { auditCoverage, canonicalJson, V372_ROOT } from "./lib/v372-atomic-bundles.mjs";

const root = process.cwd(), read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${V372_ROOT}/replay-manifest.json`), manifest = JSON.parse(manifestText);
assert(manifest.status === "frozen-before-deterministic-replay" && manifest.retrospectiveDevelopmentOnly, "manifest identity invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
const spec = JSON.parse(await read(manifest.specification.path)), coverage = auditCoverage(spec);
assert(spec.bundles.length === 8 && coverage.all.length === 14 && coverage.unique === 14 && coverage.independent.length === 12 && coverage.witnesses.length === 2, "bundle specification coverage invalid");
const fixtureText = await read(manifest.fixtures.path), fixture = JSON.parse(fixtureText);
assert(sha256(fixtureText) === manifest.fixtures.sha256 && fixture.passed && fixture.discretionaryRepairs === 0, "fixture provenance invalid");
const replayText = await read(manifest.replayPath), replay = JSON.parse(replayText);
assert(replay.sources.manifestSha256 === sha256(manifestText) && replay.sources.priorAnalysisSha256 === manifest.priorV371.analysisSha256, "replay provenance invalid");
const expectedGates = {
  initialPassCompilation: replay.mechanics.initialPassesCompiled === manifest.developmentAcceptance.compiledInitialPasses,
  bundleCoverage: replay.mechanics.bundleCoveragePerPass === manifest.developmentAcceptance.bundleCoveragePerPass,
  finalCompilation: replay.mechanics.finalBundlesCompiled === manifest.developmentAcceptance.compiledFinalBundles,
  finalValidity: replay.mechanics.validFinalBundles === manifest.developmentAcceptance.validFinalBundles,
  discretionaryRepair: replay.mechanics.discretionaryRepairs <= manifest.developmentAcceptance.discretionaryRepairsMaximum,
  modelContexts: replay.mechanics.modelContexts === manifest.developmentAcceptance.modelContexts,
  paidTranscription: replay.mechanics.paidTranscriptionCalls === manifest.developmentAcceptance.paidTranscriptionCalls,
  meteredCost: replay.mechanics.meteredApiCostUsd <= manifest.developmentAcceptance.meteredApiCostUsdMaximum
};
assert(canonicalJson(replay.gates) === canonicalJson(expectedGates), "replay gates invalid");
const expectedPassed = Object.values(expectedGates).every(Boolean);
assert(replay.compilerPassed === expectedPassed && replay.decision.atomicPacketDevelopmentAuthorized === expectedPassed, "compiler decision invalid");
assert(replay.semanticDiagnostics.atomicBundleCount === 8 && replay.semanticDiagnostics.initialAgreements + replay.semanticDiagnostics.initialDisagreements === 8, "semantic diagnostic coverage invalid");
assert(!replay.decision.freshModelExecutionAuthorized && !replay.decision.resolvedValuesAuthorizedAsBenchmarkKey && !replay.decision.heldOutAccessAuthorized && !replay.decision.numericalParticipantScoringAuthorized && !replay.decision.assessmentProseAuthorized && !replay.decision.productionMutationAuthorized, "replay over-authorizes work");
console.log(JSON.stringify({ status: "passed", artifactIntegrityPassed: true, compilerPassed: replay.compilerPassed, mechanics: replay.mechanics, semanticDiagnostics: { atomicBundleCount: replay.semanticDiagnostics.atomicBundleCount, initialAgreements: replay.semanticDiagnostics.initialAgreements, initialDisagreements: replay.semanticDiagnostics.initialDisagreements, invalidInitialBundles: replay.semanticDiagnostics.invalidInitialBundles }, decision: replay.decision, replaySha256: sha256(replayText) }, null, 2));
