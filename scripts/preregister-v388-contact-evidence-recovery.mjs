#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_CONTACT_ROOT, assert } from "./lib/v388-burden-contact.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
const recoveryRoot = `${V388_CONTACT_ROOT}/evidence-recovery`;
const manifestPath = `${recoveryRoot}/execution-manifest.json`;
if (shouldWrite) { try { await access(path.resolve(root, manifestPath)); throw new Error(`${manifestPath} already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [initial, audit, packet] = await Promise.all([readJson(`${V388_CONTACT_ROOT}/initial-model-execution.json`), readJson(`${recoveryRoot}/defect-audit.json`), readJson(`${recoveryRoot}/packet.json`)]);
assert(initial.validOutputContexts === 5 && initial.totalAttempts === 6 && initial.totalRetries === 0 && initial.results.filter((item) => !item.gateAcceptancePassed).length === 1, "unexpected initial execution state");
assert(audit.status === "two-evidence-only-defects-confirmed" && audit.proof.replacingOnlyBothEvidenceFieldsWithFullAtomicExcerptsMakesOriginalOutputValid && audit.targets.length === 2 && audit.targets.every((item) => item.field === "evidenceText") && packet.recoveryId === audit.recoveryId, "evidence-only recovery not established");
const sourceFiles = [
  `${recoveryRoot}/manual.md`, `${recoveryRoot}/packet.json`, `${recoveryRoot}/schema.json`, `${recoveryRoot}/defect-audit.json`, `${recoveryRoot}/dry-output.json`,
  `${V388_CONTACT_ROOT}/initial-execution-manifest.json`, `${V388_CONTACT_ROOT}/initial-model-execution.json`, `${V388_CONTACT_ROOT}/initial-execution-assessment.md`, audit.originalOutput, audit.packet, audit.schema,
  "scripts/lib/v36-decision-cards.mjs", "scripts/lib/v37-retired-semantic.mjs", "scripts/lib/v385-transport.mjs", "scripts/lib/v388-burden-contact.mjs", "scripts/build-v388-contact-evidence-recovery.mjs", "scripts/validate-v388-contact-evidence-recovery.mjs", "scripts/test-v388-contact-evidence-recovery.mjs", "scripts/preregister-v388-contact-evidence-recovery.mjs", "scripts/validate-v388-contact-evidence-recovery-lock.mjs", "scripts/run-v388-contact-evidence-recovery.mjs", "scripts/compile-v388-contact-evidence-recovery.mjs"
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readBytes(file));
const futureOutputs = [`${recoveryRoot}/model-output.json`, `${recoveryRoot}/model-execution.json`, `${recoveryRoot}/recovered-output.json`, `${recoveryRoot}/recovery-audit.json`];
const artifact = {
  schemaVersion: "3.8.8-burden-contact-evidence-recovery-execution-manifest",
  protocolId: "v3.8.8-contact-evidence-only-recovery",
  status: "frozen-one-context-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  context: { recoveryId: packet.recoveryId, debateNumber: packet.debateNumber, reviewerPass: packet.reviewerPass, bundleIds: packet.targets.map((item) => item.bundleId), manual: `${recoveryRoot}/manual.md`, packet: `${recoveryRoot}/packet.json`, schema: `${recoveryRoot}/schema.json`, output: futureOutputs[0] },
  authorization: { evidenceRecoveryContexts: 1, evidenceRecoveryModelExecution: true, semanticClassificationChange: false, burdenContactReclassification: false, disagreementExtraction: false, adjudicationModelExecution: false, responseQualityModelExecution: false, scoringModelExecution: false, numericalParticipantScoring: false, assessmentProse: false, productionMutation: false, tenDebateGate: false, all195Debates: false },
  isolation: { freshTemporaryCodexHome: true, freshSourceDirectory: true, otherBundlesUnavailable: true, otherPassUnavailable: true, optionMappingUnavailable: true, candidateUniverseUnavailable: true, scoresUnavailable: true, winnerUnavailable: true },
  immutableFields: { targets: packet.targets.map((item) => ({ bundleId: item.bundleId, optionId: item.immutableSelection.optionId, rationaleSha256: sha256(item.immutableSelection.rationale) })), allOtherFieldsAndBundles: true },
  executionPolicy: { contexts: 1, attemptsPerContext: 1, retriesMaximum: 0, perInvocationTimeoutMs: 3600000, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  acceptanceRule: { validContextsRequired: 1, replacementEvidenceFieldsRequired: 2, replacementEvidenceExactUniqueSubstringRequired: true, semanticChangesMaximum: 0, scoreFieldsMaximum: 0, recoveredFullOutputMustValidate: true },
  stopRules: { sourceHashMismatchBlocksExecution: true, preexistingOutputBlocksExecution: true, invalidRecoveryBlocksCompilation: true, furtherAutomaticRetryAuthorized: false, disagreementExtractionRemainsBlockedUntilRecoveredOutputValidates: true, scoringRemainsBlocked: true },
  artifacts: { modelExecution: futureOutputs[1], recoveredOutput: futureOutputs[2], recoveryAudit: futureOutputs[3] },
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, contexts: 1, recoveryId: packet.recoveryId, semanticChangesAuthorized: false, maximumMeteredCostUsd: 0, scoringAuthorized: false }, null, 2));
