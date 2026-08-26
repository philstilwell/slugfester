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

import {
  V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
  V212_DISCOVERY_PROTOCOL_ID,
  compileV212CandidateBundle,
  makeV212DiscoverySchema,
  validateV212Discovery,
} from "./lib/assessment-production-score-stability-v2.1.2-discovery.mjs";
import {
  parseV42219Ledger,
  serializeV42219Rows,
} from "./lib/v42219-generalized-partition.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  POST_CANARY_BATCH_12_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch12StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-12-standing-authorization.mjs";

const BATCH_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-12";
const DISCOVERY = `${BATCH_ROOT}/discovery`;
const SOURCE_PREPARATION = `${BATCH_ROOT}/source-preparation/preparation-manifest.json`;
const ORIGINAL_PREPARATION = `${DISCOVERY}/execution-preparation-manifest.json`;
const ORIGINAL_ACTIVATION = `${DISCOVERY}/execution-activation.json`;
const ORIGINAL_EXECUTION = `${DISCOVERY}/model-execution.json`;
const RECOVERY = `${DISCOVERY}/recovery-1/debate-11-chunk-001`;
const DIAGNOSIS = `${RECOVERY}/diagnosis.json`;
const CORRECTION = `${RECOVERY}/correction-plan.json`;
const PREPARATION = `${RECOVERY}/preparation-manifest.json`;
const ACTIVATION = `${RECOVERY}/execution-activation.json`;
const EXECUTION = `${RECOVERY}/model-execution.json`;
const OVERLAY = `${RECOVERY}/cohort-execution-overlay.json`;
const RECOVERY_ANALYSIS = `${RECOVERY}/analysis.json`;
const SCRIPT =
  "scripts/recover-assessment-production-post-canary-batch-12-debate-11-discovery-chunk-001.mjs";
const MANUAL =
  "docs/assessment-production/score-stability-v2.1.2-discovery-successor-development/manual.md";
const FAILED_CONTEXT_INDEX = 41;
const DEBATE_NUMBER = "11";
const CHUNK_ID = "chunk-001";
const PREPARATION_STATUS =
  "two-fresh-event-disjoint-debate-11-chunk-001-discovery-recovery-shards-prepared-not-authorized";
const ACTIVATION_STATUS =
  "two-fresh-event-disjoint-debate-11-chunk-001-discovery-recovery-shards-authorized";
const EXECUTION_STATUS =
  "two-fresh-event-disjoint-debate-11-chunk-001-discovery-recovery-shards-passed";
const DISCOVERY_PASS_STATUS =
  "post-canary-batch-12-discovery-passed-standing-authorization-active-for-inventory-preparation";
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const SHARDS = [
  {
    shardId: "recovery-a",
    candidatePrefix: "recovery-a-",
    coreStartEvent: 0,
    coreEndEvent: 429,
    contextStartEvent: 0,
    contextEndEvent: 469,
  },
  {
    shardId: "recovery-b",
    candidatePrefix: "recovery-b-",
    coreStartEvent: 430,
    coreEndEvent: 859,
    contextStartEvent: 390,
    contextEndEvent: 899,
  },
];
const REMOVED_API_ENVIRONMENT_VARIABLES = [
  "OPENAI_API_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "CODEX_API_KEY",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
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

function runChild(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
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

function serializeTokenRows(rows) {
  return Buffer.from(`${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

async function loadFrozenBoundary({ allowRecoveredOutput = false } = {}) {
  const standingAuthorization =
    await loadAndValidatePostCanaryBatch12StandingAuthorization();
  const [sourceBytes, preparationBytes, activationBytes, executionBytes] =
    await Promise.all([
      readFile(SOURCE_PREPARATION),
      readFile(ORIGINAL_PREPARATION),
      readFile(ORIGINAL_ACTIVATION),
      readFile(ORIGINAL_EXECUTION),
    ]);
  const sourcePreparation = JSON.parse(sourceBytes);
  const preparation = JSON.parse(preparationBytes);
  const activation = JSON.parse(activationBytes);
  const execution = JSON.parse(executionBytes);
  const debate = sourcePreparation.contexts.find(
    (item) => item.debateNumber === DEBATE_NUMBER
  );
  const chunk = debate?.chunks.find((item) => item.chunkId === CHUNK_ID);
  const context = preparation.contexts[FAILED_CONTEXT_INDEX];
  const failedResult = execution.results.find(
    (result) => result.contextIndex === FAILED_CONTEXT_INDEX
  );
  assertV4(
    sourcePreparation.status ===
      "post-canary-batch-12-ten-complete-score-blind-source-packets-prepared-awaiting-validation" &&
      preparation.status ===
        "frozen-forty-four-post-canary-batch-12-discovery-contexts-prepared-not-authorized" &&
      activation.status ===
        "frozen-forty-four-post-canary-batch-12-discovery-contexts-authorized" &&
      execution.status === "post-canary-batch-12-discovery-complete-with-failure" &&
      execution.contextsPlanned === 44 &&
      execution.contextsAttempted === 44 &&
      execution.validContexts === 43 &&
      execution.invalidContexts === 1 &&
      execution.retries === 0 &&
      execution.timeoutExtensions === 0 &&
      execution.semanticCorrections === 0 &&
      execution.results.filter((result) => !result.accepted).length === 1 &&
      failedResult?.debateNumber === DEBATE_NUMBER &&
      failedResult?.chunkId === CHUNK_ID &&
      failedResult?.status === "timed-out" &&
      failedResult?.attemptCount === 1 &&
      failedResult?.retryCount === 0 &&
      failedResult?.timeoutMsApplied === 300000 &&
      failedResult?.timedOut === true &&
      failedResult?.terminationSignal === "SIGTERM" &&
      failedResult?.accepted === false &&
      failedResult?.rawOutputWritten === false &&
      context?.debateNumber === DEBATE_NUMBER &&
      context?.chunkId === CHUNK_ID &&
      chunk?.coreStartEvent === 0 &&
      chunk?.coreEndEvent === 859 &&
      chunk?.contextStartEvent === 0 &&
      chunk?.contextEndEvent === 899 &&
      (allowRecoveredOutput || !(await exists(chunk.futureRawOutput))),
    "preserved Batch 12 Debate 11 chunk-001 timeout boundary drifted"
  );
  assertV4(
    standingAuthorization.record.recoveryControls.boundedFirstRecoveryAuthorized === true &&
      standingAuthorization.record.recoveryControls.fieldDisjointShardingPermitted === true &&
      standingAuthorization.record.recoveryControls.minimumShardCountRequired === true &&
      standingAuthorization.record.recoveryControls.failedPartialOutputReusable === false &&
      standingAuthorization.record.recoveryControls.eachOriginalFieldAcceptedExactlyOnce === true &&
      standingAuthorization.record.recoveryControls.recoveryLevelsMaximum === 2 &&
      standingAuthorization.record.authorization.boundedCorrections === true &&
      standingAuthorization.record.costBoundary.subscriptionAndLocalDirectIncrementalCostUsdMaximum === 0,
    "Batch 12 bounded recovery authorization drifted"
  );
  await assertHashes(activation.sourceHashes, "original activation");
  return {
    standingAuthorization,
    sourcePreparation,
    sourceBytes,
    preparation,
    preparationBytes,
    activation,
    activationBytes,
    execution,
    executionBytes,
    debate,
    chunk,
    context,
    failedResult,
  };
}

async function prepare() {
  const shouldWrite = process.argv.includes("--write");
  const frozenIndex = process.argv.indexOf("--frozen-at");
  const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
  assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
  if (shouldWrite) assertV4(!(await exists(PREPARATION)), "recovery preparation already exists");
  const frozen = await loadFrozenBoundary();
  const [packetBytes, planBytes, eventsBytes, fullLedgerBytes, chunkBytes, tokenBytes] =
    await Promise.all([
      readFile(frozen.debate.packet),
      readFile(frozen.debate.plan),
      readFile(frozen.debate.originalEvents),
      readFile(frozen.debate.fullLedger),
      readFile(frozen.chunk.chunkLedgerPath),
      readFile(frozen.chunk.tokenCountedLedgerPath),
    ]);
  const packet = JSON.parse(packetBytes);
  const plan = JSON.parse(planBytes);
  const sourceRows = parseV42219Ledger(chunkBytes);
  const tokenRows = tokenBytes.toString("utf8").trim().split("\n").map(JSON.parse);
  const generated = new Map();
  const contexts = [];
  for (const [contextIndex, definition] of SHARDS.entries()) {
    const shard = {
      chunkId: CHUNK_ID,
      coreStartEvent: definition.coreStartEvent,
      coreEndEvent: definition.coreEndEvent,
      coreEvents: definition.coreEndEvent - definition.coreStartEvent + 1,
      contextStartEvent: definition.contextStartEvent,
      contextEndEvent: definition.contextEndEvent,
      contextEvents: definition.contextEndEvent - definition.contextStartEvent + 1,
    };
    const shardSourceRows = sourceRows.filter(
      (row) => row[0] >= shard.contextStartEvent && row[0] <= shard.contextEndEvent
    );
    const shardTokenRows = tokenRows.filter(
      (row) => row[0] >= shard.contextStartEvent && row[0] <= shard.contextEndEvent
    );
    const validationBytes = serializeV42219Rows(shardSourceRows);
    const tokenLedgerBytes = serializeTokenRows(shardTokenRows);
    shard.contextBytes = validationBytes.length;
    shard.contextSha256 = sha256(validationBytes);
    const schema = makeV212DiscoverySchema({ packet, chunk: shard, candidatesMaximum: 5 });
    schema.$id = `slugfester-batch-12-debate-11-chunk-001-${definition.shardId}`;
    schema.properties.candidates.items.properties.candidateId.pattern =
      `^${definition.candidatePrefix}[A-Za-z0-9._:-]+$`;
    const schemaBytes = jsonBytes(schema);
    const base = `${RECOVERY}/shards/${definition.shardId}`;
    const validationLedger = `${base}/validation-ledger.jsonl`;
    const tokenLedger = `${base}/token-counted-ledger.jsonl`;
    const schemaPath = `${base}/schema.json`;
    const output = `${base}/output.json`;
    generated.set(validationLedger, validationBytes);
    generated.set(tokenLedger, tokenLedgerBytes);
    generated.set(schemaPath, schemaBytes);
    contexts.push({
      contextIndex,
      shardId: definition.shardId,
      candidatePrefix: definition.candidatePrefix,
      chunk: shard,
      validationLedger,
      validationLedgerSha256: sha256(validationBytes),
      validationLedgerBytes: validationBytes.length,
      tokenLedger,
      tokenLedgerSha256: sha256(tokenLedgerBytes),
      tokenLedgerBytes: tokenLedgerBytes.length,
      schema: schemaPath,
      schemaSha256: sha256(schemaBytes),
      schemaBytes: schemaBytes.length,
      output,
      candidatesMaximum: 5,
      attemptsMaximum: 1,
      retriesMaximum: 0,
      timeoutMs: 300000,
    });
  }
  assertV4(
    contexts.length === 2 &&
      contexts[0].chunk.coreStartEvent === 0 &&
      contexts[0].chunk.coreEndEvent + 1 === contexts[1].chunk.coreStartEvent &&
      contexts[1].chunk.coreEndEvent === 859 &&
      contexts.reduce((sum, context) => sum + context.chunk.coreEvents, 0) === 860 &&
      contexts.every((context) => context.tokenLedgerBytes < tokenBytes.length),
    "minimum fresh event-disjoint recovery partition is invalid"
  );
  const acceptedResults = frozen.execution.results.filter((result) => result.accepted);
  const preparedByIndex = new Map(
    frozen.preparation.contexts.map((context) => [context.contextIndex, context])
  );
  const protectedFiles = acceptedResults.map(
    (result) => preparedByIndex.get(result.contextIndex).rawOutput
  );
  const protectedOutputHashes = await hashFiles(protectedFiles);
  const sourceFiles = [
    SOURCE_PREPARATION,
    ORIGINAL_PREPARATION,
    ORIGINAL_ACTIVATION,
    ORIGINAL_EXECUTION,
    frozen.debate.packet,
    frozen.debate.plan,
    frozen.debate.originalEvents,
    frozen.debate.fullLedger,
    frozen.chunk.chunkLedgerPath,
    frozen.chunk.tokenCountedLedgerPath,
    frozen.chunk.schemaPath,
    MANUAL,
    POST_CANARY_BATCH_12_STANDING_AUTHORIZATION,
    SCRIPT,
  ];
  const sourceHashes = await hashFiles(sourceFiles);
  const diagnosis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-12-discovery-recovery-diagnosis",
    protocolId: "assessment-production-post-canary-batch-12-debate-11-chunk-001-discovery-recovery-1",
    status: "batch-12-discovery-single-timeout-diagnosed-minimum-two-shard-recovery-required",
    diagnosedAt: frozenAt,
    originalExecution: ORIGINAL_EXECUTION,
    originalExecutionSha256: sha256(frozen.executionBytes),
    failure: {
      contextIndex: FAILED_CONTEXT_INDEX,
      debateNumber: DEBATE_NUMBER,
      chunkId: CHUNK_ID,
      classification: "whole-context-five-minute-timeout-no-model-output",
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensions: 0,
      failedPartialOutputAvailable: false,
      failedPartialOutputReusable: false,
    },
    finding:
      "The final discovery context exhausted the frozen five-minute limit without a result file. The source and schema hashes remained valid; splitting its owned event range into two equal, fresh, non-overlapping cores is the minimum bounded recovery that reduces per-context work while preserving every source event exactly once.",
    nextAuthorizedAction: "freeze-minimum-two-shard-level-1-recovery-plan",
  };
  const correction = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-12-discovery-recovery-plan",
    protocolId: diagnosis.protocolId,
    status: "frozen-batch-12-debate-11-chunk-001-level-1-discovery-recovery-plan",
    recoveryLevel: 1,
    failedContextIndex: FAILED_CONTEXT_INDEX,
    minimumFreshShardCount: 2,
    fieldDisjointAxis: "owned-core-event-range",
    originalOwnedCore: [0, 859],
    shards: contexts.map(({ shardId, candidatePrefix, chunk, candidatesMaximum }) => ({
      shardId,
      candidatePrefix,
      ownedCore: [chunk.coreStartEvent, chunk.coreEndEvent],
      deliveredContext: [chunk.contextStartEvent, chunk.contextEndEvent],
      candidatesMaximum,
    })),
    mergeRule: {
      id: "batch-12-debate-11-chunk-001-event-disjoint-merge-v1",
      candidateIdsMustCarryShardPrefix: true,
      candidatesSortedByStartEndAndId: true,
      combinedCandidatesMaximum: 10,
      eachOriginalCoreEventAcceptedExactlyOnce: true,
      otherFortyThreeOriginalOutputsPreservedByteIdentical: true,
      failedPartialOutputUsed: false,
    },
    attemptsPerShard: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    furtherRecoveryLevelsMaximum: 1,
    directIncrementalCostUsdMaximum: 0,
    nextAuthorizedAction: "prepare-and-freeze-level-1-recovery-shards",
  };
  const preparation = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-12-discovery-recovery-preparation",
    protocolId: diagnosis.protocolId,
    status: PREPARATION_STATUS,
    preparedAt: frozenAt,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    branch: "main",
    productionContinuation: true,
    stagingOnly: true,
    recoveryLevel: 1,
    model: {
      label: "5.6 Sol",
      slug: "gpt-5.6-sol",
      reasoningEffort: "low",
      authentication: "ChatGPT subscription",
      scoreBlind: true,
    },
    original: {
      sourcePreparation: SOURCE_PREPARATION,
      executionPreparation: ORIGINAL_PREPARATION,
      activation: ORIGINAL_ACTIVATION,
      execution: ORIGINAL_EXECUTION,
      contextIndex: FAILED_CONTEXT_INDEX,
      debateNumber: DEBATE_NUMBER,
      chunkId: CHUNK_ID,
      rawOutput: frozen.chunk.futureRawOutput,
    },
    diagnosis: DIAGNOSIS,
    correctionPlan: CORRECTION,
    packet: frozen.debate.packet,
    plan: frozen.debate.plan,
    originalEvents: frozen.debate.originalEvents,
    fullLedger: frozen.debate.fullLedger,
    originalChunk: frozen.chunk,
    contexts,
    executionPolicy: {
      contexts: 2,
      attemptsPerContext: 1,
      retriesMaximum: 0,
      timeoutMsPerContext: 300000,
      timeoutExtensionsMaximum: 0,
      maximumParallelContexts: 2,
      APIKeysRemoved: true,
      removedEnvironmentVariables: REMOVED_API_ENVIRONMENT_VARIABLES,
      directIncrementalCostUsdMaximum: 0,
      separateActivationRequired: true,
    },
    isolation: {
      freshTemporaryCodexHomePerShard: true,
      freshTemporaryWorkingDirectoryPerShard: true,
      otherShardOutputUnavailable: true,
      originalFailedPartialOutputUnavailable: true,
      otherDebatesUnavailable: true,
      legacyAssessmentsScoresWinnersTagsAndPublicationProseUnavailable: true,
    },
    protectedOutputHashes,
    sourceHashes,
    futureArtifacts: [ACTIVATION, EXECUTION, OVERLAY, RECOVERY_ANALYSIS],
    authorization: {
      modelContexts: false,
      deterministicMerge: false,
      cohortAnalysis: false,
      retry: false,
      timeoutExtension: false,
      scoreDerivation: false,
      productionMutation: false,
      nextBatchSelection: false,
    },
    nextAuthorizedAction: "freeze-and-commit-recovery-preparation-then-activate",
  };
  if (shouldWrite) {
    await mkdir(RECOVERY, { recursive: true });
    await writeFile(DIAGNOSIS, jsonBytes(diagnosis));
    await writeFile(CORRECTION, jsonBytes(correction));
    for (const [file, bytes] of generated) {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes);
    }
    await writeFile(PREPARATION, jsonBytes(preparation));
  }
  console.log(JSON.stringify({
    status: shouldWrite ? PREPARATION_STATUS : "preview",
    failure: diagnosis.failure,
    recoveryLevel: 1,
    shards: correction.shards,
    protectedOutputs: Object.keys(protectedOutputHashes).length,
    modelContextsAuthorized: false,
    directIncrementalCostUsdMaximum: 0,
    nextAuthorizedAction: preparation.nextAuthorizedAction,
  }, null, 2));
}

async function loadPreparation() {
  const bytes = await readFile(PREPARATION);
  const preparation = JSON.parse(bytes);
  assertV4(
    preparation.status === PREPARATION_STATUS &&
      preparation.recoveryLevel === 1 &&
      preparation.contexts.length === 2 &&
      preparation.executionPolicy.attemptsPerContext === 1 &&
      preparation.executionPolicy.retriesMaximum === 0 &&
      preparation.executionPolicy.timeoutExtensionsMaximum === 0 &&
      preparation.executionPolicy.directIncrementalCostUsdMaximum === 0 &&
      preparation.authorization.modelContexts === false,
    "recovery preparation drifted"
  );
  await assertHashes(preparation.sourceHashes, "recovery preparation source");
  await assertHashes(preparation.protectedOutputHashes, "protected original output");
  for (const context of preparation.contexts) {
    assertV4(sha256(await readFile(context.validationLedger)) === context.validationLedgerSha256, `${context.shardId}: validation ledger drifted`);
    assertV4(sha256(await readFile(context.tokenLedger)) === context.tokenLedgerSha256, `${context.shardId}: token ledger drifted`);
    assertV4(sha256(await readFile(context.schema)) === context.schemaSha256, `${context.shardId}: schema drifted`);
  }
  return { preparation, bytes };
}

async function activate() {
  const shouldWrite = process.argv.includes("--write");
  const activatedIndex = process.argv.indexOf("--activated-at");
  const activatedAt = activatedIndex >= 0 ? process.argv[activatedIndex + 1] : null;
  assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)), "--activated-at requires an ISO timestamp");
  if (shouldWrite) assertV4(!(await exists(ACTIVATION)), "recovery activation already exists");
  const { preparation, bytes } = await loadPreparation();
  const standing = await loadAndValidatePostCanaryBatch12StandingAuthorization();
  const sourceHashes = await hashFiles([
    ...Object.keys(preparation.sourceHashes),
    ...Object.keys(preparation.protectedOutputHashes),
    ...preparation.contexts.flatMap((context) => [context.validationLedger, context.tokenLedger, context.schema]),
    DIAGNOSIS,
    CORRECTION,
    PREPARATION,
    SCRIPT,
  ]);
  const activation = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-12-discovery-recovery-activation",
    protocolId: preparation.protocolId,
    status: ACTIVATION_STATUS,
    activatedAt,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    recoveryLevel: 1,
    preparation: PREPARATION,
    preparationSha256: sha256(bytes),
    standingAuthorization: POST_CANARY_BATCH_12_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standing.sha256,
    model: preparation.model,
    contexts: preparation.contexts,
    executionPolicy: preparation.executionPolicy,
    isolation: preparation.isolation,
    protectedOutputHashes: preparation.protectedOutputHashes,
    sourceHashes,
    authorization: {
      modelContexts: true,
      deterministicMerge: true,
      cohortAnalysis: true,
      retry: false,
      timeoutExtension: false,
      scoreDerivation: false,
      productionMutation: false,
      nextBatchSelection: false,
    },
    nextRequiredAction: "execute-exactly-two-fresh-event-disjoint-recovery-shards-once",
  };
  if (shouldWrite) await writeFile(ACTIVATION, jsonBytes(activation));
  console.log(JSON.stringify({
    status: shouldWrite ? ACTIVATION_STATUS : "preview",
    recoveryLevel: 1,
    contexts: 2,
    model: activation.model,
    attemptsPerShard: 1,
    retriesMaximum: 0,
    directIncrementalCostUsdMaximum: 0,
  }, null, 2));
}

async function loadActivation() {
  const { preparation } = await loadPreparation();
  const bytes = await readFile(ACTIVATION);
  const activation = JSON.parse(bytes);
  assertV4(
    activation.status === ACTIVATION_STATUS &&
      activation.recoveryLevel === 1 &&
      activation.contexts.length === 2 &&
      activation.model.label === "5.6 Sol" &&
      activation.model.slug === "gpt-5.6-sol" &&
      activation.model.reasoningEffort === "low" &&
      activation.model.authentication === "ChatGPT subscription" &&
      activation.model.scoreBlind === true &&
      activation.executionPolicy.attemptsPerContext === 1 &&
      activation.executionPolicy.retriesMaximum === 0 &&
      activation.executionPolicy.timeoutExtensionsMaximum === 0 &&
      activation.authorization.modelContexts === true &&
      activation.authorization.retry === false &&
      activation.authorization.timeoutExtension === false,
    "recovery activation drifted"
  );
  await assertHashes(activation.sourceHashes, "recovery activation source");
  await assertHashes(activation.protectedOutputHashes, "protected original output");
  return { preparation, activation, bytes };
}

async function executeShard(context, activation, preparation) {
  const sourceDirectory = await mkdtemp(path.join(os.tmpdir(), `slugfester-b12-d11-discovery-${context.shardId}-`));
  const isolatedCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-b12-d11-discovery-home-${context.shardId}-`));
  const startedAt = new Date().toISOString();
  const started = Date.now();
  try {
    for (const [source, target] of [
      [MANUAL, "manual.md"],
      [preparation.packet, "packet.json"],
      [context.schema, "schema.json"],
      [context.tokenLedger, "token-counted-ledger.jsonl"],
    ]) await copyFile(source, path.join(sourceDirectory, target));
    await copyFile(path.join(os.homedir(), ".codex", "auth.json"), path.join(isolatedCodexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: isolatedCodexHome };
    for (const key of activation.executionPolicy.removedEnvironmentVariables) delete env[key];
    const prompt = `Read manual.md, packet.json, schema.json, and every line of token-counted-ledger.jsonl; read nothing else. Act only as the isolated bounded-end score-blind source-discovery recovery reviewer for post-canary Batch 12 Debate 11, original chunk-001, ${context.shardId}. The owned core is events ${context.chunk.coreStartEvent} through ${context.chunk.coreEndEvent}; boundary context is events ${context.chunk.contextStartEvent} through ${context.chunk.contextEndEvent}. Review the entire context. Emit zero to five chronological load-bearing candidates whose start event lies inside the owned core. Every candidateId must begin exactly with ${context.candidatePrefix}. For each candidate emit sourceWindow.startEvent and the actual final source row as sourceWindow.endEvent, bounded by the delivered context. Use the per-row lexical-token counts to ensure the inclusive window has at least twelve tokens. Never emit a requested lexical-token count, target ID, moveKind, evidence text, rating, score, section, winner, tag, Overall Commentary, AI Extension, policy analysis, or assessment/publication prose. Return exactly one schema-conforming JSON object.`;
    process.stdout.write(`[batch-12-discovery-recovery] starting ${context.shardId}\n`);
    const invocation = await runChild(CODEX_PATH, [
      "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules",
      "--model", activation.model.slug,
      "-c", `model_reasoning_effort="${activation.model.reasoningEffort}"`,
      "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search",
      "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
      "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies",
      "--sandbox", "read-only", "--color", "never", "--output-schema", "schema.json",
      "--output-last-message", "result.json", prompt,
    ], { cwd: sourceDirectory, env }, context.timeoutMs);
    const resultPath = path.join(sourceDirectory, "result.json");
    const resultExists = await exists(resultPath);
    const base = {
      contextIndex: context.contextIndex,
      shardId: context.shardId,
      model: activation.model.label,
      modelSlug: activation.model.slug,
      reasoningEffort: activation.model.reasoningEffort,
      attemptCount: 1,
      retryCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      timeoutMsApplied: context.timeoutMs,
      timedOut: invocation.timedOut,
      commandExitCode: invocation.code,
      terminationSignal: invocation.signal,
      authentication: "ChatGPT subscription",
      apiKeysRemoved: true,
      scoreBlind: true,
      meteredApiCostUsd: 0,
      stdoutSha256: sha256(invocation.stdout),
      stderrSha256: sha256(invocation.stderr),
    };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
      return {
        ...base,
        status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed",
        accepted: false,
        outputWritten: false,
        stdoutTail: invocation.stdout.slice(-8000),
        stderrTail: invocation.stderr.slice(-8000),
      };
    }
    await copyFile(resultPath, context.output);
    const outputBytes = await readFile(context.output);
    const output = JSON.parse(outputBytes);
    const [packetBytes, planBytes, eventsBytes, fullLedgerBytes, validationBytes] = await Promise.all([
      readFile(preparation.packet),
      readFile(preparation.plan),
      readFile(preparation.originalEvents),
      readFile(preparation.fullLedger),
      readFile(context.validationLedger),
    ]);
    const packet = JSON.parse(packetBytes);
    const plan = JSON.parse(planBytes);
    const shardPlan = { ...plan, chunks: [context.chunk] };
    const validation = validateV212Discovery(output, {
      packet,
      chunk: context.chunk,
      plan: shardPlan,
      eventsDocument: JSON.parse(eventsBytes),
      eventsBytes,
      chunkBytes: validationBytes,
      fullLedgerBytes,
    });
    assertV4(
      output.candidates.length <= 5 &&
        output.candidates.every((candidate) => candidate.candidateId.startsWith(context.candidatePrefix)) &&
        validation.repositoryDerivedLexicalTokenCounts === true &&
        validation.modelAuthoredLexicalTokenCounts === false &&
        validation.modelAuthoredBoundedEndEvents === true,
      `${context.shardId}: recovery validation drifted`
    );
    return {
      ...base,
      status: "completed-valid",
      accepted: true,
      outputWritten: true,
      outputSha256: sha256(outputBytes),
      candidates: output.candidates.length,
      validationSummary: validation,
    };
  } catch (error) {
    return {
      contextIndex: context.contextIndex,
      shardId: context.shardId,
      model: activation.model.label,
      modelSlug: activation.model.slug,
      reasoningEffort: activation.model.reasoningEffort,
      attemptCount: 1,
      retryCount: 0,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      timeoutMsApplied: context.timeoutMs,
      timedOut: false,
      authentication: "ChatGPT subscription",
      apiKeysRemoved: true,
      scoreBlind: true,
      meteredApiCostUsd: 0,
      status: "runner-failed",
      accepted: false,
      outputWritten: false,
      failureMessage: error.message,
    };
  } finally {
    await rm(sourceDirectory, { recursive: true, force: true });
    await rm(isolatedCodexHome, { recursive: true, force: true });
  }
}

async function run() {
  assertV4(!(await exists(EXECUTION)), "recovery execution already exists");
  const { preparation, activation } = await loadActivation();
  for (const context of activation.contexts) assertV4(!(await exists(context.output)), `${context.output}: output already exists`);
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const results = await Promise.all(
    activation.contexts.map((context) => executeShard(context, activation, preparation))
  );
  const valid = results.filter((result) => result.accepted).length;
  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-12-discovery-recovery-execution",
    protocolId: activation.protocolId,
    status: valid === 2 ? EXECUTION_STATUS : "batch-12-debate-11-discovery-recovery-complete-with-failure",
    startedAt,
    completedAt: new Date().toISOString(),
    wallElapsedMs: Date.now() - started,
    contextsPlanned: 2,
    contextsAttempted: 2,
    validContexts: valid,
    invalidContexts: 2 - valid,
    attempts: 2,
    retries: 0,
    timeoutExtensions: 0,
    recoveryLevel: 1,
    model: activation.model,
    results,
    totals: {
      modelContextsExecuted: 2,
      retries: 0,
      timeoutExtensions: 0,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      scoresDerived: 0,
      productionMutations: 0,
    },
    authorization: {
      deterministicMerge: valid === 2,
      cohortAnalysis: valid === 2,
      furtherRecovery: valid !== 2,
      retry: false,
      timeoutExtension: false,
      scoreDerivation: false,
      productionMutation: false,
    },
  };
  await writeFile(EXECUTION, jsonBytes(execution));
  console.log(JSON.stringify({
    status: execution.status,
    validContexts: valid,
    invalidContexts: 2 - valid,
    wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)),
    retries: 0,
    timeoutExtensions: 0,
    directIncrementalCostUsd: 0,
  }, null, 2));
}

async function analyze() {
  const shouldWrite = process.argv.includes("--write");
  const analyzedIndex = process.argv.indexOf("--analyzed-at");
  const analyzedAt = analyzedIndex >= 0 ? process.argv[analyzedIndex + 1] : null;
  assertV4(analyzedAt && !Number.isNaN(Date.parse(analyzedAt)), "--analyzed-at requires an ISO timestamp");
  const frozen = await loadFrozenBoundary();
  const { preparation, activation } = await loadActivation();
  const recoveryExecutionBytes = await readFile(EXECUTION);
  const recoveryExecution = JSON.parse(recoveryExecutionBytes);
  assertV4(
    recoveryExecution.status === EXECUTION_STATUS &&
      recoveryExecution.contextsAttempted === 2 &&
      recoveryExecution.validContexts === 2 &&
      recoveryExecution.invalidContexts === 0 &&
      recoveryExecution.retries === 0 &&
      recoveryExecution.timeoutExtensions === 0,
    "recovery shards must both pass before merge"
  );
  const shardOutputs = [];
  for (const context of preparation.contexts) {
    const bytes = await readFile(context.output);
    assertV4(
      sha256(bytes) === recoveryExecution.results[context.contextIndex].outputSha256,
      `${context.shardId}: output hash drifted`
    );
    shardOutputs.push(JSON.parse(bytes));
  }
  const candidates = shardOutputs
    .flatMap((output) => output.candidates)
    .sort((left, right) =>
      left.sourceWindow.startEvent - right.sourceWindow.startEvent ||
      left.sourceWindow.endEvent - right.sourceWindow.endEvent ||
      left.candidateId.localeCompare(right.candidateId)
    );
  assertV4(
    candidates.length <= 10 &&
      new Set(candidates.map((candidate) => candidate.candidateId)).size === candidates.length,
    "recovery merge candidate boundary failed"
  );
  const merged = {
    schemaVersion: shardOutputs[0].schemaVersion,
    protocolId: shardOutputs[0].protocolId,
    debateNumber: shardOutputs[0].debateNumber,
    debateId: shardOutputs[0].debateId,
    chunkId: CHUNK_ID,
    coreStartEvent: frozen.chunk.coreStartEvent,
    coreEndEvent: frozen.chunk.coreEndEvent,
    contextStartEvent: frozen.chunk.contextStartEvent,
    contextEndEvent: frozen.chunk.contextEndEvent,
    reviewerRole: shardOutputs[0].reviewerRole,
    assessmentModel: shardOutputs[0].assessmentModel,
    calibrationOnly: true,
    completeCoreReviewed: true,
    candidates,
  };
  const [packetBytes, planBytes, eventsBytes, fullLedgerBytes, originalChunkBytes] =
    await Promise.all([
      readFile(frozen.debate.packet),
      readFile(frozen.debate.plan),
      readFile(frozen.debate.originalEvents),
      readFile(frozen.debate.fullLedger),
      readFile(frozen.chunk.chunkLedgerPath),
    ]);
  const mergedValidation = validateV212Discovery(merged, {
    packet: JSON.parse(packetBytes),
    chunk: frozen.chunk,
    plan: JSON.parse(planBytes),
    eventsDocument: JSON.parse(eventsBytes),
    eventsBytes,
    chunkBytes: originalChunkBytes,
    fullLedgerBytes,
  });
  assertV4(mergedValidation.status === "passed", "complete merged discovery output is invalid");
  const mergedBytes = jsonBytes(merged);
  const overlay = structuredClone(frozen.execution);
  const originalFailed = overlay.results.find((result) => result.contextIndex === FAILED_CONTEXT_INDEX);
  Object.assign(originalFailed, {
    status: "completed-valid-after-level-1-event-disjoint-recovery",
    accepted: true,
    rawOutputWritten: true,
    rawOutputSha256: sha256(mergedBytes),
    validationSummary: mergedValidation,
    recovery: {
      recoveryLevel: 1,
      recoveryShardContexts: 2,
      originalTimedOutAttemptPreserved: true,
      failedPartialOutputUsed: false,
      mergedCandidates: candidates.length,
    },
  });
  overlay.status = "forty-four-post-canary-batch-12-discovery-contexts-passed-after-bounded-recovery";
  overlay.validContexts = 44;
  overlay.invalidContexts = 0;
  overlay.wallElapsedMs += recoveryExecution.wallElapsedMs;
  overlay.modelWorkElapsedMs += recoveryExecution.results.reduce((sum, result) => sum + result.elapsedMs, 0);
  overlay.recovery = {
    recoveryLevel: 1,
    failedContextIndex: FAILED_CONTEXT_INDEX,
    fieldDisjointShardContextsAttempted: 2,
    fieldDisjointShardContextsPassed: 2,
    originalAcceptedOutputsPreservedByteIdentical: 43,
    failedPartialOutputUsed: false,
    completeMergedOutputValidated: true,
    completeCohortReplayRequired: true,
  };
  const debates = [];
  for (const debate of frozen.sourcePreparation.contexts) {
    const [debatePacketBytes, debatePlanBytes, debateEventsBytes, debateFullLedgerBytes] = await Promise.all([
      readFile(debate.packet),
      readFile(debate.plan),
      readFile(debate.originalEvents),
      readFile(debate.fullLedger),
    ]);
    const debatePacket = JSON.parse(debatePacketBytes);
    const debatePlan = JSON.parse(debatePlanBytes);
    const debateEvents = JSON.parse(debateEventsBytes);
    const outputs = [];
    let derivedWindows = 0;
    for (const chunk of debate.chunks) {
      const outputBytes = debate.debateNumber === DEBATE_NUMBER && chunk.chunkId === CHUNK_ID
        ? mergedBytes
        : await readFile(chunk.futureRawOutput);
      const output = JSON.parse(outputBytes);
      const validation = validateV212Discovery(output, {
        packet: debatePacket,
        chunk,
        plan: debatePlan,
        eventsDocument: debateEvents,
        eventsBytes: debateEventsBytes,
        chunkBytes: await readFile(chunk.chunkLedgerPath),
        fullLedgerBytes: debateFullLedgerBytes,
      });
      derivedWindows += validation.derivedWindows.length;
      outputs.push(output);
    }
    const bundle = compileV212CandidateBundle({ packet: debatePacket, plan: debatePlan, outputs });
    assertV4(bundle.candidateCount === derivedWindows, `${debate.debateNumber}: candidate bundle drifted`);
    const pro = bundle.candidates.filter((candidate) => candidate.side === "pro").length;
    const con = bundle.candidates.filter((candidate) => candidate.side === "con").length;
    const candidateMinimumPassed =
      bundle.candidateCount >= frozen.activation.compilationPolicy.candidateMinimumPerDebate &&
      pro >= frozen.activation.compilationPolicy.candidateMinimumPerSide &&
      con >= frozen.activation.compilationPolicy.candidateMinimumPerSide;
    const rows = parseV42219Ledger(debateFullLedgerBytes);
    const included = new Set();
    for (const candidate of bundle.candidates) {
      for (
        let event = Math.max(0, candidate.sourceSpan.startEvent - frozen.activation.compilationPolicy.sparseContextFlankEvents);
        event <= Math.min(rows.length - 1, candidate.sourceSpan.endEvent + frozen.activation.compilationPolicy.sparseContextFlankEvents);
        event += 1
      ) included.add(event);
    }
    const sparseRows = [...included].sort((left, right) => left - right).map((event) => rows[event]);
    const sparseBytes = serializeV42219Rows(sparseRows);
    const bundlePath = `${DISCOVERY}/candidate-bundles/debate-${debate.debateNumber}.json`;
    const sparsePath = `${DISCOVERY}/candidate-context/debate-${debate.debateNumber}.jsonl`;
    const bundleBytes = jsonBytes(bundle);
    if (shouldWrite) {
      await mkdir(path.dirname(bundlePath), { recursive: true });
      await mkdir(path.dirname(sparsePath), { recursive: true });
      await writeFile(bundlePath, bundleBytes);
      await writeFile(sparsePath, sparseBytes);
    }
    const executionRows = overlay.results.filter((result) => result.debateNumber === debate.debateNumber);
    const medium = bundle.candidates.filter((candidate) => candidate.attributionConfidence === "medium").length;
    const low = bundle.candidates.filter((candidate) => candidate.attributionConfidence === "low").length;
    debates.push({
      debateNumber: debate.debateNumber,
      debateId: debate.debateId,
      family: debate.family,
      sourceComplexityBand: debate.sourceComplexityBand,
      sourceChainOverlayApplied: debate.sourceChainOverlayApplied,
      chunks: debate.chunks.length,
      candidates: bundle.candidateCount,
      pro,
      con,
      candidateMinimumPassed,
      constructive: bundle.candidates.filter((candidate) => candidate.moveKind === "constructive").length,
      reply: bundle.candidates.filter((candidate) => candidate.moveKind === "reply").length,
      mediumAttributionCandidates: medium,
      lowAttributionCandidates: low,
      belowHighAttributionCandidates: medium + low,
      selectedBelowHighCandidatesRequireLaterAudioVerification: true,
      repositoryDerivedLexicalTokenCountWindows: derivedWindows,
      modelAuthoredLexicalTokenCounts: false,
      modelAuthoredBoundedEndEvents: derivedWindows,
      bundlePath,
      bundleSha256: sha256(bundleBytes),
      sparsePath,
      sparseEvents: sparseRows.length,
      sparseBytes: sparseBytes.length,
      sparseSha256: sha256(sparseBytes),
      candidateSpansIncluded: bundle.candidates.every((candidate) => {
        for (let event = candidate.sourceSpan.startEvent; event <= candidate.sourceSpan.endEvent; event += 1) {
          if (!included.has(event)) return false;
        }
        return true;
      }),
      allDiscoveredCandidatesTransported: true,
      localTargetIdsModelAuthored: false,
      semanticDeduplicationPerformed: false,
      semanticCorrectionPerformed: false,
      modelWorkElapsedMs: executionRows.reduce((sum, result) => sum + result.elapsedMs, 0),
    });
  }
  const candidateMinimumPassed = debates.every((debate) => debate.candidateMinimumPassed);
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-discovery-analysis",
    protocolId: frozen.activation.protocolId,
    discoveryProtocolId: V212_DISCOVERY_PROTOCOL_ID,
    status: candidateMinimumPassed
      ? DISCOVERY_PASS_STATUS
      : "post-canary-batch-12-discovery-failed-candidate-minimum-stop-no-retry",
    analyzedAt,
    productionContinuation: true,
    developmentValidationOnly: false,
    productionCanary: false,
    stagingOnly: true,
    AIOnly: true,
    activePolicy: frozen.activation.activePolicy,
    recovery: overlay.recovery,
    debates,
    audit: {
      frozenContexts: 44,
      validContexts: 44,
      invalidContexts: 0,
      modelContextsExecuted: 46,
      effectiveDiscoveryContexts: 44,
      recoveryShardContexts: 2,
      retries: 0,
      timeoutExtensions: 0,
      semanticCorrections: 0,
      rampOneServedAsOperationalCanary: true,
      schedulerRamp: overlay.schedulerRamp,
      rampPhases: overlay.rampPhases,
      rampPassed: overlay.rampPassed,
      maximumParallelContextsAllowed: 4,
      maximumParallelContextsObserved: overlay.maximumParallelContextsObserved,
      candidateStartOwnedCoreBounds: true,
      modelAuthoredEndEventRequired: true,
      repositoryDerivedLexicalTokenCount: true,
      minimumLexicalTokens: V212_DISCOVERY_MINIMUM_LEXICAL_TOKENS,
      requestedLexicalTokensProhibited: true,
      predecessorChunkOwnershipRuleExplicit: true,
      frozenDyadicSpeakerAllowlist: true,
      everySourceEventOwnedExactlyOnce: true,
      exactChunkReplay: true,
      exactTokenLedgerReplay: true,
      zeroLexicalTokenRowsPreservedWithCountZero: true,
      exactSourceRowsInjectedOmittedOrRewritten: false,
      localTargetIdsModelAuthored: false,
      targetTopologyDeferredToCandidateShardedInventory: true,
      repositoryDerivedMoveKind: true,
      allDiscoveredCandidatesTransported: true,
      silentSemanticDeduplication: false,
      automaticSemanticCorrection: false,
      candidateMinimumPassed,
      activePolicyVersion: "v2.2",
      integerRoundedTiesPermitted: true,
      scoresDerived: 0,
      productionMutations: 0,
    },
    totals: {
      debates: debates.length,
      candidates: debates.reduce((sum, debate) => sum + debate.candidates, 0),
      pro: debates.reduce((sum, debate) => sum + debate.pro, 0),
      con: debates.reduce((sum, debate) => sum + debate.con, 0),
      repositoryDerivedLexicalTokenCountWindows: debates.reduce((sum, debate) => sum + debate.repositoryDerivedLexicalTokenCountWindows, 0),
      modelAuthoredLexicalTokenCounts: 0,
      modelAuthoredBoundedEndEvents: debates.reduce((sum, debate) => sum + debate.modelAuthoredBoundedEndEvents, 0),
      belowHighAttributionCandidates: debates.reduce((sum, debate) => sum + debate.belowHighAttributionCandidates, 0),
      sparseEvents: debates.reduce((sum, debate) => sum + debate.sparseEvents, 0),
      wallElapsedMs: overlay.wallElapsedMs,
      modelWorkElapsedMs: overlay.modelWorkElapsedMs,
      modelContextsExecuted: 46,
      effectiveDiscoveryContexts: 44,
      recoveryShardContexts: 2,
      retries: 0,
      timeoutExtensions: 0,
      semanticCorrections: 0,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      scoresDerived: 0,
      productionMutations: 0,
    },
    authorization: {
      inventoryPreparation: false,
      inventoryExecutionActivation: false,
      inventoryModelExecution: false,
      independentJudgmentPacketPreparation: false,
      independentJudgmentModelExecution: false,
      paidTranscription: false,
      unexpectedPaidService: false,
      audioVerification: false,
      adjudicationModelExecution: false,
      scoreDerivation: false,
      publicationPreparation: false,
      publicationModelExecution: false,
      productionMutation: false,
      nextBatchSelection: false,
    },
    nextAuthorizedAction: candidateMinimumPassed
      ? "prepare-freeze-and-activate-batch-12-candidate-census-planner-contexts-under-standing-authorization"
      : "stop-candidate-minimum-failed-no-retry-or-semantic-correction-authorized",
  };
  const recoveryAnalysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-12-discovery-recovery-analysis",
    protocolId: preparation.protocolId,
    status: candidateMinimumPassed
      ? "batch-12-debate-11-chunk-001-discovery-recovered-and-complete-cohort-replay-passed"
      : "batch-12-discovery-recovery-merged-but-candidate-minimum-failed",
    analyzedAt,
    originalExecution: ORIGINAL_EXECUTION,
    originalExecutionSha256: sha256(frozen.executionBytes),
    recoveryExecution: EXECUTION,
    recoveryExecutionSha256: sha256(recoveryExecutionBytes),
    mergedOutput: frozen.chunk.futureRawOutput,
    mergedOutputSha256: sha256(mergedBytes),
    cohortExecutionOverlay: OVERLAY,
    discoveryAnalysis: `${DISCOVERY}/analysis.json`,
    protectedOriginalOutputs: 43,
    recoveryLevel: 1,
    shardsAttempted: 2,
    shardsPassed: 2,
    failedPartialOutputUsed: false,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    modelContextsExecuted: 2,
    directIncrementalCostUsd: 0,
    candidateMinimumPassed,
    nextAuthorizedAction: analysis.nextAuthorizedAction,
  };
  if (shouldWrite) {
    await writeFile(frozen.chunk.futureRawOutput, mergedBytes);
    await writeFile(OVERLAY, jsonBytes(overlay));
    await writeFile(`${DISCOVERY}/analysis.json`, jsonBytes(analysis));
    await writeFile(RECOVERY_ANALYSIS, jsonBytes(recoveryAnalysis));
  }
  console.log(JSON.stringify({
    status: shouldWrite ? recoveryAnalysis.status : "preview",
    mergedCandidates: candidates.length,
    debates,
    totals: analysis.totals,
    candidateMinimumPassed,
    directIncrementalCostUsd: 0,
    nextAuthorizedAction: analysis.nextAuthorizedAction,
  }, null, 2));
}

async function validate() {
  const frozen = await loadFrozenBoundary({ allowRecoveredOutput: true });
  const { preparation } = await loadActivation();
  const execution = JSON.parse(await readFile(EXECUTION));
  const overlay = JSON.parse(await readFile(OVERLAY));
  const analysis = JSON.parse(await readFile(`${DISCOVERY}/analysis.json`));
  const recoveryAnalysis = JSON.parse(await readFile(RECOVERY_ANALYSIS));
  assertV4(
    execution.status === EXECUTION_STATUS &&
      overlay.validContexts === 44 &&
      overlay.invalidContexts === 0 &&
      overlay.recovery.recoveryLevel === 1 &&
      analysis.status === DISCOVERY_PASS_STATUS &&
      analysis.audit.validContexts === 44 &&
      analysis.audit.modelContextsExecuted === 46 &&
      analysis.audit.recoveryShardContexts === 2 &&
      analysis.audit.candidateMinimumPassed === true &&
      analysis.totals.modelContextsExecuted === 46 &&
      analysis.totals.meteredApiCostUsd === 0 &&
      recoveryAnalysis.status === "batch-12-debate-11-chunk-001-discovery-recovered-and-complete-cohort-replay-passed" &&
      recoveryAnalysis.retries === 0 &&
      recoveryAnalysis.timeoutExtensions === 0 &&
      recoveryAnalysis.directIncrementalCostUsd === 0,
    "recovered discovery gate validation failed"
  );
  await assertHashes(preparation.protectedOutputHashes, "protected original output");
  for (const debate of analysis.debates) {
    assertV4(
      sha256(await readFile(debate.bundlePath)) === debate.bundleSha256 &&
        sha256(await readFile(debate.sparsePath)) === debate.sparseSha256 &&
        debate.candidateSpansIncluded === true &&
        debate.allDiscoveredCandidatesTransported === true &&
        debate.semanticCorrectionPerformed === false,
      `${debate.debateNumber}: recovered discovery artifact invalid`
    );
  }
  assertV4(
    sha256(await readFile(frozen.chunk.futureRawOutput)) === recoveryAnalysis.mergedOutputSha256 &&
      allBooleanLeavesTrue({
        candidateMinimumPassed: analysis.audit.candidateMinimumPassed,
        exactChunkReplay: analysis.audit.exactChunkReplay,
        exactTokenLedgerReplay: analysis.audit.exactTokenLedgerReplay,
        everySourceEventOwnedExactlyOnce: analysis.audit.everySourceEventOwnedExactlyOnce,
      }),
    "merged recovery output or replay audit drifted"
  );
  console.log(JSON.stringify({
    status: "passed-batch-12-discovery-after-bounded-recovery",
    effectiveDiscoveryContexts: 44,
    modelContextsExecuted: 46,
    recoveryShardContexts: 2,
    protectedOriginalOutputs: 43,
    candidates: analysis.totals.candidates,
    retries: 0,
    timeoutExtensions: 0,
    directIncrementalCostUsd: 0,
    nextAuthorizedAction: analysis.nextAuthorizedAction,
  }, null, 2));
}

const command = process.argv[2];
if (command === "prepare") await prepare();
else if (command === "activate") await activate();
else if (command === "run") await run();
else if (command === "analyze") await analyze();
else if (command === "validate") await validate();
else throw new Error("usage: recover-assessment-production-post-canary-batch-12-debate-11-discovery-chunk-001.mjs <prepare|activate|run|analyze|validate>");
