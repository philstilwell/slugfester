#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { V388_CONTACT_ROOT, assert } from "./lib/v388-burden-contact.mjs";

const root = process.cwd();
const recoveryRoot = `${V388_CONTACT_ROOT}/evidence-recovery`;
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => { try { await access(path.resolve(root, file)); return true; } catch { return false; } };
const manifest = await readJson(`${recoveryRoot}/execution-manifest.json`);
assert(manifest.schemaVersion === "3.8.8-burden-contact-evidence-recovery-execution-manifest" && manifest.status === "frozen-one-context-authorized", "evidence recovery manifest invalid");
assert(manifest.model.slug === "gpt-5.6-sol" && manifest.model.reasoningEffort === "high", "evidence recovery model invalid");
assert(manifest.authorization.evidenceRecoveryContexts === 1 && manifest.authorization.evidenceRecoveryModelExecution, "evidence recovery context unauthorized");
for (const key of ["semanticClassificationChange", "burdenContactReclassification", "disagreementExtraction", "adjudicationModelExecution", "responseQualityModelExecution", "scoringModelExecution", "numericalParticipantScoring", "assessmentProse", "productionMutation", "tenDebateGate", "all195Debates"]) assert(manifest.authorization[key] === false, `${key} must remain unauthorized`);
assert(Object.values(manifest.isolation).every(Boolean) && manifest.immutableFields.targets.length === 2 && manifest.immutableFields.targets.map((item) => item.bundleId).join(",") === "v388-contact-55-04,v388-contact-55-20" && manifest.immutableFields.allOtherFieldsAndBundles, "evidence recovery isolation or immutable fields invalid");
assert(manifest.executionPolicy.contexts === 1 && manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.retriesMaximum === 0 && manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0, "evidence recovery execution policy invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await readBytes(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert(!Object.hasOwn(manifest.sourceHashes, future) && !(await exists(future)), `future output present or hashed: ${future}`);
assert(manifest.stopRules.sourceHashMismatchBlocksExecution && manifest.stopRules.preexistingOutputBlocksExecution && manifest.stopRules.invalidRecoveryBlocksCompilation && !manifest.stopRules.furtherAutomaticRetryAuthorized && manifest.stopRules.disagreementExtractionRemainsBlockedUntilRecoveredOutputValidates && manifest.stopRules.scoringRemainsBlocked, "evidence recovery stop rules invalid");
console.log(JSON.stringify({ status: "passed", evidenceRecoveryLockIntegrityPassed: true, contexts: 1, immutableTargets: manifest.immutableFields.targets.map((item) => ({ bundleId: item.bundleId, optionId: item.optionId })), semanticChangesAuthorized: false, maximumMeteredCostUsd: 0, scoringAuthorized: false }, null, 2));
