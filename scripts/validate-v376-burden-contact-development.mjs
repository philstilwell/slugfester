#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { V376_ROOT, assert, canonicalJson } from "./lib/v376-burden-contact.mjs";

const root = process.cwd(), read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${V376_ROOT}/development-manifest.json`), manifest = JSON.parse(manifestText);
assert(manifest.status === "frozen-packet-development-model-execution-blocked" && manifest.exposedDevelopmentCases, "manifest identity invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
const dryText = await read(manifest.dryFixture.path), dry = JSON.parse(dryText);
assert(sha256(dryText) === manifest.dryFixture.sha256 && dry.passed && dry.compositeCaseCount === 8 && dry.noContactCandidateRequired && dry.supportAttackPolarityRequired && dry.modelContextsExecuted === 0, "dry fixture invalid");
const mappingText = await read(manifest.sealedOptionMap.path), mapping = JSON.parse(mappingText);
assert(sha256(mappingText) === manifest.sealedOptionMap.sha256, "sealed map hash invalid");
for (const pass of ["pass-a", "pass-b"]) {
  assert(Object.keys(mapping.passes[pass]).length === 8, `${pass}: map coverage invalid`);
  for (const bundle of Object.values(mapping.passes[pass])) assert(bundle.options.length >= 7 && bundle.options.length <= 9 && bundle.options.filter((item) => item.matchesDesignFixture).length === 1, `${pass}: candidate coverage invalid`);
}
execFileSync(process.execPath, ["scripts/test-v376-burden-contact-packets.mjs"], { cwd: root, stdio: "ignore" });
assert(manifest.frozenThresholds.initialCompositeAgreementsRequired === 8 && manifest.frozenThresholds.finalTwoVoteBundlesRequired === 8, "perfect thresholds invalid");
assert(manifest.decomposition.exactPropositionContactFirst && manifest.decomposition.explicitNoContactCandidate && manifest.decomposition.supportAttackPolarityExplicit && manifest.decomposition.bridgeSelectedWithinValidComposite && manifest.decomposition.genericSubsidiaryCatchAllProhibited, "decomposition controls invalid");
assert(!manifest.developmentState.executionRunnerImplemented && !manifest.developmentState.disagreementExtractorImplemented && !manifest.developmentState.adjudicationRunnerImplemented && !manifest.developmentState.analyzerImplemented && !manifest.developmentState.modelExecutionAuthorized, "development state overstates readiness");
for (const debates of Object.values(manifest.contexts)) for (const context of Object.values(debates)) {
  const packet = JSON.parse(await read(context.packet));
  assert(!canonicalJson(packet).includes("matchesDesignFixture") && !canonicalJson(packet).includes("semanticTuple"), `${context.packet}: sealed fixture leaked`);
}
assert(manifest.prohibitions.modelExecution && manifest.prohibitions.benchmarkMutation && manifest.prohibitions.largerModelBatch && manifest.prohibitions.heldOutAccess && manifest.prohibitions.numericalParticipantScoring && manifest.prohibitions.assessmentProse && manifest.prohibitions.productionMutation, "prohibitions invalid");
console.log(JSON.stringify({ status: "passed", artifactIntegrityPassed: true, burdenContactPacketDevelopmentPassed: true, compositeCases: dry.compositeCaseCount, perfectInitialAgreementRequired: manifest.frozenThresholds.initialCompositeAgreementsRequired, modelExecutionAuthorized: false, manifestSha256: sha256(manifestText) }, null, 2));
