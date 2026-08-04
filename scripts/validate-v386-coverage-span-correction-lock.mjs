#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { assert } from "./lib/v384-coverage-preparation.mjs";

const root = process.cwd();
const manifestPath = "docs/calibration/v3.8.6/coverage-span-correction/execution-manifest.json";
const read = (file) => readFile(path.resolve(root, file), "utf8");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => { try { await access(path.resolve(root, file)); return true; } catch { return false; } };
const manifest = JSON.parse(await read(manifestPath));
assert(manifest.schemaVersion === "3.8.6-coverage-span-correction-execution-manifest" && manifest.status === "frozen-single-context-coordinate-correction-authorized", "manifest identity invalid");
assert(manifest.correctionBasis.targetLocalRef === "addition-01" && manifest.correctionBasis.originalWordCount === 253 && manifest.correctionBasis.v385TransportPassedClean && !manifest.correctionBasis.fullDebateRerun && !manifest.correctionBasis.semanticReassessment, "correction basis invalid");
assert(manifest.model.label === "5.6 Sol" && manifest.model.slug === "gpt-5.6-sol" && manifest.model.reasoningEffort === "high", "model invalid");
assert(manifest.modelContext.priorFullProposalAvailable === false && manifest.modelContext.localTimestampedWindowOnly, "model context invalid");
assert(manifest.authorization.freshCoordinateCorrectionContexts === 1 && manifest.authorization.coordinateCorrectionModelExecution && manifest.authorization.deterministicMergeAndFullCoverageValidation && manifest.authorization.coverageReviewPacketConstructionAfterPass, "authorization invalid");
for (const key of ["coverageReviewModelExecution", "coverageAdjudicationModelExecution", "burdenContactModelExecution", "scoringModelExecution", "numericalParticipantScoring", "assessmentProse", "productionMutation", "all195Debates"]) assert(manifest.authorization[key] === false, `${key} must remain unauthorized`);
assert(manifest.executionPolicy.attempts === 1 && manifest.executionPolicy.modelOutputRetriesMaximum === 0 && manifest.executionPolicy.perInvocationTimeoutMs === 900000 && manifest.executionPolicy.recoverableStreamEventsHardMaximum === 8 && manifest.executionPolicy.canonicalNoncoordinateIdentityRequired && manifest.executionPolicy.completeCoverageRevalidationRequired, "execution policy invalid");
assert(manifest.acceptanceRule.correctedSpanWordsMinimum === 20 && manifest.acceptanceRule.correctedSpanWordsMaximum === 220 && manifest.acceptanceRule.correctedSpanDurationMsMaximum === 150000 && manifest.acceptanceRule.noncoordinateMutationCountMaximum === 0 && manifest.acceptanceRule.completeCoverageValidatorExitCodeRequired === 0, "acceptance rule invalid");
assert(manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0 && manifest.executionPolicy.transcriptionCostUsdMaximum === 0, "authentication or cost invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert(!Object.hasOwn(manifest.sourceHashes, future) && !(await exists(future)), `future output present or hashed: ${future}`);
assert(!manifest.stopRules.furtherAutomaticRetryAuthorized, "automatic retry must remain forbidden");
console.log(JSON.stringify({ status: "passed", lockIntegrityPassed: true, targetLocalRef: "addition-01", freshContexts: 1, mutableCoordinateFields: 2, mutableSemanticFields: 0, timeoutMinutes: 15, recoverableStreamEventsHardMaximum: 8, maximumMeteredCostUsd: 0, maximumTranscriptionCostUsd: 0, coverageReviewModelExecutionAuthorized: false, scoringAuthorized: false, assessmentProseAuthorized: false }, null, 2));
