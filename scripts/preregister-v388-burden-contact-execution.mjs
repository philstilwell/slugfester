#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V388_CONTACT_DEBATES,
  V388_CONTACT_INVENTORY,
  V388_CONTACT_MANUAL,
  V388_CONTACT_PASSES,
  V388_CONTACT_PRIOR_ANALYSIS,
  V388_CONTACT_PRIOR_INVENTORY,
  V388_CONTACT_ROOT,
  V388_CONTACT_RUBRIC,
  V388_CONTACT_SECTION_ANALYSIS,
  V388_CONTACT_SOURCE_AUDIT,
  V388_CONTACT_WORKFLOW,
  assert,
  containsScoreField
} from "./lib/v388-burden-contact.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
if (!frozenAt || Number.isNaN(Date.parse(frozenAt))) throw new Error("--frozen-at must be an ISO timestamp");
const manifestPath = `${V388_CONTACT_ROOT}/initial-execution-manifest.json`;
if (shouldWrite) { try { await access(path.resolve(root, manifestPath)); throw new Error(`${manifestPath} already exists`); } catch (error) { if (error.code !== "ENOENT") throw error; } }
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [sectionAnalysis, audit, dry, inherited, sourceAudit] = await Promise.all([readJson(V388_CONTACT_SECTION_ANALYSIS), readJson(`${V388_CONTACT_ROOT}/packet-construction-audit.json`), readJson(`${V388_CONTACT_ROOT}/dry-fixture.json`), readJson(`${V388_CONTACT_ROOT}/inherited-consensus-ledger.json`), readJson(V388_CONTACT_SOURCE_AUDIT)]);
assert(sectionAnalysis.passed && sectionAnalysis.decision.burdenContactPreregistrationAuthorized && !sectionAnalysis.decision.burdenContactModelExecutionAuthorized, "section consensus did not authorize burden-contact preregistration");
assert(audit.status === "passed" && audit.totals.finalMoves === 81 && audit.totals.inheritedTwoVoteTuples === 9 && audit.totals.newMoveClassifications === 72 && audit.totals.pendingAudioVerifications === 0, "contact packet audit invalid");
assert(dry.status === "passed" && dry.totals.contexts === 6 && dry.totals.bundles === 144 && dry.totals.scoreFields === 0 && dry.totals.modelContextsExecuted === 0, "contact dry fixture invalid");
assert(inherited.status === "locked-exact-identity-carry-forward" && inherited.inheritedCount === 9 && inherited.excludedPriorCount === 3 && !containsScoreField(inherited), "inherited contact ledger invalid");

const contexts = [];
for (const reviewerPass of V388_CONTACT_PASSES) for (const debateNumber of V388_CONTACT_DEBATES) {
  const packetPath = `${V388_CONTACT_ROOT}/packets/${reviewerPass}/debate-${debateNumber}.json`;
  const schemaPath = `${V388_CONTACT_ROOT}/schemas/${reviewerPass}/debate-${debateNumber}.schema.json`;
  const packet = await readJson(packetPath);
  const source = sourceAudit.debateSources[debateNumber];
  assert(packet.bundles.length === audit.totals.newByDebate[debateNumber] && packet.inheritedTuplesVisible === false && !containsScoreField(packet), `${reviewerPass}.${debateNumber}: contact packet invalid`);
  contexts.push({ reviewerPass, debateNumber, debateId: packet.debateId, bundleCount: packet.bundles.length, packet: packetPath, schema: schemaPath, transcript: source.transcriptPath, events: source.eventsPath, output: `${V388_CONTACT_ROOT}/initial-outputs/${reviewerPass}/debate-${debateNumber}.json` });
}
const sourceFiles = [
  V388_CONTACT_WORKFLOW, V388_CONTACT_RUBRIC, V388_CONTACT_MANUAL, `${V388_CONTACT_ROOT}/preregistration.md`, V388_CONTACT_INVENTORY, V388_CONTACT_SECTION_ANALYSIS, V388_CONTACT_PRIOR_ANALYSIS, V388_CONTACT_PRIOR_INVENTORY, V388_CONTACT_SOURCE_AUDIT,
  `${V388_CONTACT_ROOT}/packet-construction-audit.json`, `${V388_CONTACT_ROOT}/dry-fixture.json`, `${V388_CONTACT_ROOT}/inherited-consensus-ledger.json`, `${V388_CONTACT_ROOT}/sealed-option-map.json`, `${V388_CONTACT_ROOT}/packet-development-assessment.md`,
  "scripts/lib/v36-decision-cards.mjs", "scripts/lib/v37-retired-semantic.mjs", "scripts/lib/v385-transport.mjs", "scripts/lib/v388-burden-contact.mjs", "scripts/build-v388-burden-contact-packets.mjs", "scripts/validate-v388-burden-contact-output.mjs", "scripts/test-v388-burden-contact-tooling.mjs", "scripts/preregister-v388-burden-contact-execution.mjs", "scripts/validate-v388-burden-contact-execution-lock.mjs", "scripts/run-v388-burden-contact-initial.mjs",
  ...contexts.flatMap((context) => [context.packet, context.schema]),
  ...V388_CONTACT_DEBATES.flatMap((debateNumber) => { const source = sourceAudit.debateSources[debateNumber]; return [source.transcriptPath, source.eventsPath, source.localManifestPath]; })
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readBytes(file));
const executionOutput = `${V388_CONTACT_ROOT}/initial-model-execution.json`;
const artifact = {
  schemaVersion: "3.8.8-burden-contact-initial-execution-manifest",
  protocolId: "v3.8.8-burden-contact-consensus",
  stage: "two-independent-burden-contact-passes",
  status: "frozen-six-context-authorized",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  modelInputs: { workflow: V388_CONTACT_WORKFLOW, rubric: V388_CONTACT_RUBRIC, manual: V388_CONTACT_MANUAL, fullTranscriptRequired: true, timestampedEventsRequired: true },
  population: { finalMoves: 81, inheritedTwoVoteTuples: 9, excludedPriorTuples: 3, newMoves: 72, newByDebate: audit.totals.newByDebate, candidatesPerNewMove: 21 },
  contexts,
  authorization: { initialBurdenContactContexts: 6, initialBurdenContactModelExecution: true, deterministicDisagreementExtractionAfterPass: true, burdenContactAdjudicationModelExecution: false, responseQualityModelExecution: false, scoringModelExecution: false, numericalParticipantScoring: false, assessmentProse: false, productionMutation: false, tenDebateGate: false, all195Debates: false },
  isolation: { freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, otherPassUnavailable: true, otherDebatesUnavailable: true, inheritedTuplesUnavailable: true, sealedOptionMapUnavailable: true, priorRationalesUnavailable: true, legacyAssessmentUnavailable: true, sectionWeightsUnavailable: true, scoresUnavailable: true, winnerUnavailable: true },
  classificationPolicy: { completeCompositeTupleOnly: true, noContactPlusSupportAndAttackForTenBridges: true, anonymousOptionsCounterbalancedBetweenPasses: true, evidenceMustBeUniqueAtomicSubstring: true, deterministicCompleteTupleComparison: true, disputeOnlyThirdPassRequiresSeparateLock: true, finalTupleRequiresMatchingVotes: 2 },
  audioPolicy: { mediumOrLowConfidenceRequiresCompletedAudioVerification: true, finalMoveAttributionsHigh: 81, requiredAudioVerifications: 0, pendingAudioVerifications: 0 },
  executionPolicy: { contexts: 6, attemptsPerContext: 1, retriesMaximum: 0, sequentialExecution: true, perInvocationTimeoutMs: 3600000, recoverableStreamEventsNormalMaximum: 2, recoverableStreamEventsHardMaximum: 8, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  acceptanceRule: { validContextsRequired: 6, validNewMoveOutputsRequiredAcrossPasses: 144, closedSchemaAndDeterministicValidationRequired: true, invalidBundlesMaximum: 0, modelScoreFieldsMaximum: 0, disagreementCountDoesNotFailInitialPhase: true },
  stopRules: { sourceHashMismatchBlocksExecution: true, preexistingOutputBlocksExecution: true, invalidContextBlocksDisagreementExtraction: true, pendingAudioBlocksExecution: true, furtherAutomaticRetryAuthorized: false, adjudicationRequiresSeparatePhaseLock: true, scoringRemainsBlocked: true },
  artifacts: { execution: executionOutput, outputs: contexts.map((context) => context.output), inheritedLedger: `${V388_CONTACT_ROOT}/inherited-consensus-ledger.json`, sealedOptionMap: `${V388_CONTACT_ROOT}/sealed-option-map.json` },
  futureOutputPathsExcludedFromSourceHashes: [...contexts.map((context) => context.output), executionOutput],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, contexts: 6, finalMoves: 81, inheritedTwoVoteTuples: 9, newMoves: 72, maximumMeteredCostUsd: 0, scoringAuthorized: false }, null, 2));
