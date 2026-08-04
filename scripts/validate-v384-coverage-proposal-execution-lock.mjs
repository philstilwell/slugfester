#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import {
  V384_COVERAGE_EXECUTION_MANIFEST,
  V384_COVERAGE_ROOT,
  V384_DEBATE_NUMBERS,
  V384_GATE_MANIFEST,
  assert
} from "./lib/v384-coverage-preparation.mjs";

const root = process.cwd();
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = async (file) => {
  try { await access(path.resolve(root, file)); return true; }
  catch { return false; }
};

const [manifest, gate, dry] = await Promise.all([
  readJson(V384_COVERAGE_EXECUTION_MANIFEST),
  readJson(V384_GATE_MANIFEST),
  readJson(`${V384_COVERAGE_ROOT}/proposal-dry-fixture.json`)
]);
assert(manifest.schemaVersion === "3.8.4-full-coverage-proposal-execution-manifest" && manifest.status === "frozen-coverage-proposal-execution-authorized", "coverage execution manifest identity invalid");
assert(manifest.protocolId === gate.protocolId && manifest.parentPreregistration === V384_GATE_MANIFEST, "coverage execution parent mismatch");
assert(manifest.stage === "full-coverage-proposal" && manifest.calibrationOnly && manifest.AIOnly && manifest.dyadicOnly, "coverage stage boundary invalid");
assert(manifest.model.label === "5.6 Sol" && manifest.model.slug === "gpt-5.6-sol" && manifest.model.reasoningEffort === "high", "model lock mismatch");
assert(gate.executionPolicy.liveModelExecutionAuthorized === false && gate.executionPolicy.executionPhaseLockRequiredBeforeModelCalls === true, "parent execution boundary changed");
assert(gate.authorization.coverageProposalModelExecution === false && gate.authorization.deterministicPacketConstruction === true, "parent authorization changed");
assert(dry.passed === true && dry.modelContextsExecuted === 0 && dry.mediumConfidenceAudioTriggers === 1 && Object.values(dry.negativeChecks).every(Boolean), "coverage dry fixture invalid");

assert(JSON.stringify(manifest.debateNumbers) === JSON.stringify(V384_DEBATE_NUMBERS), "debate order changed");
assert(Object.keys(manifest.proposalContexts).length === 3, "exactly three proposal contexts required");
for (const debateNumber of V384_DEBATE_NUMBERS) {
  const context = manifest.proposalContexts[debateNumber];
  const debate = gate.sample.debates.find((entry) => entry.debateNumber === debateNumber);
  assert(context && debate, `${debateNumber}: context or gate debate missing`);
  assert(context.transcript === debate.transcript.path && context.events === debate.events.path && context.captionManifest === debate.captionManifest.path, `${debateNumber}: local source chain mismatch`);
  for (const file of [context.packet, context.schema, context.transcript, context.events, context.captionManifest]) assert(await exists(file), `${debateNumber}: locked context file missing: ${file}`);
  const packet = await readJson(context.packet);
  assert(packet.schemaVersion === "3.8.4-full-coverage-proposal-packet" && packet.debateNumber === debateNumber, `${debateNumber}: packet identity invalid`);
  assert(packet.coverageRules.seedInventoryKnownIncomplete && packet.coverageRules.fullTranscriptReviewRequired && packet.coverageRules.atLeastOneAdditionRequired, `${debateNumber}: fail-closed coverage rules missing`);
  assert(packet.seedMoves.length === 8 && packet.acceptedBridgeIds.length === 10 && packet.routes.length === 2, `${debateNumber}: packet seed or bridge count invalid`);
  assert(packet.seedMoves.every((move) => !Object.hasOwn(move, "provisionalBurdenContact") && !Object.hasOwn(move, "provisionalLabelWarning")), `${debateNumber}: hidden seed burden label leaked`);
  assert(packet.hiddenSeedFields.includes("provisionalBurdenContact") && packet.prohibitedOutputs.includes("calculated scores"), `${debateNumber}: packet isolation declaration missing`);
  assert(!(await exists(context.rawOutput)) && !(await exists(context.enrichedOutput)), `${debateNumber}: proposal output exists before execution`);
}

assert(manifest.authorization.coverageProposalModelExecution === true, "coverage proposal model execution not authorized");
for (const key of [
  "coverageReviewModelExecution",
  "coverageAdjudicationModelExecution",
  "audioVerification",
  "burdenContactModelExecution",
  "scoringModelExecution",
  "scoreAdjudicationModelExecution",
  "numericalParticipantScoring",
  "assessmentProse",
  "renderingClaim",
  "benchmarkMutation",
  "productionMutation",
  "tenDebateGate",
  "all195Debates"
]) assert(manifest.authorization[key] === false, `${key} must remain unauthorized`);
assert(manifest.isolation.temporaryCodexHomePerContext && manifest.isolation.fullTranscriptAndTimestampedEventsAvailable && !manifest.isolation.legacyAssessmentAvailable && !manifest.isolation.seedProvisionalBurdenContactsAvailable && !manifest.isolation.scoresAvailable, "context isolation lock invalid");
assert(manifest.executionPolicy.attemptsPerContext === 1 && manifest.executionPolicy.modelOutputRetriesMaximum === 0 && manifest.executionPolicy.sameRequestStreamRecoveriesMaximumPerContext === 2 && manifest.executionPolicy.perInvocationTimeoutMs === 3600000 && manifest.executionPolicy.timedOutContextsMaximum === 0, "execution bounds invalid");
assert(manifest.executionPolicy.authentication === "ChatGPT subscription" && manifest.executionPolicy.APIKeysRemoved && manifest.executionPolicy.meteredApiCostUsdMaximum === 0 && manifest.executionPolicy.transcriptionCostUsdMaximum === 0, "authentication or cost lock invalid");
assert(manifest.deterministicNormalization.stableAdditionIdsModelAuthored === false && manifest.deterministicNormalization.exactExcerptsDerivedFromEvents && manifest.deterministicNormalization.semanticFieldsChanged === false, "deterministic normalization lock invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert(!Object.hasOwn(manifest.sourceHashes, future), `future output included in source hashes: ${future}`);
assert(!(await exists(manifest.artifacts.proposalExecution)), "proposal execution record exists before execution");
assert(!(await exists(`${V384_COVERAGE_ROOT}/review`)) && !(await exists(`${V384_COVERAGE_ROOT}/adjudication`)), "downstream coverage stage exists before proposal execution");

console.log(JSON.stringify({
  status: "passed",
  artifactIntegrityPassed: true,
  proposalContexts: 3,
  fullLocalTranscriptContexts: 3,
  seedsAvailable: 24,
  acceptedBridgesToAudit: 30,
  attemptsPerContext: 1,
  timeoutMinutes: 60,
  sameRequestStreamRecoveriesMaximumPerContext: 2,
  subscriptionAuthenticationRequired: true,
  APIKeysRemoved: true,
  maximumMeteredCostUsd: 0,
  maximumTranscriptionCostUsd: 0,
  coverageReviewAuthorized: false,
  burdenContactAuthorized: false,
  numericalScoringAuthorized: false,
  assessmentProseAuthorized: false,
  productionMutationAuthorized: false,
  all195DebatesAuthorized: false
}, null, 2));
