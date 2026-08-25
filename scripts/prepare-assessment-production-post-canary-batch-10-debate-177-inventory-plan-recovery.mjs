#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  POST_CANARY_BATCH_10_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch10StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-10-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/inventory-candidate-sharded";
const RECOVERY = `${ROOT}/plan-recovery-1/debate-177`;
const ORIGINAL_PREPARATION = `${ROOT}/plan-execution-preparation-manifest.json`;
const SOURCE_PREPARATION = `${ROOT}/preparation-manifest.json`;
const ORIGINAL_ACTIVATION = `${ROOT}/plan-execution-activation.json`;
const ORIGINAL_EXECUTION = `${ROOT}/plan-model-execution.json`;
const ORIGINAL_PACKET = `${ROOT}/packets/plans/debate-177.json`;
const ORIGINAL_SCHEMA = `${ROOT}/schemas/plans/debate-177.schema.json`;
const DIAGNOSIS = `${RECOVERY}/diagnosis.json`;
const CORRECTION = `${RECOVERY}/correction-plan.json`;
const PREPARATION = `${RECOVERY}/execution-preparation-manifest.json`;
const ACTIVATION = `${RECOVERY}/execution-activation.json`;
const EXECUTION = `${RECOVERY}/model-execution.json`;
const RECOVERY_ANALYSIS = `${RECOVERY}/analysis.json`;
const COHORT_ANALYSIS = `${ROOT}/plan-analysis.json`;
const MERGED_PLAN = `${ROOT}/plans/debate-177.json`;
const PREPARER =
  "scripts/prepare-assessment-production-post-canary-batch-10-debate-177-inventory-plan-recovery.mjs";
const RUNNER =
  "scripts/run-assessment-production-post-canary-batch-10-debate-177-inventory-plan-recovery.mjs";
const VALIDATOR =
  "scripts/lib/assessment-production-score-stability-v2-inventory-candidate-sharded.mjs";
const STANDING_LIBRARY =
  "scripts/lib/assessment-production-post-canary-batch-10-standing-authorization.mjs";
const PROTOCOL_ID =
  "assessment-production-post-canary-batch-10-candidate-sharded-inventory";
const DEBATE_NUMBER = "177";
const SHARDS = ["routes", "sections"];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

function allBooleanLeavesTrue(value) {
  if (typeof value === "boolean") return value;
  if (!value || typeof value !== "object") return true;
  return Object.values(value).every(allBooleanLeavesTrue);
}

function shardSchema(fullSchema, field) {
  return {
    $schema: fullSchema.$schema,
    $id: `${fullSchema.$id}-debate-177-recovery-1-${field}`,
    title: `Slugfester Batch 10 Debate 177 ${field} recovery shard`,
    type: "object",
    additionalProperties: false,
    required: [field],
    properties: {
      [field]: structuredClone(fullSchema.properties[field]),
    },
  };
}

function mergeRule() {
  return {
    ruleId: "batch-10-debate-177-plan-recovery-1-field-disjoint-merge-v1",
    repositoryOwnedFields: [
      "schemaVersion",
      "protocolId",
      "debateNumber",
      "debateId",
      "reviewerRole",
      "assessmentModel",
      "calibrationOnly",
      "candidateCensusCanonicalSha256",
      "fullCandidateTransportCanonicalSha256",
      "isolation",
      "audit",
    ],
    acceptedModelFields: {
      routes: "routes-shard-only",
      sections: "sections-shard-only",
    },
    acceptedFieldOverlap: [],
    originalFailedPartialOutputReusable: false,
    originalFailedOutputUsedAsSubstantiveInput: false,
    eachOriginalModelWritableFieldAcceptedExactlyOnce: true,
    outputPath: MERGED_PLAN,
    completeMergedPlanValidator: VALIDATOR,
    completeTenPlanCohortReplayRequired: true,
  };
}

async function buildArtifacts({ frozenAt, checkpointCommit }) {
  const standingAuthorization =
    await loadAndValidatePostCanaryBatch10StandingAuthorization();
  const [
    sourcePreparationBytes,
    originalPreparationBytes,
    originalActivationBytes,
    originalExecutionBytes,
    originalPacketBytes,
    originalSchemaBytes,
  ] = await Promise.all([
    readFile(SOURCE_PREPARATION),
    readFile(ORIGINAL_PREPARATION),
    readFile(ORIGINAL_ACTIVATION),
    readFile(ORIGINAL_EXECUTION),
    readFile(ORIGINAL_PACKET),
    readFile(ORIGINAL_SCHEMA),
  ]);
  const sourcePreparation = JSON.parse(sourcePreparationBytes);
  const originalPreparation = JSON.parse(originalPreparationBytes);
  const originalActivation = JSON.parse(originalActivationBytes);
  const originalExecution = JSON.parse(originalExecutionBytes);
  const originalPacket = JSON.parse(originalPacketBytes);
  const originalSchema = JSON.parse(originalSchemaBytes);
  const sourceContext = sourcePreparation.contexts.find(
    (context) => context.debateNumber === DEBATE_NUMBER
  );
  const preparedContext = originalPreparation.contexts.find(
    (context) => context.debateNumber === DEBATE_NUMBER
  );
  const failedResult = originalExecution.results.find(
    (result) => result.debateNumber === DEBATE_NUMBER
  );
  assertV4(
    sourcePreparation.status ===
      "post-canary-batch-10-candidate-sharded-source-assets-and-ten-planner-packets-frozen" &&
      originalPreparation.status ===
        "frozen-ten-post-canary-batch-10-candidate-census-plan-contexts-prepared-not-authorized" &&
      originalActivation.status ===
        "frozen-ten-post-canary-batch-10-candidate-census-plan-contexts-authorized" &&
      originalExecution.status ===
        "post-canary-batch-10-candidate-census-plan-gate-complete-with-failure" &&
      originalExecution.contextsPlanned === 10 &&
      originalExecution.contextsAttempted === 10 &&
      originalExecution.validContexts === 9 &&
      originalExecution.invalidContexts === 1 &&
      originalExecution.retries === 0 &&
      originalExecution.timeoutExtensions === 0 &&
      failedResult?.contextIndex === 5 &&
      failedResult?.status === "timed-out" &&
      failedResult?.accepted === false &&
      failedResult?.planOutputWritten === false &&
      failedResult?.timedOut === true &&
      failedResult?.timeoutMsApplied === 600000 &&
      failedResult?.attemptCount === 1 &&
      failedResult?.retryCount === 0 &&
      failedResult?.stdoutSha256 ===
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" &&
      sourceContext &&
      preparedContext &&
      preparedContext.packet === ORIGINAL_PACKET &&
      preparedContext.strictOutputSchema === ORIGINAL_SCHEMA &&
      originalPacket.writableDomains.join(",") === "routes,sections" &&
      !(await exists(MERGED_PLAN)) &&
      !(await exists(COHORT_ANALYSIS)),
    "preserved Debate 177 planner timeout boundary drifted"
  );
  assertV4(
    standingAuthorization.record.recoveryControls.boundedFirstRecoveryAuthorized ===
      true &&
      standingAuthorization.record.recoveryControls.fieldDisjointShardingPermitted ===
        true &&
      standingAuthorization.record.recoveryControls.minimumShardCountRequired ===
        true &&
      standingAuthorization.record.recoveryControls.failedPartialOutputReusable ===
        false &&
      standingAuthorization.record.recoveryControls
        .eachOriginalFieldAcceptedExactlyOnce === true &&
      standingAuthorization.record.stopRules.thirdFailureOfSameUnderlyingProblemBlocks ===
        true,
    "Batch 10 first-recovery authority drifted"
  );
  for (const input of originalPacket.copiedInputs) {
    const bytes = await readFile(input.path);
    assertV4(
      sha256(bytes) === input.sha256 && bytes.length === input.bytes,
      `${input.role}: original copied input drifted`
    );
  }

  const rule = mergeRule();
  const mergeRuleCanonicalSha256 = sha256(canonicalJson(rule));
  const generated = new Map();
  const schemas = {};
  for (const field of SHARDS) {
    const schemaPath = `${RECOVERY}/schemas/debate-177-${field}.schema.json`;
    const bytes = jsonBytes(shardSchema(originalSchema, field));
    schemas[field] = { path: schemaPath, bytes };
    generated.set(schemaPath, bytes);
  }
  const packets = {};
  for (const field of SHARDS) {
    const packetPath = `${RECOVERY}/packets/debate-177-${field}.json`;
    const output = `${RECOVERY}/outputs/debate-177-${field}.json`;
    const copiedInputs = originalPacket.copiedInputs.map((input) =>
      input.role === "strict-output-schema"
        ? {
            role: input.role,
            path: schemas[field].path,
            sha256: sha256(schemas[field].bytes),
            bytes: schemas[field].bytes.length,
          }
        : structuredClone(input)
    );
    const packet = {
      schemaVersion:
        "1.0-assessment-production-post-canary-batch-10-debate-177-inventory-plan-recovery-shard-packet",
      protocolId: PROTOCOL_ID,
      recoveryId: "debate-177-plan-recovery-1",
      stage: `candidate-census-plan-${field}-shard`,
      debateNumber: DEBATE_NUMBER,
      debateId: sourceContext.debateId,
      model: structuredClone(originalPreparation.model),
      isolation: {
        freshContextRequired: true,
        oneDebateOnly: true,
        scoreBlind: true,
        otherShardOutputUnavailable: true,
        originalFailedPartialOutputUnavailable: true,
        originalExecutionMetadataUnavailable: true,
        otherDebatesUnavailable: true,
        legacyAssessmentsScoresWinnersTagsAndPublicationProseUnavailable: true,
      },
      copiedInputs,
      copiedInputBytes: copiedInputs.reduce((sum, input) => sum + input.bytes, 0),
      writableDomains: [field],
      acceptedFieldOverlap: [],
      mergeRuleCanonicalSha256,
      strictOutputSchema: schemas[field].path,
      output,
      attemptsMaximum: 1,
      retries: 0,
      timeoutMs: 600000,
      timeoutExtensions: 0,
      modelExecutionAuthorized: false,
    };
    const bytes = jsonBytes(packet);
    generated.set(packetPath, bytes);
    packets[field] = { path: packetPath, bytes, packet };
  }

  const diagnosis = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-10-debate-177-inventory-plan-timeout-diagnosis",
    protocolId: PROTOCOL_ID,
    status:
      "preserved-debate-177-candidate-census-plan-timeout-diagnosed-no-output-accepted",
    frozenAt,
    checkpointCommit,
    branch: "main",
    debateNumber: DEBATE_NUMBER,
    debateId: sourceContext.debateId,
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
      contextIndex: failedResult.contextIndex,
      attemptCount: failedResult.attemptCount,
      timeoutMsApplied: failedResult.timeoutMsApplied,
      elapsedMs: failedResult.elapsedMs,
      status: failedResult.status,
      timedOut: failedResult.timedOut,
      terminationSignal: failedResult.terminationSignal,
      commandExitCode: failedResult.commandExitCode,
      stdoutSha256: failedResult.stdoutSha256,
      stderrSha256: failedResult.stderrSha256,
      resultFileProduced: false,
      outputWritten: false,
      accepted: false,
    },
    deterministicDiagnosis: {
      category: "model-context-timeout-without-result",
      transportStarted: true,
      responseSchemaRejected: false,
      deterministicValidatorReached: false,
      partialOutputAvailableForAcceptance: false,
      retryPermitted: false,
      timeoutExtensionPermitted: false,
      minimumFieldDisjointShardCount: 2,
      shardFields: SHARDS,
      rationale:
        "The original schema has exactly two model-writable top-level domains, routes and sections. Two shards are therefore the minimum field-disjoint partition that assigns each original writable field exactly once.",
    },
    preservedAcceptedCohort: {
      acceptedPlans: 9,
      acceptedPlanFiles: originalExecution.results
        .filter((result) => result.accepted)
        .map((result) => originalPreparation.contexts[result.contextIndex].output),
      acceptedPlansMustRemainByteIdentical: true,
    },
    costs: {
      directIncrementalCostUsd: 0,
      meteredApiCostUsd: 0,
      paidServiceCalls: 0,
    },
    nextAuthorizedAction:
      "freeze-two-minimum-field-disjoint-debate-177-replacement-contexts",
  };
  const diagnosisBytes = jsonBytes(diagnosis);
  generated.set(DIAGNOSIS, diagnosisBytes);

  const correction = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-10-debate-177-inventory-plan-recovery-correction-plan",
    protocolId: PROTOCOL_ID,
    status:
      "two-minimum-field-disjoint-debate-177-inventory-plan-recovery-contexts-frozen-not-activated",
    frozenAt,
    checkpointCommit,
    branch: "main",
    diagnosis: DIAGNOSIS,
    diagnosisSha256: sha256(diagnosisBytes),
    standingAuthorization: POST_CANARY_BATCH_10_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    recoveryAttempt: 1,
    recoveryAttemptsMaximum: 2,
    originalContextRetry: false,
    originalTimeoutExtended: false,
    originalFailedPartialOutputReusable: false,
    minimumShardCount: 2,
    shards: SHARDS.map((field, index) => ({
      contextIndex: index,
      shardId: field,
      writableFields: [field],
      packet: packets[field].path,
      packetSha256: sha256(packets[field].bytes),
      schema: schemas[field].path,
      schemaSha256: sha256(schemas[field].bytes),
      output: packets[field].packet.output,
      attemptsMaximum: 1,
      retries: 0,
      timeoutMs: 600000,
      timeoutExtensions: 0,
    })),
    scheduler: {
      frozenInventoryRamp: [1, 2],
      operationalCanaryShard: "routes",
      remainingShardAfterCanary: "sections",
      maximumParallelContexts: 2,
      effectiveMaximumParallelContexts: 1,
      phaseMustPassBeforeExpansion: true,
    },
    mergeRule: rule,
    mergeRuleCanonicalSha256,
    validation: {
      eachShardMustMatchItsStrictSchema: true,
      completeMergedPlanMustPassRepositoryValidator: true,
      completeTenPlanCohortReplayRequired: true,
      nineAcceptedPlansMustRemainByteIdentical: true,
    },
    stopRules: {
      thirdFailureOfSameUnderlyingProblemBlocks: true,
      failedSecondBoundedCorrectionBlocks: true,
      moreThanTwoRecoveryLevelsBlocks: true,
      retryBlocks: true,
      timeoutExtensionBlocks: true,
      failedPartialOutputReuseBlocks: true,
      protectedAcceptedPlanHashDriftBlocks: true,
      unexpectedValidationCategoryBlocks: true,
      paidServiceBlocks: true,
    },
    costBoundary: {
      authentication: "ChatGPT subscription",
      directIncrementalCostUsdMaximum: 0,
      meteredApiCostUsdMaximum: 0,
      paidServiceCallsMaximum: 0,
    },
  };
  const correctionBytes = jsonBytes(correction);
  generated.set(CORRECTION, correctionBytes);

  const protectedPlanHashes = {};
  for (const context of originalPreparation.contexts) {
    if (context.debateNumber === DEBATE_NUMBER) continue;
    protectedPlanHashes[context.output] = sha256(await readFile(context.output));
  }
  const sourceFiles = [
    SOURCE_PREPARATION,
    ORIGINAL_PREPARATION,
    ORIGINAL_ACTIVATION,
    ORIGINAL_EXECUTION,
    ORIGINAL_PACKET,
    ORIGINAL_SCHEMA,
    VALIDATOR,
    STANDING_LIBRARY,
    POST_CANARY_BATCH_10_STANDING_AUTHORIZATION,
    PREPARER,
    RUNNER,
    ...originalPacket.copiedInputs
      .filter((input) => input.role !== "strict-output-schema")
      .map((input) => input.path),
    sourceContext.fullCandidateTransport,
    sourceContext.compilerSchema,
    ...Object.keys(protectedPlanHashes),
    DIAGNOSIS,
    CORRECTION,
    ...SHARDS.flatMap((field) => [schemas[field].path, packets[field].path]),
  ];
  const sourceHashes = {};
  for (const file of [...new Set(sourceFiles)].sort()) {
    const bytes = generated.get(file) ?? (await readFile(file));
    sourceHashes[file] = sha256(bytes);
  }
  const preparation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-10-debate-177-inventory-plan-recovery-execution-preparation-manifest",
    protocolId: PROTOCOL_ID,
    status:
      "two-frozen-debate-177-inventory-plan-recovery-shards-prepared-not-activated",
    frozenAt,
    checkpointCommit,
    branch: "main",
    debateNumber: DEBATE_NUMBER,
    debateId: sourceContext.debateId,
    standingAuthorization: POST_CANARY_BATCH_10_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    diagnosis: DIAGNOSIS,
    diagnosisSha256: sha256(diagnosisBytes),
    correctionPlan: CORRECTION,
    correctionPlanSha256: sha256(correctionBytes),
    model: structuredClone(originalPreparation.model),
    executionPolicy: {
      contexts: 2,
      exactContextOrder: SHARDS,
      schedulerRamp: [1, 2],
      maximumParallelContexts: 2,
      effectiveMaximumParallelContexts: 1,
      attemptsPerContext: 1,
      retriesMaximum: 0,
      timeoutMsPerContext: 600000,
      timeoutExtensionsMaximum: 0,
      absoluteStageTimeoutMs: 1500000,
      phaseMustPassBeforeExpansion: true,
      APIKeysRemoved: true,
      removedEnvironmentVariables:
        originalPreparation.executionPolicy.removedEnvironmentVariables,
      separateActivationRequired: true,
      abortBeforeStartingAdditionalContextOnAnyFailure: true,
    },
    contexts: SHARDS.map((field, contextIndex) => ({
      contextIndex,
      shardId: field,
      packet: packets[field].path,
      packetSha256: sha256(packets[field].bytes),
      packetBytes: packets[field].bytes.length,
      schema: schemas[field].path,
      schemaSha256: sha256(schemas[field].bytes),
      schemaBytes: schemas[field].bytes.length,
      copiedInputs: packets[field].packet.copiedInputs,
      copiedInputBytes: packets[field].packet.copiedInputBytes,
      writableFields: [field],
      output: packets[field].packet.output,
    })),
    mergeRule: rule,
    mergeRuleCanonicalSha256,
    mergedOutput: MERGED_PLAN,
    cohortAnalysisOutput: COHORT_ANALYSIS,
    protectedPlanHashes,
    sourceHashes,
    futureOutputPathsExcludedFromSourceHashes: [
      ACTIVATION,
      EXECUTION,
      RECOVERY_ANALYSIS,
      ...SHARDS.map((field) => packets[field].packet.output),
      MERGED_PLAN,
      COHORT_ANALYSIS,
    ],
    acceptancePolicy: {
      bothShardsMustPassOnFirstAttempt: true,
      eachShardWritesExactlyOneDisjointField: true,
      failedOriginalOutputUnavailable: true,
      mergeIsDeterministic: true,
      mergedPlanMustPassRepositoryValidator: true,
      completeTenPlanCohortReplayRequired: true,
      nineAcceptedPlansMustRemainByteIdentical: true,
    },
    authorization: {
      modelExecution: false,
      deterministicMerge: false,
      cohortReplay: false,
      sidePacketPreparation: false,
      retries: false,
      timeoutExtensions: false,
      recursiveCorrection: false,
      paidServices: false,
      scoreDerivation: false,
      productionMutation: false,
    },
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    nextRequiredAction:
      "separately-activate-two-frozen-debate-177-inventory-plan-recovery-shards",
  };
  generated.set(PREPARATION, jsonBytes(preparation));
  return { generated, preparation };
}

async function freeze() {
  const shouldWrite = process.argv.includes("--write");
  const frozenIndex = process.argv.indexOf("--frozen-at");
  const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
  assertV4(
    frozenAt && !Number.isNaN(Date.parse(frozenAt)),
    "--frozen-at requires an ISO timestamp"
  );
  const checkpointCommit = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  const { generated, preparation } = await buildArtifacts({
    frozenAt,
    checkpointCommit,
  });
  if (shouldWrite) {
    for (const [file, bytes] of generated) {
      assertV4(!(await exists(file)), `${file} already exists`);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes);
    }
  }
  console.log(
    JSON.stringify(
      {
        status: shouldWrite ? preparation.status : "preview",
        debateNumber: DEBATE_NUMBER,
        diagnosis: "model-context-timeout-without-result",
        shards: SHARDS,
        minimumFieldDisjointShardCount: 2,
        protectedAcceptedPlans: 9,
        model: preparation.model,
        attemptsPerContext: 1,
        retriesMaximum: 0,
        timeoutExtensionsMaximum: 0,
        directIncrementalCostUsdMaximum: 0,
      },
      null,
      2
    )
  );
}

async function validate() {
  const preparation = JSON.parse(await readFile(PREPARATION, "utf8"));
  const { generated } = await buildArtifacts({
    frozenAt: preparation.frozenAt,
    checkpointCommit: preparation.checkpointCommit,
  });
  for (const [file, expected] of generated) {
    assertV4(
      sha256(await readFile(file)) === sha256(expected),
      `${file}: frozen recovery artifact drifted`
    );
  }
  assertV4(
    preparation.status ===
      "two-frozen-debate-177-inventory-plan-recovery-shards-prepared-not-activated" &&
      preparation.contexts.length === 2 &&
      preparation.contexts.map((context) => context.shardId).join(",") ===
        "routes,sections" &&
      preparation.contexts.every(
        (context) =>
          context.writableFields.length === 1 &&
          context.writableFields[0] === context.shardId
      ) &&
      preparation.model.label === "5.6 Sol" &&
      preparation.model.slug === "gpt-5.6-sol" &&
      preparation.model.reasoningEffort === "low" &&
      preparation.model.authentication === "ChatGPT subscription" &&
      preparation.model.scoreBlind === true &&
      preparation.executionPolicy.attemptsPerContext === 1 &&
      preparation.executionPolicy.retriesMaximum === 0 &&
      preparation.executionPolicy.timeoutExtensionsMaximum === 0 &&
      preparation.executionPolicy.timeoutMsPerContext === 600000 &&
      preparation.authorization.modelExecution === false &&
      preparation.directIncrementalCostUsdMaximum === 0 &&
      preparation.meteredApiCostUsdMaximum === 0 &&
      allBooleanLeavesTrue(preparation.acceptancePolicy),
    "frozen Debate 177 recovery preparation controls drifted"
  );
  for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
    assertV4(!(await exists(future)), `unexpected future output exists: ${future}`);
  }
  console.log(
    JSON.stringify(
      {
        status: "passed-frozen-debate-177-inventory-plan-recovery-preparation",
        contexts: 2,
        shards: SHARDS,
        protectedAcceptedPlans: 9,
        modelContextsExecuted: 0,
        paidServiceCalls: 0,
        directIncrementalCostUsd: 0,
      },
      null,
      2
    )
  );
}

const command = process.argv[2];
if (command === "freeze") await freeze();
else if (command === "validate") await validate();
else throw new Error("usage: ... freeze|validate");
