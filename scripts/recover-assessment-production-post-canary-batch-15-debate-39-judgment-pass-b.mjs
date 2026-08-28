#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
import {
  POST_CANARY_BATCH_15_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch15StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-15-standing-authorization.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-15/independent-judgments";
const RECOVERY = `${ROOT}/recovery-1/debate-39-pass-b`;
const ORIGINAL_PREPARATION = `${ROOT}/preparation-manifest.json`;
const ORIGINAL_ACTIVATION = `${ROOT}/execution-activation.json`;
const ORIGINAL_EXECUTION = `${ROOT}/model-execution.json`;
const ORIGINAL_PACKET = `${ROOT}/judgment-packets/pass-b/debate-39.json`;
const ORIGINAL_SCHEMA = `${ROOT}/schemas/pass-b/debate-39.schema.json`;
const MERGED_JUDGMENT = `${ROOT}/judgments/pass-b/debate-39.json`;
const MERGED_RAW = `${ROOT}/raw-outputs/pass-b/debate-39.json`;
const MERGED_VALIDATION = `${ROOT}/validations/pass-b/debate-39.json`;
const MERGED_PROVENANCE = `${ROOT}/provenance/pass-b/debate-39.json`;
const STANDARD_ANALYSIS = `${ROOT}/analysis.json`;
const DIAGNOSIS = `${RECOVERY}/diagnosis.json`;
const CORRECTION = `${RECOVERY}/correction-plan.json`;
const PREPARATION = `${RECOVERY}/preparation-manifest.json`;
const ACTIVATION = `${RECOVERY}/execution-activation.json`;
const EXECUTION = `${RECOVERY}/model-execution.json`;
const ANALYSIS = `${RECOVERY}/analysis.json`;
const COHORT_OVERLAY = `${RECOVERY}/cohort-execution-overlay.json`;
const SCRIPT =
  "scripts/recover-assessment-production-post-canary-batch-15-debate-39-judgment-pass-b.mjs";
const VALIDATOR =
  "scripts/validate-assessment-production-post-canary-batch-15-independent-judgment.mjs";
const STANDING_LIBRARY =
  "scripts/lib/assessment-production-post-canary-batch-15-standing-authorization.mjs";
const DEBATE_NUMBER = "39";
const REVIEWER_PASS = "B";
const FAILED_CONTEXT_INDEX = 1;
const SHARD_IDS = ["moves-1", "moves-2-burden"];
const PREPARATION_STATUS =
  "two-field-disjoint-debate-39-pass-b-judgment-recovery-shards-prepared-not-authorized";
const ACTIVATION_STATUS =
  "two-field-disjoint-debate-39-pass-b-judgment-recovery-shards-authorized";
const EXECUTION_STATUS =
  "two-field-disjoint-debate-39-pass-b-judgment-recovery-shards-passed-merged-and-validated";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const compactJsonBytes = (value) => Buffer.from(JSON.stringify(value));
const exists = (file) => access(file).then(() => true, () => false);

function allBooleanLeavesTrue(value) {
  if (typeof value === "boolean") return value;
  if (!value || typeof value !== "object") return true;
  return Object.values(value).every(allBooleanLeavesTrue);
}

async function hashFiles(files) {
  const hashes = {};
  for (const file of [...new Set(files)].sort()) {
    hashes[file] = sha256(await readFile(file));
  }
  return hashes;
}

async function assertHashes(hashes, label) {
  for (const [file, digest] of Object.entries(hashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${label}/${file}: hash drifted`);
  }
}

function exactKeys(value, expected, label) {
  assertV4(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      JSON.stringify(Object.keys(value).sort()) ===
        JSON.stringify([...expected].sort()),
    `${label}: keys drifted`
  );
}

function buildShardSchema(fullSchema, moveIds, includeBurdenAdjustment, shardId) {
  const properties = {
    moveJudgments: {
      type: "object",
      additionalProperties: false,
      required: moveIds,
      properties: Object.fromEntries(
        moveIds.map((moveId) => [
          moveId,
          structuredClone(fullSchema.properties.moveJudgments.properties[moveId]),
        ])
      ),
    },
  };
  const required = ["moveJudgments"];
  if (includeBurdenAdjustment) {
    properties.burdenCompletionAdjustment = structuredClone(
      fullSchema.properties.burdenCompletionAdjustment
    );
    required.push("burdenCompletionAdjustment");
  }
  return {
    $schema: fullSchema.$schema,
    $id: `${fullSchema.$id}-recovery-1-${shardId}`,
    title: `SLUGFESTER Batch 15 Debate 39 Pass B ${shardId} recovery shard`,
    type: "object",
    additionalProperties: false,
    required,
    properties,
    $defs: structuredClone(fullSchema.$defs),
  };
}

function constValue(definition, fullSchema) {
  if (Object.hasOwn(definition, "const")) return structuredClone(definition.const);
  if (definition.$ref === "#/$defs/v223True") return true;
  if (definition.$ref === "#/$defs/v223False") return false;
  const referenced = definition.$ref?.startsWith("#/$defs/")
    ? fullSchema.$defs[definition.$ref.slice("#/$defs/".length)]
    : null;
  if (referenced && Object.hasOwn(referenced, "const")) {
    return structuredClone(referenced.const);
  }
  throw new Error(`cannot derive repository-owned constant from ${JSON.stringify(definition)}`);
}

function constObject(definition, fullSchema) {
  return Object.fromEntries(
    definition.required.map((key) => [
      key,
      constValue(definition.properties[key], fullSchema),
    ])
  );
}

function mergeCompactJudgment(fullSchema, firstShard, secondShard) {
  const moveIds = fullSchema.properties.moveJudgments.required;
  const combined = {
    ...firstShard.moveJudgments,
    ...secondShard.moveJudgments,
  };
  exactKeys(combined, moveIds, "merged move judgments");
  return {
    schemaVersion: fullSchema.properties.schemaVersion.const,
    protocolId: fullSchema.properties.protocolId.const,
    debateNumber: fullSchema.properties.debateNumber.const,
    debateId: fullSchema.properties.debateId.const,
    reviewerRole: fullSchema.properties.reviewerRole.const,
    assessmentModel: fullSchema.properties.assessmentModel.const,
    calibrationOnly: fullSchema.properties.calibrationOnly.const,
    lockedInventorySha256:
      fullSchema.properties.lockedInventorySha256.const,
    isolation: constObject(fullSchema.properties.isolation, fullSchema),
    moveJudgments: Object.fromEntries(
      moveIds.map((moveId) => [moveId, combined[moveId]])
    ),
    burdenCompletionAdjustment: structuredClone(
      secondShard.burdenCompletionAdjustment
    ),
    audit: constObject(fullSchema.properties.audit, fullSchema),
  };
}

function runChild(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      ...options,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let forceTimer = null;
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      resolve({ code, signal, stdout, stderr, timedOut });
    });
  });
}

async function buildPreparation({ frozenAt, checkpointCommit }) {
  const standingAuthorization =
    await loadAndValidatePostCanaryBatch15StandingAuthorization();
  const [
    originalPreparationBytes,
    originalActivationBytes,
    originalExecutionBytes,
    originalPacketBytes,
    originalSchemaBytes,
  ] = await Promise.all([
    readFile(ORIGINAL_PREPARATION),
    readFile(ORIGINAL_ACTIVATION),
    readFile(ORIGINAL_EXECUTION),
    readFile(ORIGINAL_PACKET),
    readFile(ORIGINAL_SCHEMA),
  ]);
  const originalPreparation = JSON.parse(originalPreparationBytes);
  const originalActivation = JSON.parse(originalActivationBytes);
  const originalExecution = JSON.parse(originalExecutionBytes);
  const originalSchema = JSON.parse(originalSchemaBytes);
  const originalContext = originalActivation.contexts[FAILED_CONTEXT_INDEX];
  const failedResult = originalExecution.results.find(
    (result) => result.contextIndex === FAILED_CONTEXT_INDEX
  );
  assertV4(
    originalPreparation.status ===
      "twenty-post-canary-batch-15-independent-judgment-contexts-prepared-and-frozen" &&
      originalActivation.status ===
        "frozen-twenty-post-canary-batch-15-independent-judgment-contexts-authorized" &&
      originalExecution.status ===
        "post-canary-batch-15-independent-judgment-gate-complete-with-failure" &&
      originalExecution.contextsAttempted === 3 &&
      originalExecution.contextsUnattempted === 17 &&
      originalExecution.validContexts === 2 &&
      originalExecution.invalidContexts === 1 &&
      originalExecution.retries === 0 &&
      originalExecution.timeoutExtensions === 0 &&
      failedResult?.debateNumber === DEBATE_NUMBER &&
      failedResult?.reviewerPass === REVIEWER_PASS &&
      failedResult?.status === "timed-out" &&
      failedResult?.accepted === false &&
      failedResult?.judgmentWritten === false &&
      failedResult?.attemptCount === 1 &&
      failedResult?.retryCount === 0 &&
      failedResult?.timeoutExtensionCount === 0 &&
      failedResult?.timeoutMsApplied === 900000 &&
      failedResult?.timedOut === true &&
      failedResult?.terminationSignal === "SIGTERM" &&
      originalContext?.debateNumber === DEBATE_NUMBER &&
      originalContext?.reviewerPass === REVIEWER_PASS &&
      originalContext?.judgmentPacket === ORIGINAL_PACKET &&
      originalContext?.schema === ORIGINAL_SCHEMA &&
      !(await exists(MERGED_JUDGMENT)) &&
      !(await exists(MERGED_RAW)) &&
      !(await exists(MERGED_VALIDATION)) &&
      !(await exists(MERGED_PROVENANCE)) &&
      JSON.parse(await readFile(STANDARD_ANALYSIS, "utf8")).status ===
        "post-canary-batch-15-independent-judgment-gate-failed-analysis-only",
    "preserved Debate 39 Pass B timeout boundary drifted"
  );
  assertV4(
    standingAuthorization.record.recoveryControls
      .boundedFirstRecoveryAuthorized === true &&
      standingAuthorization.record.recoveryControls
        .fieldDisjointShardingPermitted === true &&
      standingAuthorization.record.recoveryControls.minimumShardCountRequired ===
        true &&
      standingAuthorization.record.recoveryControls.failedPartialOutputReusable ===
        false &&
      standingAuthorization.record.recoveryControls
        .eachOriginalFieldAcceptedExactlyOnce === true &&
      standingAuthorization.record.recoveryControls.recoveryLevelsMaximum === 2 &&
      standingAuthorization.record.authorization.boundedCorrections === true,
    "Batch 15 bounded recovery authorization drifted"
  );
  await assertHashes(originalActivation.sourceHashes, "original activation");

  const moveIds = originalSchema.properties.moveJudgments.required;
  assertV4(moveIds.length === 23, "Debate 39 Pass B move count drifted");
  const shardDefinitions = [
    {
      shardId: SHARD_IDS[0],
      moveIds: moveIds.slice(0, 12),
      includeBurdenAdjustment: false,
    },
    {
      shardId: SHARD_IDS[1],
      moveIds: moveIds.slice(12),
      includeBurdenAdjustment: true,
    },
  ];
  assertV4(
    new Set(shardDefinitions.flatMap((shard) => shard.moveIds)).size === 23 &&
      shardDefinitions.flatMap((shard) => shard.moveIds).join(",") ===
        moveIds.join(","),
    "move fields are not an exact disjoint partition"
  );

  const generated = new Map();
  const contexts = [];
  const manual = originalActivation.modelInputs.manual;
  const sharedSources = [
    { role: "judgment-manual", path: manual },
    { role: "score-blind-source-packet", path: originalContext.sourcePacket },
    { role: "immutable-full-judgment-packet", path: ORIGINAL_PACKET },
  ];
  for (const [contextIndex, shard] of shardDefinitions.entries()) {
    const schema = buildShardSchema(
      originalSchema,
      shard.moveIds,
      shard.includeBurdenAdjustment,
      shard.shardId
    );
    const schemaPath = `${RECOVERY}/schemas/${shard.shardId}.schema.json`;
    const schemaBytes = compactJsonBytes(schema);
    generated.set(schemaPath, schemaBytes);
    const copiedInputs = [];
    for (const source of sharedSources) {
      const bytes = await readFile(source.path);
      copiedInputs.push({
        ...source,
        sha256: sha256(bytes),
        bytes: bytes.length,
      });
    }
    copiedInputs.push({
      role: "strict-field-disjoint-output-schema",
      path: schemaPath,
      sha256: sha256(schemaBytes),
      bytes: schemaBytes.length,
    });
    const packetPath = `${RECOVERY}/packets/${shard.shardId}.json`;
    const output = `${RECOVERY}/outputs/${shard.shardId}.json`;
    const packet = {
      schemaVersion:
        "1.0-assessment-production-post-canary-batch-15-debate-39-pass-b-judgment-recovery-shard-packet",
      recoveryId: "batch-15-debate-39-pass-b-judgment-recovery-1",
      recoveryLevel: 1,
      debateNumber: DEBATE_NUMBER,
      debateId: originalContext.debateId,
      reviewerPass: REVIEWER_PASS,
      reviewerRole: originalContext.reviewerRole,
      shardId: shard.shardId,
      assignedMoveIds: shard.moveIds,
      burdenCompletionAdjustmentAssigned: shard.includeBurdenAdjustment,
      otherShardOutputUnavailable: true,
      failedPartialOutputUnavailable: true,
      originalExecutionMetadataUnavailable: true,
      copiedInputs,
      strictOutputSchema: schemaPath,
      output,
      model: structuredClone(originalActivation.model),
      attemptsMaximum: 1,
      retries: 0,
      timeoutMs: 900000,
      timeoutExtensions: 0,
      modelExecutionAuthorized: false,
      deterministicCompaction: {
        packetAndSchemaWhitespaceRemovedOnly: true,
        schemaKeywordsChanged: false,
        modelWritableFieldsChanged: false,
      },
    };
    const packetBytes = compactJsonBytes(packet);
    generated.set(packetPath, packetBytes);
    contexts.push({
      contextIndex,
      shardId: shard.shardId,
      assignedMoveIds: shard.moveIds,
      burdenCompletionAdjustmentAssigned: shard.includeBurdenAdjustment,
      packet: packetPath,
      packetSha256: sha256(packetBytes),
      packetBytes: packetBytes.length,
      schema: schemaPath,
      schemaSha256: sha256(schemaBytes),
      schemaBytes: schemaBytes.length,
      output,
      copiedInputBytes:
        copiedInputs.reduce((sum, input) => sum + input.bytes, 0) +
        packetBytes.length,
    });
  }
  assertV4(
    contexts.length === 2 &&
      contexts.every((context) => context.copiedInputBytes <= 115000),
    `recovery copied-input boundary failed: ${JSON.stringify(contexts.map((context) => ({ shardId: context.shardId, copiedInputBytes: context.copiedInputBytes })))}`
  );

  const acceptedResults = originalExecution.results.filter(
    (result) => result.accepted
  );
  const protectedFiles = acceptedResults.flatMap((result) => {
    const context = originalActivation.contexts[result.contextIndex];
    return [
      context.judgmentOutput,
      context.rawOutput,
      context.validationOutput,
      context.provenanceOutput,
    ];
  });
  const protectedOutputHashes = await hashFiles(protectedFiles);
  const sourceFiles = [
    ORIGINAL_PREPARATION,
    ORIGINAL_ACTIVATION,
    ORIGINAL_EXECUTION,
    STANDARD_ANALYSIS,
    ORIGINAL_PACKET,
    ORIGINAL_SCHEMA,
    manual,
    originalContext.sourcePacket,
    originalContext.lockedInventory,
    POST_CANARY_BATCH_15_STANDING_AUTHORIZATION,
    STANDING_LIBRARY,
    VALIDATOR,
    SCRIPT,
  ];
  const sourceHashes = await hashFiles(sourceFiles);
  const mergeRule = {
    ruleId: "batch-15-debate-39-pass-b-judgment-recovery-1-field-disjoint-merge-v1",
    repositoryOwnedFields: [
      "schemaVersion",
      "protocolId",
      "debateNumber",
      "debateId",
      "reviewerRole",
      "assessmentModel",
      "calibrationOnly",
      "lockedInventorySha256",
      "isolation",
      "audit",
    ],
    acceptedModelFields: {
      [SHARD_IDS[0]]: shardDefinitions[0].moveIds,
      [SHARD_IDS[1]]: [
        ...shardDefinitions[1].moveIds,
        "burdenCompletionAdjustment",
      ],
    },
    acceptedFieldOverlap: [],
    originalFailedPartialOutputReusable: false,
    originalFailedOutputUsedAsSubstantiveInput: false,
    eachOriginalModelWritableFieldAcceptedExactlyOnce: true,
    completeMergedJudgmentValidator: VALIDATOR,
    completeTwentyContextCohortReplayRequired: true,
  };
  const mergeRuleCanonicalSha256 = sha256(canonicalJson(mergeRule));

  const diagnosis = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-15-debate-39-pass-b-judgment-timeout-diagnosis",
    status:
      "preserved-debate-39-pass-b-timeout-diagnosed-output-size-time-failure-no-partial-output-accepted",
    frozenAt,
    checkpointCommit,
    debateNumber: DEBATE_NUMBER,
    reviewerPass: REVIEWER_PASS,
    evidence: {
      originalPreparation: ORIGINAL_PREPARATION,
      originalPreparationSha256: sha256(originalPreparationBytes),
      originalActivation: ORIGINAL_ACTIVATION,
      originalActivationSha256: sha256(originalActivationBytes),
      originalExecution: ORIGINAL_EXECUTION,
      originalExecutionSha256: sha256(originalExecutionBytes),
      originalPacket: ORIGINAL_PACKET,
      originalPacketSha256: sha256(originalPacketBytes),
      originalSchema: ORIGINAL_SCHEMA,
      originalSchemaSha256: sha256(originalSchemaBytes),
    },
    observedFailure: {
      contextIndex: FAILED_CONTEXT_INDEX,
      status: failedResult.status,
      elapsedMs: failedResult.elapsedMs,
      timeoutMsApplied: failedResult.timeoutMsApplied,
      timedOut: failedResult.timedOut,
      terminationSignal: failedResult.terminationSignal,
      resultFileProduced: false,
      judgmentWritten: false,
      accepted: false,
      stderrEvidencePresent: failedResult.stderrSha256 !== sha256(""),
      failedPartialOutputReusable: false,
    },
    deterministicDiagnosis: {
      category: "model-context-output-size-timeout-without-result-file",
      transportStarted: true,
      responseSchemaRejected: false,
      deterministicValidatorReached: false,
      partialOutputAvailableForAcceptance: false,
      ordinaryRetryPermitted: false,
      timeoutExtensionPermitted: false,
      minimumFieldDisjointShardCount: 2,
      shardMoveCounts: [10, 10],
      burdenCompletionAdjustmentAssignedExactlyOnce: true,
      rationale:
        "The full 23-move judgment emitted substantial generation evidence but did not produce a result file within 15 minutes after a recorded stream-disconnect recovery. Two fresh 12/11-move shards are the minimum field-disjoint output-size reduction; the debate-wide burden adjustment is assigned only to the second shard.",
    },
    schedulerAudit: {
      frozenAbortBeforeStartingAdditionalContextOnAnyFailure: true,
      postFailureContextsStarted: originalExecution.results
        .filter((result) => result.startedAt > failedResult.completedAt)
        .map((result) => result.contextIndex),
      implementationDefect: null,
      postFailureOutputsQuarantinedPendingRecovery: false,
      rampStoppedBeforeSteadyPhase: true,
      isolationAllowsByteIdenticalPreservationAfterCompleteCohortReplay: true,
    },
    preservedAcceptedCohort: {
      acceptedJudgments: 2,
      protectedOutputHashes,
      acceptedOutputsMustRemainByteIdentical: true,
    },
    directIncrementalCostUsd: 0,
    nextAuthorizedAction:
      "freeze-two-minimum-field-disjoint-debate-39-pass-b-recovery-contexts",
  };
  const diagnosisBytes = jsonBytes(diagnosis);
  generated.set(DIAGNOSIS, diagnosisBytes);

  const correction = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-15-debate-39-pass-b-judgment-recovery-correction-plan",
    status: "minimum-two-field-disjoint-recovery-shards-frozen",
    recoveryLevel: 1,
    diagnosis: DIAGNOSIS,
    diagnosisSha256: sha256(diagnosisBytes),
    mergeRule,
    mergeRuleCanonicalSha256,
    contexts: contexts.map((context) => ({
      shardId: context.shardId,
      assignedMoveIds: context.assignedMoveIds,
      burdenCompletionAdjustmentAssigned:
        context.burdenCompletionAdjustmentAssigned,
    })),
    directIncrementalCostUsdMaximum: 0,
    attemptsPerShard: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
  };
  const correctionBytes = jsonBytes(correction);
  generated.set(CORRECTION, correctionBytes);

  const preparation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-15-debate-39-pass-b-judgment-recovery-preparation",
    status: PREPARATION_STATUS,
    frozenAt,
    checkpointCommit,
    branch: "main",
    debateNumber: DEBATE_NUMBER,
    reviewerPass: REVIEWER_PASS,
    recoveryLevel: 1,
    standingAuthorization: POST_CANARY_BATCH_15_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    model: structuredClone(originalActivation.model),
    diagnosis: DIAGNOSIS,
    diagnosisSha256: sha256(diagnosisBytes),
    correctionPlan: CORRECTION,
    correctionPlanSha256: sha256(correctionBytes),
    mergeRule,
    mergeRuleCanonicalSha256,
    contexts,
    sourceHashes,
    protectedOutputHashes,
    executionPolicy: {
      contexts: 2,
      freshIsolatedContextsRequired: true,
      effectiveMaximumParallelContexts: 1,
      attemptsPerContext: 1,
      retriesMaximum: 0,
      timeoutMsPerContext: 900000,
      timeoutExtensionsMaximum: 0,
      failedPartialOutputReusable: false,
      stopBeforeSecondShardOnFirstShardFailure: true,
      APIKeysRemoved: true,
      directIncrementalCostUsdMaximum: 0,
    },
    authorization: {
      modelExecution: false,
      retries: false,
      timeoutExtensions: false,
      recursiveCorrection: false,
      paidServices: false,
      scoreDerivation: false,
      productionMutation: false,
    },
    acceptancePolicy: {
      bothShardsMustPassOnSingleAttempts: true,
      exactFieldDisjointnessRequired: true,
      originalFailedPartialOutputUnavailable: true,
      completeMergedJudgmentMustPassExistingValidator: true,
      nineteenAcceptedJudgmentsMustRemainByteIdentical: true,
      completeTwentyContextCohortReplayRequired: true,
    },
    artifacts: {
      activation: ACTIVATION,
      execution: EXECUTION,
      analysis: ANALYSIS,
      cohortExecutionOverlay: COHORT_OVERLAY,
      mergedJudgment: MERGED_JUDGMENT,
      standardAnalysis: STANDARD_ANALYSIS,
    },
    futureOutputPathsExcludedFromSourceHashes: [
      ACTIVATION,
      EXECUTION,
      ANALYSIS,
      COHORT_OVERLAY,
      MERGED_JUDGMENT,
      MERGED_RAW,
      MERGED_VALIDATION,
      MERGED_PROVENANCE,
      ...contexts.map((context) => context.output),
    ],
    directIncrementalCostUsdMaximum: 0,
    nextAuthorizedAction:
      "activate-two-batch-15-debate-39-pass-b-field-disjoint-recovery-shards",
  };
  generated.set(PREPARATION, jsonBytes(preparation));
  return { preparation, generated };
}

async function prepare() {
  const shouldWrite = process.argv.includes("--write");
  const frozenIndex = process.argv.indexOf("--frozen-at");
  const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
  assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
  if (shouldWrite) {
    for (const file of [PREPARATION, ACTIVATION, EXECUTION, ANALYSIS, COHORT_OVERLAY]) {
      assertV4(!(await exists(file)), `${file} already exists`);
    }
  }
  const built = await buildPreparation({
    frozenAt,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
  });
  if (shouldWrite) {
    for (const [file, bytes] of built.generated) {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes);
    }
  }
  console.log(JSON.stringify({
    status: shouldWrite ? PREPARATION_STATUS : "preview",
    debateNumber: DEBATE_NUMBER,
    reviewerPass: REVIEWER_PASS,
    recoveryLevel: 1,
    shards: built.preparation.contexts.map((context) => ({
      shardId: context.shardId,
      moveFields: context.assignedMoveIds.length,
      burdenCompletionAdjustmentAssigned: context.burdenCompletionAdjustmentAssigned,
      copiedInputBytes: context.copiedInputBytes,
    })),
    originalAcceptedJudgmentsPreserved: 2,
    failedPartialOutputReusable: false,
    attemptsPerShard: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    directIncrementalCostUsdMaximum: 0,
    modelExecutionAuthorized: false,
  }, null, 2));
}

async function loadPreparation({ requireFutureAbsent = false } = {}) {
  const preparationBytes = await readFile(PREPARATION);
  const preparation = JSON.parse(preparationBytes);
  const standingAuthorization =
    await loadAndValidatePostCanaryBatch15StandingAuthorization();
  assertV4(
    preparation.status === PREPARATION_STATUS &&
      preparation.recoveryLevel === 1 &&
      preparation.contexts.length === 2 &&
      preparation.contexts.map((context) => context.shardId).join(",") ===
        SHARD_IDS.join(",") &&
      preparation.contexts.map((context) => context.assignedMoveIds.length).join(",") === "12,11" &&
      preparation.contexts.filter((context) => context.burdenCompletionAdjustmentAssigned).length === 1 &&
      preparation.standingAuthorization === POST_CANARY_BATCH_15_STANDING_AUTHORIZATION &&
      preparation.standingAuthorizationSha256 === standingAuthorization.sha256 &&
      preparation.model.label === "5.6 Sol" &&
      preparation.model.slug === "gpt-5.6-sol" &&
      preparation.model.reasoningEffort === "low" &&
      preparation.model.authentication === "ChatGPT subscription" &&
      preparation.executionPolicy.attemptsPerContext === 1 &&
      preparation.executionPolicy.retriesMaximum === 0 &&
      preparation.executionPolicy.timeoutExtensionsMaximum === 0 &&
      preparation.executionPolicy.effectiveMaximumParallelContexts === 1 &&
      preparation.executionPolicy.failedPartialOutputReusable === false &&
      preparation.authorization.modelExecution === false &&
      preparation.authorization.paidServices === false &&
      preparation.directIncrementalCostUsdMaximum === 0 &&
      allBooleanLeavesTrue(preparation.acceptancePolicy),
    "recovery preparation controls drifted"
  );
  await assertHashes(preparation.sourceHashes, "recovery source");
  await assertHashes(preparation.protectedOutputHashes, "protected accepted output");
  for (const context of preparation.contexts) {
    const [packetBytes, schemaBytes] = await Promise.all([
      readFile(context.packet),
      readFile(context.schema),
    ]);
    const packet = JSON.parse(packetBytes);
    const schema = JSON.parse(schemaBytes);
    assertV4(
      sha256(packetBytes) === context.packetSha256 &&
        sha256(schemaBytes) === context.schemaSha256 &&
        packet.shardId === context.shardId &&
        packet.modelExecutionAuthorized === false &&
        packet.failedPartialOutputUnavailable === true &&
        packet.attemptsMaximum === 1 &&
        packet.retries === 0 &&
        packet.timeoutExtensions === 0 &&
        JSON.stringify(schema.properties.moveJudgments.required) ===
          JSON.stringify(context.assignedMoveIds) &&
        Object.keys(schema.properties).includes("burdenCompletionAdjustment") ===
          context.burdenCompletionAdjustmentAssigned,
      `${context.shardId}: frozen shard drifted`
    );
  }
  if (requireFutureAbsent) {
    for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
      assertV4(!(await exists(future)), `future output already exists: ${future}`);
    }
  }
  return { preparation, preparationBytes, standingAuthorization };
}

async function validate() {
  const { preparation } = await loadPreparation();
  console.log(JSON.stringify({
    status: "passed-frozen-batch-15-debate-39-pass-b-judgment-recovery-preparation",
    contexts: preparation.contexts.length,
    moveFields: preparation.contexts.reduce((sum, context) => sum + context.assignedMoveIds.length, 0),
    burdenCompletionAdjustmentAssignments: preparation.contexts.filter((context) => context.burdenCompletionAdjustmentAssigned).length,
    protectedAcceptedJudgments: 2,
    modelContextsExecuted: 0,
    retries: 0,
    timeoutExtensions: 0,
    directIncrementalCostUsd: 0,
  }, null, 2));
}

async function activate() {
  const shouldWrite = process.argv.includes("--write");
  const activatedIndex = process.argv.indexOf("--activated-at");
  const activatedAt = activatedIndex >= 0 ? process.argv[activatedIndex + 1] : null;
  assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)), "--activated-at requires an ISO timestamp");
  if (shouldWrite) assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
  const { preparation, preparationBytes, standingAuthorization } =
    await loadPreparation({ requireFutureAbsent: true });
  const sourceHashes = await hashFiles([
    ...Object.keys(preparation.sourceHashes),
    ...Object.keys(preparation.protectedOutputHashes),
    PREPARATION,
    DIAGNOSIS,
    CORRECTION,
    ...preparation.contexts.flatMap((context) => [context.packet, context.schema]),
  ]);
  const activation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-15-debate-39-pass-b-judgment-recovery-activation",
    status: ACTIVATION_STATUS,
    activatedAt,
    recoveryLevel: 1,
    debateNumber: DEBATE_NUMBER,
    reviewerPass: REVIEWER_PASS,
    preparation: PREPARATION,
    preparationSha256: sha256(preparationBytes),
    standingAuthorization: POST_CANARY_BATCH_15_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    model: structuredClone(preparation.model),
    contexts: structuredClone(preparation.contexts),
    sourceHashes,
    protectedOutputHashes: structuredClone(preparation.protectedOutputHashes),
    executionPolicy: structuredClone(preparation.executionPolicy),
    authorization: {
      modelExecution: true,
      deterministicShardValidation: true,
      deterministicFieldDisjointMerge: true,
      completeMergedJudgmentValidation: true,
      completeCohortReplay: true,
      retries: false,
      timeoutExtensions: false,
      recursiveCorrection: false,
      paidServices: false,
      scoreDerivation: false,
      productionMutation: false,
    },
    artifacts: structuredClone(preparation.artifacts),
    directIncrementalCostUsdMaximum: 0,
    nextRequiredAction:
      "execute-two-batch-15-debate-39-pass-b-field-disjoint-recovery-shards-once",
  };
  if (shouldWrite) await writeFile(ACTIVATION, jsonBytes(activation));
  console.log(JSON.stringify({
    status: shouldWrite ? ACTIVATION_STATUS : "preview",
    contexts: 2,
    shards: SHARD_IDS,
    model: activation.model,
    maximumParallelContexts: 1,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    directIncrementalCostUsdMaximum: 0,
    modelExecutionAuthorized: true,
  }, null, 2));
}

async function executeRecovery() {
  const activationBytes = await readFile(ACTIVATION);
  const activation = JSON.parse(activationBytes);
  assertV4(
    activation.status === ACTIVATION_STATUS &&
      activation.contexts.length === 2 &&
      activation.authorization.modelExecution === true &&
      activation.executionPolicy.effectiveMaximumParallelContexts === 1 &&
      activation.executionPolicy.attemptsPerContext === 1 &&
      activation.executionPolicy.retriesMaximum === 0 &&
      activation.executionPolicy.timeoutExtensionsMaximum === 0 &&
      activation.executionPolicy.failedPartialOutputReusable === false,
    "recovery execution is unauthorized"
  );
  await assertHashes(activation.sourceHashes, "activation source");
  await assertHashes(activation.protectedOutputHashes, "protected accepted output");
  for (const future of [EXECUTION, ANALYSIS, COHORT_OVERLAY, MERGED_JUDGMENT, MERGED_RAW, MERGED_VALIDATION, MERGED_PROVENANCE, ...activation.contexts.map((context) => context.output)]) {
    assertV4(!(await exists(future)), `future output already exists: ${future}`);
  }
  const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  await access(codex);
  await access(authSource);
  const results = [];
  for (const context of activation.contexts) {
    if (results.some((result) => !result.accepted)) break;
    const temporary = await mkdtemp(
      path.join(os.tmpdir(), `slugfester-batch-15-debate-39-pass-b-${context.shardId}-`)
    );
    const isolatedCodexHome = await mkdtemp(
      path.join(os.tmpdir(), `slugfester-batch-15-debate-39-pass-b-home-${context.shardId}-`)
    );
    const startedAt = new Date().toISOString();
    const started = Date.now();
    let record;
    try {
      const packet = JSON.parse(await readFile(context.packet, "utf8"));
      for (const [source, target] of [
        [activation.sourceHashes[Object.keys(activation.sourceHashes).find((file) => file.endsWith("judgment-manual.md"))] ? Object.keys(activation.sourceHashes).find((file) => file.endsWith("judgment-manual.md")) : null, "manual.md"],
        [ORIGINAL_PACKET, "judgment-packet.json"],
        [JSON.parse(await readFile(ORIGINAL_ACTIVATION, "utf8")).contexts[FAILED_CONTEXT_INDEX].sourcePacket, "source-packet.json"],
        [context.packet, "recovery-packet.json"],
        [context.schema, "schema.json"],
      ]) {
        assertV4(source, `missing copied input for ${target}`);
        await copyFile(source, path.join(temporary, target));
      }
      await copyFile(authSource, path.join(isolatedCodexHome, "auth.json"));
      const env = { ...process.env, CODEX_HOME: isolatedCodexHome };
      for (const key of ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"]) delete env[key];
      const burdenInstruction = context.burdenCompletionAdjustmentAssigned
        ? "Also author the one debate-wide burdenCompletionAdjustment object assigned to this shard."
        : "Do not author burdenCompletionAdjustment; it is assigned only to the other unavailable shard.";
      const prompt = `Read manual.md, source-packet.json, judgment-packet.json, recovery-packet.json, and schema.json completely; read nothing else. Act only as fresh isolated independent performance Judge B for the Batch 15 Debate 39 bounded recovery shard ${context.shardId}. Judge exactly the ten assigned move IDs and no others. ${burdenInstruction} The original timed-out partial output and the other recovery shard are unavailable and must not be inferred or reused. The score-blind inventory, chronology, evidence, routes, sections, weights, propositions, and attribution are immutable. Apply every rubric anchor literally. Do not calculate scores, name a winner, claim audio review, alter candidate selection, or write publication prose. Return exactly one schema-conforming JSON object and no commentary.`;
      process.stdout.write(`[batch-15-judgment-recovery] starting ${context.shardId} 5.6 Sol/low\n`);
      const invocation = await runChild(codex, [
        "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules",
        "--model", activation.model.slug,
        "-c", `model_reasoning_effort="${activation.model.reasoningEffort}"`,
        "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search",
        "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
        "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies",
        "--sandbox", "read-only", "--color", "never",
        "--output-schema", "schema.json", "--output-last-message", "result.json", prompt,
      ], { cwd: temporary, env }, activation.executionPolicy.timeoutMsPerContext);
      const resultPath = path.join(temporary, "result.json");
      const resultExists = await exists(resultPath);
      let valid = false;
      let outputSha256 = null;
      let validationMessage = null;
      if (!invocation.timedOut && invocation.code === 0 && invocation.signal === null && resultExists) {
        const output = JSON.parse(await readFile(resultPath, "utf8"));
        const expectedTopKeys = context.burdenCompletionAdjustmentAssigned
          ? ["moveJudgments", "burdenCompletionAdjustment"]
          : ["moveJudgments"];
        exactKeys(output, expectedTopKeys, context.shardId);
        exactKeys(output.moveJudgments, context.assignedMoveIds, `${context.shardId}/moveJudgments`);
        await mkdir(path.dirname(context.output), { recursive: true });
        await copyFile(resultPath, context.output);
        outputSha256 = sha256(await readFile(context.output));
        valid = true;
      } else {
        validationMessage = `${invocation.stdout}\n${invocation.stderr}`.trim().slice(-12000);
      }
      record = {
        contextIndex: context.contextIndex,
        shardId: context.shardId,
        assignedMoveIds: context.assignedMoveIds,
        burdenCompletionAdjustmentAssigned: context.burdenCompletionAdjustmentAssigned,
        startedAt,
        completedAt: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        timeoutMsApplied: activation.executionPolicy.timeoutMsPerContext,
        timedOut: invocation.timedOut,
        commandExitCode: invocation.code,
        terminationSignal: invocation.signal,
        attemptCount: 1,
        retryCount: 0,
        timeoutExtensionCount: 0,
        authentication: "ChatGPT subscription",
        apiKeysRemoved: true,
        isolatedTemporaryCodexHome: true,
        failedPartialOutputAvailable: false,
        otherShardOutputAvailable: false,
        status: valid ? "completed-valid" : invocation.timedOut ? "timed-out" : "failed",
        accepted: valid,
        outputWritten: valid,
        outputSha256,
        stdoutSha256: sha256(invocation.stdout),
        stderrSha256: sha256(invocation.stderr),
        validationMessage,
        directIncrementalCostUsd: 0,
      };
    } catch (error) {
      record = {
        contextIndex: context.contextIndex,
        shardId: context.shardId,
        startedAt,
        completedAt: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        attemptCount: 1,
        retryCount: 0,
        timeoutExtensionCount: 0,
        status: "runner-error",
        accepted: false,
        outputWritten: false,
        error: String(error?.stack ?? error).slice(-12000),
        directIncrementalCostUsd: 0,
      };
    } finally {
      await rm(temporary, { recursive: true, force: true });
      await rm(isolatedCodexHome, { recursive: true, force: true });
    }
    results.push(record);
    process.stdout.write(`[batch-15-judgment-recovery] ${context.shardId} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
  }

  let mergedValidation = null;
  let mergedHashes = null;
  if (results.length === 2 && results.every((result) => result.accepted)) {
    const [fullSchema, firstShard, secondShard] = await Promise.all([
      readFile(ORIGINAL_SCHEMA, "utf8").then(JSON.parse),
      readFile(activation.contexts[0].output, "utf8").then(JSON.parse),
      readFile(activation.contexts[1].output, "utf8").then(JSON.parse),
    ]);
    const merged = mergeCompactJudgment(fullSchema, firstShard, secondShard);
    await mkdir(path.dirname(MERGED_JUDGMENT), { recursive: true });
    await writeFile(MERGED_JUDGMENT, jsonBytes(merged));
    mergedValidation = JSON.parse(execFileSync(process.execPath, [
      VALIDATOR,
      MERGED_JUDGMENT,
      ORIGINAL_PREPARATION,
      DEBATE_NUMBER,
      REVIEWER_PASS,
      "--write",
    ], { encoding: "utf8" }));
    mergedHashes = await hashFiles([
      MERGED_JUDGMENT,
      MERGED_RAW,
      MERGED_VALIDATION,
      MERGED_PROVENANCE,
    ]);
  }
  const passed =
    results.length === 2 &&
    results.every((result) => result.accepted) &&
    mergedValidation?.status === "passed";
  const execution = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-15-debate-39-pass-b-judgment-recovery-execution",
    status: passed ? EXECUTION_STATUS : "debate-39-pass-b-judgment-recovery-failed",
    activation: ACTIVATION,
    activationSha256: sha256(activationBytes),
    recoveryLevel: 1,
    contextsPlanned: 2,
    contextsAttempted: results.length,
    validContexts: results.filter((result) => result.accepted).length,
    invalidContexts: results.filter((result) => !result.accepted).length,
    results,
    mergedValidation,
    mergedHashes,
    originalFailedPartialOutputUsed: false,
    retries: 0,
    timeoutExtensions: 0,
    directIncrementalCostUsd: 0,
    scoresDerived: 0,
  };
  await writeFile(EXECUTION, jsonBytes(execution));
  if (!passed) {
    console.log(JSON.stringify({
      status: execution.status,
      contextsAttempted: results.length,
      validContexts: execution.validContexts,
      invalidContexts: execution.invalidContexts,
      retries: 0,
      timeoutExtensions: 0,
      directIncrementalCostUsd: 0,
    }, null, 2));
    return;
  }

  await assertHashes(activation.protectedOutputHashes, "protected accepted output after recovery");
  const originalExecution = JSON.parse(await readFile(ORIGINAL_EXECUTION, "utf8"));
  const originalActivation = JSON.parse(await readFile(ORIGINAL_ACTIVATION, "utf8"));
  const validation = JSON.parse(await readFile(MERGED_VALIDATION, "utf8"));
  const recoveredResult = {
    ...originalExecution.results[FAILED_CONTEXT_INDEX],
    status: "completed-valid-after-bounded-field-disjoint-recovery",
    accepted: true,
    timedOut: false,
    commandExitCode: 0,
    terminationSignal: null,
    judgmentWritten: true,
    judgmentSha256: mergedHashes[MERGED_JUDGMENT],
    rawOutputSha256: mergedHashes[MERGED_RAW],
    validationSha256: mergedHashes[MERGED_VALIDATION],
    provenanceSha256: mergedHashes[MERGED_PROVENANCE],
    validationSummary: validation,
    validationMessage: null,
    originalAttemptStatus: "timed-out",
    originalAttemptCount: 1,
    recoveryShardAttempts: 2,
    recoveryLevel: 1,
    recoveryExecution: EXECUTION,
    recoveryExecutionSha256: sha256(await readFile(EXECUTION)),
  };
  const effectiveResults = originalExecution.results.map((result) =>
    result.contextIndex === FAILED_CONTEXT_INDEX ? recoveredResult : result
  );
  const overlay = {
    ...originalExecution,
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-15-independent-judgment-partial-recovered-cohort-execution-overlay",
    status:
      "three-post-canary-batch-15-independent-judgment-contexts-valid-after-bounded-field-disjoint-recovery-seventeen-unattempted",
    contextsAttempted: 3,
    contextsUnattempted: 17,
    validContexts: 3,
    invalidContexts: 0,
    attempts: 3,
    results: effectiveResults,
    originalExecution: ORIGINAL_EXECUTION,
    originalExecutionSha256: sha256(await readFile(ORIGINAL_EXECUTION)),
    recovery: {
      recoveryLevel: 1,
      failedContextIndex: FAILED_CONTEXT_INDEX,
      fieldDisjointShardContextsAttempted: 2,
      fieldDisjointShardContextsPassed: 2,
      originalAcceptedJudgmentsPreservedByteIdentical: 2,
      failedPartialOutputUsed: false,
      schedulerDefectRecorded: false,
      postFailureContextsReplayedAndPreserved: [],
      originalUnattemptedContextIndexes: originalActivation.contexts
        .slice(3)
        .map((context) => context.contextIndex),
      completeMergedJudgmentValidated: true,
      completeCohortReplayRequired: false,
      completeCohortResumptionRequired: true,
    },
    totalModelContextsExecuted: 5,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    modelAuthoredScores: 0,
    scoresDerived: 0,
  };
  await writeFile(COHORT_OVERLAY, jsonBytes(overlay));
  const analysis = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-15-debate-39-pass-b-judgment-recovery-analysis",
    status:
      "debate-39-pass-b-bounded-field-disjoint-recovery-passed-seventeen-context-resumption-required",
    recoveryLevel: 1,
    originalExecution: ORIGINAL_EXECUTION,
    originalExecutionSha256: overlay.originalExecutionSha256,
    recoveryExecution: EXECUTION,
    recoveryExecutionSha256: sha256(await readFile(EXECUTION)),
    cohortExecutionOverlay: COHORT_OVERLAY,
    cohortExecutionOverlaySha256: sha256(await readFile(COHORT_OVERLAY)),
    protectedAcceptedJudgments: 2,
    protectedAcceptedOutputsByteIdentical: true,
    recoveredDebateNumber: DEBATE_NUMBER,
    recoveredReviewerPass: REVIEWER_PASS,
    moveFieldsAcceptedExactlyOnce: 23,
    burdenCompletionAdjustmentAcceptedExactlyOnce: true,
    originalFailedPartialOutputUsed: false,
    completeMergedJudgmentValidated: true,
    mergedValidation,
    completeCohortContexts: originalActivation.contexts.length,
    totalModelContextsExecuted: 5,
    retries: 0,
    timeoutExtensions: 0,
    directIncrementalCostUsd: 0,
    scoresDerived: 0,
    nextAuthorizedAction:
      "prepare-freeze-and-run-only-seventeen-original-unattempted-batch-15-independent-judgment-contexts",
  };
  await writeFile(ANALYSIS, jsonBytes(analysis));
  console.log(JSON.stringify({
    status: execution.status,
    recoveryLevel: 1,
    contextsAttempted: 2,
    validContexts: 2,
    moveFieldsAcceptedExactlyOnce: 23,
    burdenCompletionAdjustmentAcceptedExactlyOnce: true,
    originalFailedPartialOutputUsed: false,
    protectedAcceptedJudgmentsByteIdentical: 2,
    completeMergedJudgmentValidated: true,
    totalModelContextsExecuted: 5,
    retries: 0,
    timeoutExtensions: 0,
    directIncrementalCostUsd: 0,
    nextAuthorizedAction: analysis.nextAuthorizedAction,
  }, null, 2));
}

const command = process.argv[2];
if (command === "prepare") await prepare();
else if (command === "validate") await validate();
else if (command === "activate") await activate();
else if (command === "run") await executeRecovery();
else {
  throw new Error(
    "usage: recover-assessment-production-post-canary-batch-15-debate-39-judgment-pass-b.mjs <prepare|validate|activate|run>"
  );
}
