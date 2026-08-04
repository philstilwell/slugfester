#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { V381_DEBATE_NUMBERS, V381_EXECUTION_MANIFEST, V381_ROOT, assert } from "./lib/v381-source-preparation.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (file) => readFile(path.resolve(file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const exists = async (file) => { try { await access(path.resolve(file)); return true; } catch { return false; } };
const manifest = await readJson(V381_EXECUTION_MANIFEST);
assert(manifest.schemaVersion === "3.8.1-heldout-source-preparation-correction-execution-manifest" && manifest.status === "frozen-correction-execution-authorized", "v3.8.1 execution manifest invalid");
assert(manifest.correctionBasis.invalidOutputsReused === false && manifest.correctionBasis.rerunAllProposalContexts, "correction basis invalid");
assert(manifest.authorization.sourcePreparationModelExecution && !manifest.authorization.burdenContactClassificationPasses && !manifest.authorization.numericalParticipantScoring && !manifest.authorization.assessmentProse && !manifest.authorization.productionMutation, "authorization scope invalid");
assert(manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.modelOutputRetriesMaximum === 0 && manifest.executionPolicy.sameRequestStreamRecoveriesMaximumPerContext === 2 && manifest.executionPolicy.perInvocationTimeoutMs === 3600000 && manifest.executionPolicy.timedOutContextsMaximum === 0, "execution bounds invalid");
assert(manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0 && manifest.executionPolicy.transcriptionCostUsdMaximum === 0, "authentication or cost lock invalid");
assert(manifest.deterministicNormalization.proposalCandidateIdsModelAuthored === false && manifest.deterministicNormalization.semanticFieldsChanged === false && manifest.selectionPolicy.directBridgeIdsOnly, "normalization or contact correction invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
const dry = await readJson(manifest.dryFixture.path);
assert(dry.passed && dry.modelContextsExecuted === 0 && dry.modelAuthoredCandidateIds === 0 && dry.ambiguousBridgeCoordinates === 0 && dry.phaseLocksExcludeFutureOutputs && dry.timeoutTerminationVerified, "dry fixture invalid");
for (const debateNumber of V381_DEBATE_NUMBERS) {
  const context = manifest.proposalContexts[debateNumber];
  assert(context && await exists(context.packet) && await exists(context.schema) && await exists(context.transcript) && await exists(context.events), `${debateNumber}: proposal context incomplete`);
  assert(!(await exists(context.rawOutput)) && !(await exists(context.enrichedOutput)), `${debateNumber}: corrected proposal output exists before execution`);
}
assert(!(await exists(`${V381_ROOT}/review`)) && !(await exists(`${V381_ROOT}/adjudication`)), "downstream stage directory exists before execution");
console.log(JSON.stringify({ status: "passed", artifactIntegrityPassed: true, proposalContexts: 3, reviewContexts: 3, adjudicationContextsMaximum: 3, timeoutMinutes: 60, sameRequestStreamRecoveriesMaximumPerContext: 2, subscriptionAuthenticationRequired: true, APIKeysRemoved: true, maximumMeteredCostUsd: 0, classificationModelExecutionAuthorized: false, numericalScoringAuthorized: false, assessmentProseAuthorized: false, productionMutationAuthorized: false }, null, 2));
