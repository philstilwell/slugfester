#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V381_ROOT,
  V382_DEBATE_NUMBERS,
  V382_CONTINUATION_FIXTURE,
  V382_EXECUTION_MANIFEST,
  V382_MANUAL,
  V382_ROOT,
  V382_TRANSPORT_FIXTURE,
  V38_GATE_MANIFEST,
  V38_SOURCE_AUDIT,
  assert,
  canonicalJson,
  enrichProposal,
  validateEnrichedProposal,
  validateProposalRaw
} from "./lib/v382-source-preparation.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const exists = async (file) => { try { await access(path.resolve(root, file)); return true; } catch { return false; } };
const failurePath = `${V381_ROOT}/frozen-attempt-failure.json`;
const [failure, audit, detectorFixture, continuationFixture] = await Promise.all([readJson(failurePath), readJson(V38_SOURCE_AUDIT), readJson(V382_TRANSPORT_FIXTURE), readJson(V382_CONTINUATION_FIXTURE)]);
assert(failure.status === "failed-at-proposal-boundary" && failure.proposalContextsSemanticallyValid === 3, "v3.8.1 salvage basis invalid");
assert(detectorFixture.status === "passed" && detectorFixture.exactStructuredWarning.parsedEvents.length === 1, "structured retry fixture invalid");
assert(continuationFixture.passed && continuationFixture.semanticallyValidatedProposalContexts === 3 && continuationFixture.transcriptAndEventChainsHashMatched === 3, "continuation dry fixture invalid");

const proposalReuseContexts = {};
const reviewContexts = {};
for (const debateNumber of V382_DEBATE_NUMBERS) {
  const failedContext = failure.contexts.find((item) => item.debateNumber === debateNumber);
  assert(failedContext?.validationExitCode === 0, `Debate ${debateNumber}: semantic validator did not pass`);
  const packet = `${V381_ROOT}/proposal/packets/debate-${debateNumber}.json`;
  const schema = `${V381_ROOT}/proposal/schemas/debate-${debateNumber}.schema.json`;
  const rawOutput = `${V381_ROOT}/proposal/raw-outputs/debate-${debateNumber}.json`;
  const enrichedOutput = `${V381_ROOT}/proposal/enriched-outputs/debate-${debateNumber}.json`;
  const source = audit.debateSources[debateNumber];
  const [packetValue, schemaValue, rawValue, enrichedValue, events] = await Promise.all([
    readJson(packet), readJson(schema), readJson(rawOutput), readJson(enrichedOutput), readJson(source.eventsPath)
  ]);
  assert(sha256(await read(rawOutput)) === failedContext.rawOutputSha256, `Debate ${debateNumber}: raw proposal hash mismatch`);
  assert(sha256(await read(enrichedOutput)) === failedContext.enrichedOutputSha256, `Debate ${debateNumber}: enriched proposal hash mismatch`);
  validateProposalRaw(rawValue, packetValue, schemaValue, events);
  validateEnrichedProposal(enrichedValue, packetValue);
  assert(canonicalJson(enrichProposal(rawValue, packetValue)) === canonicalJson(enrichedValue), `Debate ${debateNumber}: enriched proposal reproduction mismatch`);
  proposalReuseContexts[debateNumber] = {
    debateNumber,
    packet,
    schema,
    rawOutput,
    enrichedOutput,
    rawOutputSha256: failedContext.rawOutputSha256,
    enrichedOutputSha256: failedContext.enrichedOutputSha256,
    transcript: source.transcriptPath,
    transcriptSha256: source.transcriptSha256,
    events: source.eventsPath,
    eventsSha256: source.eventsSha256
  };
  reviewContexts[debateNumber] = {
    debateNumber,
    packet: `${V382_ROOT}/review/packets/debate-${debateNumber}.json`,
    schema: `${V382_ROOT}/review/schemas/debate-${debateNumber}.schema.json`,
    output: `${V382_ROOT}/review/outputs/debate-${debateNumber}.json`,
    proposalPacket: packet,
    proposal: enrichedOutput,
    transcript: source.transcriptPath,
    events: source.eventsPath
  };
}

const futureOutputs = [
  ...Object.values(reviewContexts).map((item) => item.output),
  `${V382_ROOT}/review/model-execution.json`,
  `${V382_ROOT}/initial-disagreements.json`,
  `${V382_ROOT}/adjudication/model-execution.json`,
  `${V382_ROOT}/source-preparation-analysis.json`,
  `${V382_ROOT}/final-source-inventory.json`
];
assert((await Promise.all(futureOutputs.map(exists))).every((present) => !present), "v3.8.2 future execution output already exists");

const sourceFiles = [
  "docs/assessment-workflow-v3.8.md",
  "docs/reassessment-rubric-v3.8.md",
  V382_MANUAL,
  V382_TRANSPORT_FIXTURE,
  V382_CONTINUATION_FIXTURE,
  V38_GATE_MANIFEST,
  V38_SOURCE_AUDIT,
  failurePath,
  "scripts/lib/v381-source-preparation.mjs",
  "scripts/lib/v381-source-execution.mjs",
  "scripts/lib/v382-source-preparation.mjs",
  "scripts/lib/v382-source-transport.mjs",
  "scripts/test-v382-source-transport.mjs",
  "scripts/test-v382-source-continuation.mjs",
  "scripts/build-v382-source-review-packets.mjs",
  "scripts/validate-v381-source-review.mjs",
  "scripts/validate-v381-source-adjudication.mjs",
  "scripts/extract-v382-source-disagreements.mjs",
  "scripts/analyze-v382-source-preparation.mjs",
  "scripts/run-v382-source-preparation.mjs",
  "scripts/preregister-v382-source-execution.mjs",
  "scripts/validate-v382-source-execution-lock.mjs",
  "scripts/validate-v382-source-preparation-result.mjs",
  ...Object.values(proposalReuseContexts).flatMap((item) => [item.packet, item.schema, item.rawOutput, item.enrichedOutput]),
  ...Object.values(reviewContexts).flatMap((item) => [item.packet, item.schema])
];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await read(file));

const manifest = {
  schemaVersion: "3.8.2-heldout-source-preparation-instrumentation-continuation-execution-manifest",
  protocolId: "v3.8.2-heldout-source-preparation-instrumentation-continuation",
  parentProtocolId: "v3.8.1-heldout-source-preparation-correction",
  status: "frozen-instrumentation-continuation-authorized",
  frozenAt: new Date().toISOString(),
  calibrationOnly: true,
  AIOnly: true,
  correctionBasis: {
    failureRecord: failurePath,
    failureClass: failure.failureClass,
    semanticSchemaChanged: false,
    inheritedSemanticSchema: "3.8.1",
    proposalRegenerationAuthorized: false,
    exactProposalReuseRequired: true
  },
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  modelInputs: {
    workflow: "docs/assessment-workflow-v3.8.md",
    rubric: "docs/reassessment-rubric-v3.8.md",
    manual: V382_MANUAL
  },
  debateNumbers: V382_DEBATE_NUMBERS,
  proposalReuseContexts,
  reviewContexts,
  authorization: {
    proposalReuseValidation: true,
    sourceReviewModelExecution: true,
    disputeOnlySourceAdjudicationModelExecution: true,
    requiredAudioVerification: true,
    burdenContactClassificationPasses: false,
    numericalParticipantScoring: false,
    assessmentProse: false,
    benchmarkMutation: false,
    productionMutation: false,
    all195Debates: false
  },
  authorizationScope: "Reuse and revalidate exactly three hash-pinned proposal pairs, run one isolated label-blind source review per debate, and run at most one dispute-only source adjudication per debate.",
  isolation: {
    temporaryCodexHomePerContext: true,
    proposalAndReviewContextsSeparate: true,
    reviewPacketsHideProposalLabelsAttributionAndRationales: true,
    adjudicationPacketsContainOnlyDisputedFields: true,
    priorAssessmentContentUnavailable: true,
    scoresUnavailable: true
  },
  executionPolicy: {
    proposalModelContexts: 0,
    proposalReuseContexts: 3,
    reviewContexts: 3,
    adjudicationContextsMaximum: 3,
    attemptsPerContext: 1,
    modelOutputRetriesMaximum: 0,
    sameRequestStreamRecoveriesMaximumPerContext: 2,
    sameRequestStreamRecoveryMeaning: "An anchored WARN line from codex_core::responses_retry inside the same Codex request and turn ID; never a new inference attempt.",
    structuredRetryDetectorModule: "scripts/lib/v382-source-transport.mjs",
    perInvocationTimeoutMs: 3600000,
    timedOutContextsMaximum: 0,
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0
  },
  consensusPolicy: {
    finalPreparationFieldRequiresMatchingVotes: 2,
    thirdPassLimitedToTwoInitialValues: true,
    audioRequiredIfEitherInitialAttributionBelowHigh: true,
    unresolvedAudioExcludesMove: true
  },
  selectionPolicy: {
    candidatesPerDebate: 8,
    finalMovesPerDebate: 4,
    finalMovesPerSide: 2,
    requiredCategories: ["none", "support", "attack"],
    preferTierDiversityThenTemporalSpreadThenLexicalId: true,
    directBridgeIdsOnly: true
  },
  detectorFixture: { path: V382_TRANSPORT_FIXTURE, sha256: sourceHashes[V382_TRANSPORT_FIXTURE] },
  continuationFixture: { path: V382_CONTINUATION_FIXTURE, sha256: sourceHashes[V382_CONTINUATION_FIXTURE] },
  phaseLockPolicy: {
    everyModelVisibleFileHashed: true,
    completedUpstreamArtifactsHashed: true,
    futureOutputsExcluded: true,
    transcriptsAndEventsExplicitlyHashed: true
  },
  artifacts: {
    proposalReuseValidation: `${V382_ROOT}/proposal-reuse-validation.json`,
    reviewLock: `${V382_ROOT}/review/phase-lock.json`,
    reviewExecution: `${V382_ROOT}/review/model-execution.json`,
    initialDisagreements: `${V382_ROOT}/initial-disagreements.json`,
    adjudicationOptionMap: `${V382_ROOT}/adjudication-option-map.json`,
    adjudicationLock: `${V382_ROOT}/adjudication/phase-lock.json`,
    adjudicationExecution: `${V382_ROOT}/adjudication/model-execution.json`,
    analysis: `${V382_ROOT}/source-preparation-analysis.json`,
    finalInventory: `${V382_ROOT}/final-source-inventory.json`,
    audioVerificationRequired: `${V382_ROOT}/audio-verification-required.json`
  },
  passMeaning: "A completed continuation may authorize preregistration of classification-packet construction only. Classification model execution, scores, prose, production changes, and corpus rollout remain blocked.",
  sourceHashes
};

if (shouldWrite) {
  await mkdir(path.dirname(path.resolve(root, V382_EXECUTION_MANIFEST)), { recursive: true });
  await writeFile(path.resolve(root, V382_EXECUTION_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", protocolId: manifest.protocolId, proposalReuseContexts: Object.keys(proposalReuseContexts).length, reviewContexts: Object.keys(reviewContexts).length, sourceHashes: Object.keys(sourceHashes).length }, null, 2));
