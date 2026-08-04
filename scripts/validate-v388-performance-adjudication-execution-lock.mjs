#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { assertV388, canonicalJson } from "./lib/v388-performance-judgment.mjs";
import { V388_ADJUDICATION_ROOT } from "./lib/v388-performance-adjudication.mjs";

const root = process.cwd();
const manifestPath = `${V388_ADJUDICATION_ROOT}/execution-manifest.json`;
const manifest = JSON.parse(await readFile(path.resolve(root, manifestPath), "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (relativePath) => { try { await access(path.resolve(root, relativePath)); return true; } catch { return false; } };
assertV388(manifest.schemaVersion === "3.8.8-performance-adjudication-execution-manifest" && manifest.status === "frozen-three-context-adjudication-authorized", "adjudication execution manifest invalid");
assertV388(manifest.provenance.originalCleanTwoPassGatePassed === false && manifest.provenance.postHocRepresentationRecoveryUsed && manifest.provenance.substantiveJudgmentFieldsChangedByRecovery === 0 && manifest.provenance.independentPerformancePasses === 6 && manifest.provenance.moveJudgmentsAcrossPasses === 162 && manifest.provenance.disputedMoves === 76 && manifest.provenance.exactAdjudicationSchemaEndpointAccepted && manifest.provenance.audioVerifiedMediumConfidenceMoves === 17 && manifest.provenance.audioVerifiedDisputedMoves === 16 && manifest.provenance.dependencyAddedCharityRatings === 2, "adjudication provenance invalid");
assertV388(manifest.population.contexts === 3 && manifest.population.disputedMoves === 76 && manifest.population.responseTupleChoices === 34 && manifest.population.charityPairChoices === 6 && manifest.population.independentRatingChoices === 184 && manifest.population.burdenAdjustmentChoices === 6, "adjudication population invalid");
assertV388(manifest.contexts.length === 3 && new Set(manifest.contexts.map((item) => item.debateNumber)).size === 3 && manifest.contexts.reduce((sum, item) => sum + item.disputedMoves, 0) === 76, "adjudication contexts invalid");
assertV388(Object.values(manifest.isolation).every(Boolean), "adjudication isolation invalid");
assertV388(manifest.executionPolicy.contexts === 3 && manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.retriesMaximum === 0 && manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0 && manifest.executionPolicy.transcriptionApiCalls === 0, "adjudication execution policy invalid");
assertV388(manifest.authorization.adjudicationModelExecution && !manifest.authorization.furtherAutomaticRetry && manifest.authorization.finalLedgerAssemblyAfterValidation && !manifest.authorization.scoreDerivation && !manifest.authorization.numericalParticipantScoring && !manifest.authorization.assessmentProse && !manifest.authorization.productionMutation && !manifest.authorization.tenDebateGate && !manifest.authorization.all195Debates, "adjudication authorization invalid");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) assertV388(sha256(await readFile(path.resolve(root, relativePath))) === digest, `${relativePath}: source hash mismatch`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assertV388(!(await exists(future)), `${future}: future output already exists`);
assertV388(canonicalJson(manifest.artifacts.outputs.sort()) === canonicalJson(manifest.contexts.map((item) => item.output).sort()), "adjudication output path set mismatch");
console.log(JSON.stringify({ status: "passed", frozenAdjudicationLockIntegrityPassed: true, contexts: 3, disputedMoves: 76, candidateChoices: 230, maximumMeteredApiCostUsd: 0, adjudicationModelExecutionAuthorized: true, scoreDerivationAuthorized: false }, null, 2));
