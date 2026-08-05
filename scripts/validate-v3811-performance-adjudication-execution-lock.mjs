#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { assertV3811, canonicalJson } from "./lib/v3811-performance-judgment.mjs";
import { V3811_ADJUDICATION_ROOT } from "./lib/v3811-performance-adjudication.mjs";

const root = process.cwd();
const manifestPath = `${V3811_ADJUDICATION_ROOT}/execution-manifest.json`;
const manifest = JSON.parse(await readFile(path.resolve(root, manifestPath), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (relativePath) => { try { await access(path.resolve(root, relativePath)); return true; } catch { return false; } };
assertV3811(manifest.schemaVersion === "3.8.11-performance-adjudication-execution-manifest" && manifest.status === "frozen-three-context-adjudication-authorized", "adjudication execution manifest invalid");
assertV3811(manifest.provenance.originalCleanTwoPassGatePassed && !manifest.provenance.postHocRepresentationRecoveryUsed && manifest.provenance.initialPerformanceAttempts === 6 && manifest.provenance.initialPerformanceRetries === 0 && manifest.provenance.independentPerformancePasses === 6 && manifest.provenance.moveJudgmentsAcrossPasses === 162 && manifest.provenance.disputedMoves === manifest.population.disputedMoves && manifest.provenance.exactAdjudicationSchemaEndpointAccepted && manifest.provenance.audioVerifiedMediumConfidenceMoves === 17 && manifest.provenance.audioVerifiedDisputedMoves === manifest.contexts.reduce((sum, item) => sum + item.audioVerifiedDisputedMoves, 0), "adjudication provenance invalid");
assertV3811(manifest.population.contexts === 3 && manifest.population.disputedMoves > 0 && manifest.population.responseTupleChoices >= 0 && manifest.population.charityPairChoices >= 0 && manifest.population.independentRatingChoices > 0 && manifest.population.burdenAdjustmentChoices >= 0, "adjudication population invalid");
assertV3811(manifest.contexts.length === manifest.population.contexts && new Set(manifest.contexts.map((item) => item.debateNumber)).size === manifest.population.contexts && manifest.contexts.reduce((sum, item) => sum + item.disputedMoves, 0) === manifest.population.disputedMoves, "adjudication contexts invalid");
assertV3811(Object.values(manifest.isolation).every(Boolean), "adjudication isolation invalid");
assertV3811(manifest.executionPolicy.contexts === 3 && manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.retriesMaximum === 0 && manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0 && manifest.executionPolicy.transcriptionApiCalls === 0, "adjudication execution policy invalid");
assertV3811(manifest.authorization.adjudicationModelExecution && !manifest.authorization.furtherAutomaticRetry && manifest.authorization.finalLedgerAssemblyAfterValidation && !manifest.authorization.scoreDerivation && !manifest.authorization.numericalParticipantScoring && !manifest.authorization.assessmentProse && !manifest.authorization.productionMutation && !manifest.authorization.tenDebateGate && !manifest.authorization.all195Debates, "adjudication authorization invalid");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) assertV3811(sha256(await readFile(path.resolve(root, relativePath))) === digest, `${relativePath}: source hash mismatch`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assertV3811(!(await exists(future)), `${future}: future output already exists`);
assertV3811(canonicalJson(manifest.artifacts.outputs.sort()) === canonicalJson(manifest.contexts.map((item) => item.output).sort()), "adjudication output path set mismatch");
console.log(JSON.stringify({ status: "passed", frozenAdjudicationLockIntegrityPassed: true, contexts: manifest.population.contexts, disputedMoves: manifest.population.disputedMoves, candidateChoices: manifest.population.responseTupleChoices + manifest.population.charityPairChoices + manifest.population.independentRatingChoices + manifest.population.burdenAdjustmentChoices, maximumMeteredApiCostUsd: 0, adjudicationModelExecutionAuthorized: true, scoreDerivationAuthorized: false }, null, 2));
