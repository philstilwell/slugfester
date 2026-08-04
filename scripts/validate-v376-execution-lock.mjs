#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { assert, canonicalJson } from "./lib/v376-burden-contact.mjs";
import { V376_EXECUTION_MANIFEST } from "./lib/v376-execution.mjs";

const root = process.cwd(), read = (file) => readFile(path.resolve(root, file), "utf8"), manifestText = await read(V376_EXECUTION_MANIFEST), manifest = JSON.parse(manifestText);
assert(manifest.status === "frozen-before-model-execution" && manifest.correctionSmokeExecutionAuthorized && manifest.exposedDevelopmentCases, "execution manifest identity invalid");
assert(manifest.developmentLock.remainsImmutableAndModelExecutionBlocked && manifest.developmentLock.narrowLaterExecutionAuthorization && sha256(await read(manifest.developmentLock.path)) === manifest.developmentLock.sha256, "development lock relationship invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
const dryText = await read(manifest.executionDryFixture.path), dry = JSON.parse(dryText);
assert(sha256(dryText) === manifest.executionDryFixture.sha256 && dry.passed && dry.modelContextsExecuted === 0 && dry.syntheticAdjudicationContexts === 3 && dry.twoVoteResolutions === 3 && dry.noContactDisputeVerified && dry.polarityDisputeVerified, "execution dry fixture invalid");
execFileSync(process.execPath, ["scripts/test-v376-execution-tooling.mjs"], { cwd: root, stdio: "ignore" });
assert(manifest.executionPolicy.initialContexts === 6 && manifest.executionPolicy.adjudicationContextsMaximum === 3 && manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.modelOutputRetriesMaximum === 0 && manifest.executionPolicy.sameRequestStreamRecoveriesMaximum === 0 && manifest.executionPolicy.meteredApiCostUsdMaximum === 0 && manifest.executionPolicy.transcriptionCostUsdMaximum === 0, "execution bounds, retry, or cost lock invalid");
assert(manifest.thresholds.compositeCases === 8 && manifest.thresholds.initialCompositeAgreementsRequired === 8 && manifest.thresholds.finalTwoVoteBundlesRequired === 8 && manifest.thresholds.scoringFieldsMaximum === 0, "perfect semantic threshold invalid");
for (const [reviewerPass, debates] of Object.entries(manifest.initialContexts)) for (const [debateNumber, context] of Object.entries(debates)) {
  const packetText = await read(context.packet), schemaText = await read(context.schema), packet = JSON.parse(packetText);
  assert(sha256(packetText) === context.packetSha256 && sha256(schemaText) === context.schemaSha256, `${reviewerPass}.${debateNumber}: packet hash invalid`);
  assert(packet.reviewerPass === reviewerPass && packet.debateNumber === debateNumber && !canonicalJson(packet).includes("matchesDesignFixture") && !canonicalJson(packet).includes("semanticTuple"), `${reviewerPass}.${debateNumber}: packet leak or identity invalid`);
}
assert(manifest.prohibitions.benchmarkMutation && manifest.prohibitions.largerModelBatch && manifest.prohibitions.heldOutAccess && manifest.prohibitions.numericalParticipantScoring && manifest.prohibitions.assessmentProse && manifest.prohibitions.productionMutation, "prohibitions invalid");
console.log(JSON.stringify({ status: "passed", artifactIntegrityPassed: true, executionToolingPassed: true, modelExecutionAuthorizedByNarrowManifest: true, initialContexts: 6, adjudicationContextsMaximum: 3, perfectInitialAgreementRequired: 8, meteredApiCostUsdMaximum: 0, manifestSha256: sha256(manifestText) }, null, 2));
