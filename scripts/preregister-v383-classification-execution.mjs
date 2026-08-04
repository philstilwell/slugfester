#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V383_AUDIO_REQUIRED,
  V383_DEBATES,
  V383_GATE_MANIFEST,
  V383_INVENTORY,
  V383_MANUAL,
  V383_PASSES,
  V383_PREREGISTRATION,
  V383_ROOT,
  V383_RUBRIC,
  V383_SOURCE_ANALYSIS,
  V383_SOURCE_AUDIT,
  V383_WORKFLOW,
  assert
} from "./lib/v383-burden-contact.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const timeIndex = process.argv.indexOf("--frozen-at");
const frozenAt = timeIndex >= 0 ? process.argv[timeIndex + 1] : new Date().toISOString();
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO timestamp");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const exists = async (file) => { try { await access(path.resolve(root, file)); return true; } catch { return false; } };

const sourceAnalysis = await readJson(V383_SOURCE_ANALYSIS);
const audit = await readJson(`${V383_ROOT}/packet-construction-audit.json`);
const fixture = await readJson(`${V383_ROOT}/packet-dry-fixture.json`);
const sourceAudit = await readJson(V383_SOURCE_AUDIT);
assert(sourceAnalysis.sourcePreparationPassed === true && sourceAnalysis.decision?.classificationPacketConstructionPreregistrationAuthorized === true, "upstream source gate did not authorize packet preregistration");
assert(audit.status === "passed" && fixture.passed === true && fixture.modelContextsExecuted === 0, "packet construction did not pass cleanly");

const contexts = {};
const phaseContexts = [];
const commonModelVisible = [V383_WORKFLOW, V383_RUBRIC, V383_MANUAL];
for (const reviewerPass of V383_PASSES) {
  contexts[reviewerPass] = {};
  for (const debateNumber of V383_DEBATES) {
    const source = sourceAudit.debateSources[debateNumber];
    const packet = `${V383_ROOT}/packets/${reviewerPass}/debate-${debateNumber}.json`;
    const schema = `${V383_ROOT}/schemas/${reviewerPass}/debate-${debateNumber}.schema.json`;
    const output = `${V383_ROOT}/outputs/${reviewerPass}/debate-${debateNumber}.json`;
    assert(!(await exists(output)), `${output} exists before execution lock`);
    const modelVisibleFiles = [...commonModelVisible, packet, schema, source.transcriptPath, source.eventsPath];
    const modelVisibleHashes = {};
    for (const file of modelVisibleFiles) modelVisibleHashes[file] = sha256(await read(file));
    contexts[reviewerPass][debateNumber] = { debateNumber, packet, schema, transcript: source.transcriptPath, events: source.eventsPath, output };
    phaseContexts.push({ reviewerPass, debateNumber, modelVisibleFiles, modelVisibleHashes, outputExcludedFromLock: output });
  }
}

const upstreamArtifacts = [
  V383_GATE_MANIFEST,
  V383_SOURCE_AUDIT,
  V383_INVENTORY,
  V383_SOURCE_ANALYSIS,
  V383_AUDIO_REQUIRED,
  `${V383_ROOT}/packet-construction-audit.json`,
  `${V383_ROOT}/packet-dry-fixture.json`,
  `${V383_ROOT}/sealed-option-map.json`,
  `${V383_ROOT}/packet-development-assessment.md`
];
const upstreamHashes = {};
for (const file of upstreamArtifacts) upstreamHashes[file] = sha256(await read(file));
const phaseLock = {
  schemaVersion: "3.8.3-heldout-classification-phase-lock",
  status: "locked-before-model-execution",
  everyModelVisibleFileHashed: true,
  completedUpstreamArtifactsHashed: true,
  futureOutputsExcluded: true,
  contexts: phaseContexts,
  upstreamHashes
};
const phaseLockPath = `${V383_ROOT}/classification-phase-lock.json`;
if (shouldWrite) await writeFile(path.resolve(root, phaseLockPath), `${JSON.stringify(phaseLock, null, 2)}\n`);

const frozenPaths = [
  V383_WORKFLOW,
  V383_RUBRIC,
  V383_MANUAL,
  V383_PREREGISTRATION,
  "scripts/lib/v383-burden-contact.mjs",
  "scripts/lib/v382-source-transport.mjs",
  "scripts/build-v383-burden-contact-packets.mjs",
  "scripts/test-v383-burden-contact-packets.mjs",
  "scripts/preregister-v383-classification-execution.mjs",
  "scripts/validate-v383-classification-execution-lock.mjs",
  "docs/calibration/v3.8.2/held-out-source-preparation-instrumentation-continuation/structured-retry-detector-fixture.json",
  ...upstreamArtifacts,
  ...phaseContexts.flatMap((context) => context.modelVisibleFiles),
  ...Object.values(sourceAudit.debateSources).map((source) => source.localManifestPath),
  phaseLockPath
];
const sourceHashes = {};
for (const file of [...new Set(frozenPaths)]) sourceHashes[file] = sha256(await read(file));

const checkpointCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const manifest = {
  schemaVersion: "3.8.3-heldout-burden-contact-classification-execution-manifest",
  protocolId: "v3.8.3-heldout-burden-contact-classification-gate",
  parentProtocolId: "v3.8.2-heldout-source-preparation-instrumentation-continuation",
  status: "frozen-classification-execution-authorized",
  frozenAt,
  checkpointCommit,
  calibrationOnly: true,
  AIOnly: true,
  dyadicOnly: true,
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  modelInputs: { workflow: V383_WORKFLOW, rubric: V383_RUBRIC, manual: V383_MANUAL },
  packetConstruction: {
    inventory: V383_INVENTORY,
    audit: `${V383_ROOT}/packet-construction-audit.json`,
    dryFixture: `${V383_ROOT}/packet-dry-fixture.json`,
    sealedOptionMap: `${V383_ROOT}/sealed-option-map.json`,
    assessment: `${V383_ROOT}/packet-development-assessment.md`,
    debateCount: 3,
    moveCount: 12,
    candidatesPerMove: 21,
    provisionalLabelsModelVisible: false,
    completeTwoRouteUniverse: true,
    allSemanticPositionsCounterbalanced: true
  },
  contexts,
  classificationPolicy: {
    twoIsolatedInitialContextsPerDebate: true,
    sameLockedSourceAndSemanticUniverse: true,
    completeTupleSelectionOnly: true,
    deterministicSemanticDisagreementExtraction: true,
    thirdContextDisputedMovesOnly: true,
    thirdContextMaySelectOnlyInitialTuples: true,
    finalTupleRequiresMatchingVotes: 2
  },
  thresholds: {
    validInitialContexts: 6,
    compositeCases: 12,
    initialCompositeAgreementsMinimum: 11,
    initialDisagreementsMaximum: 1,
    initialInvalidBundlesMaximum: 0,
    finalTwoVoteBundlesRequired: 12,
    unresolvedBundlesMaximum: 0,
    finalCategoryMinimums: { noContact: 2, support: 2, attack: 2, motion: 1, central: 1, subsidiary: 4 },
    scoringFieldsMaximum: 0
  },
  executionPolicy: {
    initialContexts: 6,
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
  audioPolicy: {
    mediumOrLowConfidenceRequiresAudioVerification: true,
    allSelectedAttributionsHigh: true,
    requiredAudioVerifications: 0,
    pendingAudioVerifications: 0
  },
  phaseLock: phaseLockPath,
  authorization: {
    burdenContactClassificationInitialPasses: true,
    deterministicDisagreementExtraction: true,
    disputeOnlyClassificationAdjudication: true,
    requiredAudioVerification: true,
    numericalParticipantScoring: false,
    assessmentProse: false,
    benchmarkMutation: false,
    productionMutation: false,
    all195Debates: false
  },
  passMeaning: "A pass may authorize preregistration of a separate adjudicated score-derivation and assessment-reconstruction gate. It does not itself authorize scores, prose, benchmark or production mutation, or corpus-wide reassessment.",
  sourceHashes
};

const output = `${V383_ROOT}/execution-manifest.json`;
if (shouldWrite) await writeFile(path.resolve(root, output), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", output, checkpointCommit, contexts: phaseContexts.length, sourceHashes: Object.keys(sourceHashes).length, classificationAuthorized: true, scoringAuthorized: false, proseAuthorized: false, productionAuthorized: false }, null, 2));
