#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  POST_CANARY_BATCH_10_PUBLICATION_TIMEOUT_RECOVERY_DEBATES as DEBATES,
  POST_CANARY_BATCH_10_PUBLICATION_TIMEOUT_RECOVERY_PROTOCOL_ID as PROTOCOL_ID,
  POST_CANARY_BATCH_10_PUBLICATION_TIMEOUT_RECOVERY_ROOT as ROOT,
  POST_CANARY_BATCH_10_PUBLICATION_TIMEOUT_SHARD_PACKET_VERSION,
  buildPublicationTimeoutRecoveryShardSchema
} from "./lib/assessment-production-post-canary-batch-10-publication-resumption-timeout-recovery.mjs";
import {
  POST_CANARY_BATCH_10_PUBLICATION_MODEL,
  POST_CANARY_BATCH_10_PUBLICATION_ROOT as PUBLICATION_ROOT
} from "./lib/assessment-production-post-canary-batch-10-publication.mjs";
import { loadAndValidatePostCanaryBatch10StandingAuthorization } from
  "./lib/assessment-production-post-canary-batch-10-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--frozen-at");
const frozenAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const FAILURE_ANALYSIS = `${PUBLICATION_ROOT}/analysis.json`;
const FAILED_EXECUTION = `${PUBLICATION_ROOT}/model-execution.json`;
const ORIGINAL_ACTIVATION = `${PUBLICATION_ROOT}/execution-activation.json`;
const STANDING =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/standing-authorization.json";
const PRODUCTION_WORKFLOW = "docs/assessment-production-workflow.md";
const READINESS_WORKFLOW = "docs/assessment-workflow-v4.2.21.17.41.md";
const OUTPUT_CONTRACT =
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md";
const PUBLICATION_MANUAL = `${PUBLICATION_ROOT}/manual.md`;
const REFERENCE_CATALOG = `${PUBLICATION_ROOT}/reference-catalog.json`;
const RECOVERY_MANUAL = `${PUBLICATION_ROOT}/manual-timeout-recovery-1.md`;
const CAFFEINATE = "/usr/bin/caffeinate";
const CODEX = "/Applications/ChatGPT.app/Contents/Resources/codex";
const sourceScripts = [
  "scripts/lib/assessment-production-post-canary-batch-10-publication-resumption-timeout-recovery.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-10-publication-resumption-timeout-recovery.mjs",
  "scripts/activate-assessment-production-post-canary-batch-10-publication-resumption-timeout-recovery.mjs",
  "scripts/run-assessment-production-post-canary-batch-10-publication-resumption-timeout-recovery.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-10-publication-resumption-timeout-recovery.mjs",
  "scripts/lib/assessment-production-post-canary-batch-10-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-10-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-10-standing-authorization.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "src/data/references.js"
];

const { record: standing } =
  await loadAndValidatePostCanaryBatch10StandingAuthorization();
assertV4(
  standing.authorization.boundedPublicationRepairs === true &&
  standing.recoveryControls.boundedFirstRecoveryAuthorized === true &&
  standing.recoveryControls.fieldDisjointShardingPermitted === true &&
  standing.recoveryControls.unattemptedContextResumptionPermitted === true,
  "standing authorization does not permit this sharded recovery"
);
const [analysisBytes, executionBytes, activationBytes] = await Promise.all([
  readFile(path.resolve(FAILURE_ANALYSIS)),
  readFile(path.resolve(FAILED_EXECUTION)),
  readFile(path.resolve(ORIGINAL_ACTIVATION))
]);
const failureAnalysis = JSON.parse(analysisBytes);
const failedExecution = JSON.parse(executionBytes);
assertV4(
  failureAnalysis.status ===
    "post-canary-batch-10-publication-output-gate-failed" &&
  failedExecution.status ===
    "post-canary-batch-10-publication-gate-complete-with-failure" &&
  failedExecution.contextsAttempted === 1 &&
  failedExecution.results.length === 1 &&
  failedExecution.results[0].debateNumber === "21" &&
  failedExecution.results[0].status === "timed-out" &&
  failedExecution.results[0].outputWritten === false &&
  canonicalJson(failedExecution.unattemptedContextIndexes) ===
    canonicalJson([1, 2, 3, 4, 5, 6, 7, 8, 9]),
  "publication timeout failure boundary changed"
);
assertV4(DEBATES.length === 1 && DEBATES[0] === "21",
  "recovery debate boundary changed");
assertV4(!(await exists(`${PUBLICATION_ROOT}/outputs/debate-21.json`)),
  "failed Debate 21 output unexpectedly exists");

const contexts = [];
const generated = [];
for (const debateNumber of DEBATES) {
  const originalPacketPath =
    `${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
  const publicationPacket = JSON.parse(
    await readFile(path.resolve(originalPacketPath))
  );
  for (const side of ["pro", "con"]) {
    const contextIndex = contexts.length;
    const moveIds = publicationPacket.moves
      .filter((move) => move.side === side)
      .map((move) => move.moveId);
    const includesSummary = side === "pro";
    const writableFields = [
      ...(includesSummary ? ["summary"] : []),
      `representativeQuotes.${side}`,
      ...moveIds.map((moveId) => `moveProse.${moveId}`),
      `overallCommentary.${side}`,
      `aiExtension.${side}`
    ];
    const shardId = side === "pro" ? "shard-01-pro-shared" : "shard-02-con";
    const packet = {
      schemaVersion:
        POST_CANARY_BATCH_10_PUBLICATION_TIMEOUT_SHARD_PACKET_VERSION,
      protocolId: PROTOCOL_ID,
      contextIndex,
      shardId,
      side,
      productionCanary: false,
      batchNumber: 10,
      stagingOnly: true,
      debateNumber,
      debateId: publicationPacket.debateId,
      recoveryType: "minimum-two-side-field-disjoint-publication-timeout-recovery",
      originalPublicationPacketPath: originalPacketPath,
      originalFailedPartialOutputReusable: false,
      participantJudgmentWasScoreBlind: true,
      publicationIsScoreLocked: true,
      scoresRepositoryOwnedAndImmutable: true,
      includesSummary,
      moveIds,
      writableFields,
      writableFieldCount: writableFields.length,
      allOtherFieldsUnavailableAndImmutable: true,
      publicationPacket
    };
    const schema = buildPublicationTimeoutRecoveryShardSchema(packet);
    const packetPath = `${ROOT}/packets/context-${contextIndex}.json`;
    const schemaPath = `${ROOT}/schemas/context-${contextIndex}.schema.json`;
    const packetBytes = pretty(packet);
    const schemaBytes = pretty(schema);
    contexts.push({
      contextIndex,
      contextType: "field-disjoint-publication-timeout-recovery-shard",
      debateNumber,
      debateId: packet.debateId,
      shardId,
      side,
      includesSummary,
      packet: packetPath,
      packetSha256: sha256(packetBytes),
      packetBytes: packetBytes.length,
      schema: schemaPath,
      schemaSha256: sha256(schemaBytes),
      schemaBytes: schemaBytes.length,
      moveIds,
      writableFields,
      writableFieldCount: writableFields.length,
      output: `${ROOT}/outputs/context-${contextIndex}.json`,
      validation: `${ROOT}/validations/context-${contextIndex}.json`,
      provenance: `${ROOT}/provenance/context-${contextIndex}.json`
    });
    generated.push([packetPath, packetBytes], [schemaPath, schemaBytes]);
  }
}
assertV4(contexts.length === 2, "two recovery contexts required");
const publicationPacket = JSON.parse(await readFile(path.resolve(
  `${PUBLICATION_ROOT}/packets/debate-21.json`)));
const required = [
  "summary",
  "representativeQuotes.pro",
  "representativeQuotes.con",
  ...publicationPacket.moves.map((move) => `moveProse.${move.moveId}`),
  "overallCommentary.pro",
  "overallCommentary.con",
  "aiExtension.pro",
  "aiExtension.con"
];
const actual = contexts.flatMap((row) => row.writableFields);
assertV4(
  actual.length === required.length &&
  new Set(actual).size === required.length &&
  canonicalJson([...actual].sort()) === canonicalJson([...required].sort()),
  "Debate 21 field partition changed"
);

const baseSources = [
  FAILURE_ANALYSIS,
  FAILED_EXECUTION,
  ORIGINAL_ACTIVATION,
  STANDING,
  PRODUCTION_WORKFLOW,
  READINESS_WORKFLOW,
  OUTPUT_CONTRACT,
  PUBLICATION_MANUAL,
  REFERENCE_CATALOG,
  RECOVERY_MANUAL,
  ...sourceScripts,
  `${PUBLICATION_ROOT}/packets/debate-21.json`
];
const sourceHashes = {};
for (const file of baseSources) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
sourceHashes[CAFFEINATE] = sha256(await readFile(CAFFEINATE));
for (const [file, bytes] of generated) sourceHashes[file] = sha256(bytes);
const futureOutputs = [
  `${ROOT}/execution-activation.json`,
  `${ROOT}/model-execution.json`,
  `${ROOT}/analysis.json`,
  ...contexts.flatMap((row) => [row.output, row.validation, row.provenance]),
  `${PUBLICATION_ROOT}/outputs/debate-21.json`,
  `${ROOT}/complete-validation-debate-21.json`,
  `${ROOT}/merge-audit-debate-21.json`
];
for (const file of futureOutputs) {
  assertV4(!(await exists(file)), `future output exists: ${file}`);
}

const manifest = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-10-publication-timeout-recovery-preparation",
  protocolId: PROTOCOL_ID,
  status:
    "frozen-two-context-batch-10-debate-21-publication-timeout-recovery-prepared-not-activated",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: false,
  batchNumber: 10,
  stagingOnly: true,
  userAuthorization: {
    source: STANDING,
    boundedFirstRecoveryAuthorized: true,
    resolvedScope:
      "exactly two minimum field-disjoint score-locked recovery shards for timed-out Debate 21",
    originalRetry: false,
    failedPartialOutputReusable: false,
    directIncrementalCostUsdMaximum: 0
  },
  failure: {
    analysis: FAILURE_ANALYSIS,
    analysisSha256: sha256(analysisBytes),
    execution: FAILED_EXECUTION,
    executionSha256: sha256(executionBytes),
    activation: ORIGINAL_ACTIVATION,
    activationSha256: sha256(activationBytes)
  },
  model: POST_CANARY_BATCH_10_PUBLICATION_MODEL,
  contexts,
  modelInputs: {
    productionWorkflow: PRODUCTION_WORKFLOW,
    readinessWorkflow: READINESS_WORKFLOW,
    outputContract: OUTPUT_CONTRACT,
    publicationManual: PUBLICATION_MANUAL,
    referenceCatalog: REFERENCE_CATALOG,
    recoveryManual: RECOVERY_MANUAL,
    filesPerContext: [
      "production-workflow.md",
      "readiness-workflow.md",
      "output-contract.md",
      "publication-manual.md",
      "reference-catalog.json",
      "recovery-manual.md",
      "packet.json",
      "schema.json"
    ]
  },
  isolation: {
    oneDebateSidePerContext: true,
    freshContextPerShard: true,
    onlyFrozenInputsAvailable: true,
    failedPartialOutputsAvailable: false,
    participantJudgmentWasScoreBlind: true,
    publicationScoreLocked: true,
    legacyAssessmentsUnavailable: true,
    otherDebatesUnavailable: true,
    rankingsAndWinnersUnavailable: true
  },
  recoveryContract: {
    debates: DEBATES,
    shardsPerDebate: 2,
    contexts: 2,
    minimumShardCount: true,
    fieldsDisjointWithinDebate: true,
    everyOriginalContentFieldAcceptedExactlyOnce: true,
    fixedFieldsReconstructedDeterministically: true,
    failedPartialOutputReused: false,
    unattemptedOriginalContextsRemainClosed: true
  },
  executionEnvironment: {
    codexPath: CODEX,
    codexCliVersion: execFileSync(CODEX, ["--version"], {
      encoding: "utf8"
    }).trim(),
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true,
    isolatedTemporaryWorkingDirectories: true,
    hostAwakeGuard: {
      path: CAFFEINATE,
      sha256: sourceHashes[CAFFEINATE],
      bytes: (await readFile(CAFFEINATE)).length,
      args: ["-dimsu"]
    }
  },
  executionPolicy: {
    contexts: 2,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0,
    recursiveCorrectionsMaximum: 0,
    absoluteGateTimeoutMs: 1200000,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    rampPhases: [
      {
        phase: "operational-one",
        maximumParallelContexts: 1,
        contextIndexes: [0],
        expansionRequiresAllValid: true
      },
      {
        phase: "ramp-two",
        maximumParallelContexts: 2,
        contextIndexes: [1],
        expansionRequiresAllValid: true
      }
    ],
    stopBeforeExpansionOnRampFailure: true,
    removedEnvironmentVariables: [
      "OPENAI_API_KEY",
      "OPENAI_ORG_ID",
      "OPENAI_PROJECT_ID",
      "OPENAI_BASE_URL",
      "AZURE_OPENAI_API_KEY",
      "CODEX_API_KEY"
    ],
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    separateActivationRequired: true
  },
  stopRules: {
    sourceHashMismatchBlocks: true,
    packetOrSchemaHashMismatchBlocks: true,
    failedPartialOutputReuseBlocks: true,
    modelAuthoredScoreBlocks: true,
    invalidOutputBlocks: true,
    timeoutBlocks: true,
    automaticRetryBlocks: true,
    timeoutExtensionBlocks: true,
    recursiveCorrectionBlocks: true,
    paidServiceBlocks: true,
    productionMutationBlocks: true,
    nextBatchSelectionBlocks: true
  },
  sourceHashes,
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  artifacts: {
    activation: `${ROOT}/execution-activation.json`,
    execution: `${ROOT}/model-execution.json`,
    analysis: `${ROOT}/analysis.json`,
    merged: { "21": `${PUBLICATION_ROOT}/outputs/debate-21.json` }
  },
  nextAuthorizedAction:
    "validate-freeze-commit-push-then-activate-exactly-two-debate-21-timeout-recovery-contexts"
};

if (shouldWrite) {
  await mkdir(path.resolve(`${ROOT}/packets`), { recursive: true });
  await mkdir(path.resolve(`${ROOT}/schemas`), { recursive: true });
  for (const [file, bytes] of generated) {
    await writeFile(path.resolve(file), bytes);
  }
  await writeFile(path.resolve(MANIFEST), pretty(manifest));
}
console.log(JSON.stringify({
  status: shouldWrite ? manifest.status : "preview",
  contexts: 2,
  debate: "21",
  shards: contexts.map((context) => ({
    shardId: context.shardId,
    side: context.side,
    moves: context.moveIds.length,
    writableFields: context.writableFieldCount
  })),
  model: manifest.model,
  attemptsPerContext: 1,
  retriesMaximum: 0,
  timeoutExtensionsMaximum: 0,
  directIncrementalCostUsdMaximum: 0,
  nextAuthorizedAction: manifest.nextAuthorizedAction
}, null, 2));
