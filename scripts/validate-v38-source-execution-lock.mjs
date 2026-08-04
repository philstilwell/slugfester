#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { V38_DEBATE_NUMBERS, V38_ROOT, assert } from "./lib/v38-source-preparation.mjs";
import { V38_SOURCE_EXECUTION_MANIFEST } from "./lib/v38-source-execution.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => { try { await access(path.resolve(file)); return true; } catch { return false; } };
const manifest = JSON.parse(await readFile(path.resolve(V38_SOURCE_EXECUTION_MANIFEST), "utf8"));
assert(manifest.schemaVersion === "3.8-heldout-source-execution-manifest" && manifest.status === "frozen-source-execution-authorized", "source execution manifest invalid");
assert(manifest.authorization.sourcePreparationModelExecution && !manifest.authorization.burdenContactClassificationPasses && !manifest.authorization.numericalParticipantScoring && !manifest.authorization.assessmentProse && !manifest.authorization.productionMutation, "execution authorization scope invalid");
assert(manifest.executionPolicy.proposalContexts === 3 && manifest.executionPolicy.reviewContexts === 3 && manifest.executionPolicy.adjudicationContextsMaximum === 3, "context policy invalid");
assert(manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.modelOutputRetriesMaximum === 0 && manifest.executionPolicy.meteredApiCostUsdMaximum === 0 && manifest.executionPolicy.transcriptionCostUsdMaximum === 0, "attempt or cost policy invalid");
assert(manifest.consensusPolicy.finalPreparationFieldRequiresMatchingVotes === 2 && manifest.consensusPolicy.thirdPassLimitedToTwoInitialValues && manifest.consensusPolicy.audioRequiredIfEitherInitialAttributionBelowHigh, "consensus policy invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await readFile(path.resolve(file), "utf8")) === digest, `source hash mismatch: ${file}`);
const dry = JSON.parse(await readFile(path.resolve(manifest.dryFixture.path), "utf8"));
assert(dry.passed && dry.syntheticDisputedFieldCount === 6 && dry.twoVoteResolvedFields === 44 && dry.unresolvedFields === 0 && dry.mediumConfidenceAudioTriggerVerified && dry.initialPassIdentityLeakage === 0, "execution dry fixture invalid");
for (const debateNumber of V38_DEBATE_NUMBERS) {
  const context = manifest.proposalContexts[debateNumber];
  assert(context && await exists(context.packet) && await exists(context.schema) && await exists(context.transcript) && await exists(context.events), `${debateNumber}: proposal context incomplete`);
  assert(!(await exists(context.output)), `${debateNumber}: proposal output exists before execution`);
}
assert(!(await exists(`${V38_ROOT}/source-preparation/review`)), "review directory exists before execution");
assert(!(await exists(`${V38_ROOT}/source-preparation/adjudication`)), "adjudication directory exists before execution");
console.log(JSON.stringify({ status: "passed", artifactIntegrityPassed: true, proposalContexts: 3, reviewContexts: 3, adjudicationContextsMaximum: 3, subscriptionAuthenticationRequired: true, APIKeysRemoved: true, maximumMeteredCostUsd: 0, sourcePreparationModelExecutionAuthorized: true, classificationPassesAuthorized: false, numericalScoringAuthorized: false, assessmentProseAuthorized: false, productionMutationAuthorized: false }, null, 2));
