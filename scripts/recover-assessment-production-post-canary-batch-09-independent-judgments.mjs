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
  POST_CANARY_BATCH_09_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch09StandingAuthorization,
} from "./lib/assessment-production-post-canary-batch-09-standing-authorization.mjs";

const ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/independent-judgments";
const RECOVERY = `${ROOT}/execution-recovery-1`;
const ORIGINAL_ACTIVATION = `${ROOT}/execution-activation.json`;
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const DIAGNOSIS = `${RECOVERY}/failure-diagnosis.json`;
const MANIFEST = `${RECOVERY}/recovery-manifest.json`;
const ACTIVATION = `${RECOVERY}/execution-activation.json`;
const EXECUTION = `${RECOVERY}/model-execution.json`;
const ANALYSIS = `${RECOVERY}/analysis.json`;
const FINAL_EXECUTION = `${ROOT}/model-execution.json`;
const SCRIPT =
  "scripts/recover-assessment-production-post-canary-batch-09-independent-judgments.mjs";
const VALIDATOR =
  "scripts/validate-assessment-production-post-canary-batch-09-independent-judgment.mjs";
const ACCEPTED_ORIGINAL_INDEXES = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16,
];
const RECOVERY_SOURCE_INDEXES = [13, 17, 18, 19];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(file).then(() => true, () => false);
const tail = (value, maximum = 12000) =>
  value.length <= maximum ? value : value.slice(-maximum);

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function makeShardSchema(fullSchema, moveIds, burdenSide) {
  const schema = structuredClone(fullSchema);
  const moveProperties = schema.properties.moveJudgments.properties;
  schema.properties.moveJudgments.required = [...moveIds];
  schema.properties.moveJudgments.properties = Object.fromEntries(
    moveIds.map((moveId) => [moveId, moveProperties[moveId]])
  );
  const burdenProperties =
    schema.properties.burdenCompletionAdjustment.properties;
  schema.properties.burdenCompletionAdjustment.required = [burdenSide];
  schema.properties.burdenCompletionAdjustment.properties = {
    [burdenSide]: burdenProperties[burdenSide],
  };
  return schema;
}

async function loadBoundary() {
  const [originalActivation, preparation, standingAuthorization] =
    await Promise.all([
      readJson(ORIGINAL_ACTIVATION),
      readJson(PREPARATION),
      loadAndValidatePostCanaryBatch09StandingAuthorization(),
    ]);
  assertV4(
    originalActivation.status ===
        "frozen-twenty-post-canary-batch-09-independent-judgment-contexts-authorized" &&
      originalActivation.contexts.length === 20 &&
      originalActivation.model.label === "5.6 Sol" &&
      originalActivation.model.slug === "gpt-5.6-sol" &&
      originalActivation.model.reasoningEffort === "low" &&
      originalActivation.model.authentication === "ChatGPT subscription" &&
      originalActivation.model.scoreBlind === true &&
      originalActivation.executionPolicy.attemptsPerContext === 1 &&
      originalActivation.executionPolicy.retriesMaximum === 0 &&
      originalActivation.executionPolicy.timeoutMsPerContext === 900000 &&
      originalActivation.executionPolicy.timeoutExtensionsMaximum === 0 &&
      originalActivation.executionPolicy
        .continueIndependentContextsWithinStartedSteadyPhaseAfterFailure === true &&
      originalActivation.userAuthorization.standingAuthorization ===
        POST_CANARY_BATCH_09_STANDING_AUTHORIZATION &&
      originalActivation.userAuthorization.standingAuthorizationSha256 ===
        standingAuthorization.sha256 &&
      standingAuthorization.record.recoveryControls
        .boundedFirstRecoveryAuthorized === true &&
      standingAuthorization.record.recoveryControls
        .fieldDisjointShardingPermitted === true &&
      preparation.status ===
        "twenty-post-canary-batch-09-independent-judgment-contexts-prepared-and-frozen",
    "Batch 9 recovery boundary changed"
  );
  return { originalActivation, preparation, standingAuthorization };
}

async function buildPreparation(frozenAt) {
  const { originalActivation, preparation, standingAuthorization } =
    await loadBoundary();
  assertV4(
    frozenAt && !Number.isNaN(Date.parse(frozenAt)),
    "--frozen-at requires an ISO timestamp"
  );
  const accepted = [];
  for (const index of ACCEPTED_ORIGINAL_INDEXES) {
    const context = originalActivation.contexts[index];
    const files = {
      judgment: context.judgmentOutput,
      raw: context.rawOutput,
      validation: context.validationOutput,
      provenance: context.provenanceOutput,
    };
    const hashes = {};
    for (const [key, file] of Object.entries(files)) {
      const bytes = await readFile(file);
      hashes[key] = sha256(bytes);
    }
    const validation = await readJson(context.validationOutput);
    assertV4(
      validation.status === "passed" &&
        validation.debateNumber === context.debateNumber &&
        validation.reviewerPass === context.reviewerPass &&
        validation.semanticRepairPerformed === false &&
        validation.modelAuthoredScores === 0 &&
        validation.scoresDerived === 0,
      `${context.debateNumber}/${context.reviewerPass}: accepted validation changed`
    );
    accepted.push({
      contextIndex: index,
      debateNumber: context.debateNumber,
      reviewerPass: context.reviewerPass,
      files,
      hashes,
    });
  }
  assertV4(
    !(await exists(originalActivation.contexts[13].judgmentOutput)) &&
      !(await exists(originalActivation.contexts[17].judgmentOutput)) &&
      !(await exists(originalActivation.contexts[18].judgmentOutput)) &&
      !(await exists(originalActivation.contexts[19].judgmentOutput)),
    "a recovery-target judgment output already exists"
  );

  const timeoutContext = originalActivation.contexts[13];
  const fullSchema = await readJson(timeoutContext.schema);
  const fullMoveIds = fullSchema.properties.moveJudgments.required;
  assertV4(
    fullMoveIds.length === 20 && new Set(fullMoveIds).size === 20,
    "Debate 176 Pass B full schema changed"
  );
  const shardDefinitions = [
    {
      recoveryContextIndex: 0,
      originalContextIndex: 13,
      kind: "field-disjoint-timeout-shard",
      shard: 0,
      moveIds: fullMoveIds.slice(0, 10),
      burdenSide: "pro",
    },
    {
      recoveryContextIndex: 1,
      originalContextIndex: 13,
      kind: "field-disjoint-timeout-shard",
      shard: 1,
      moveIds: fullMoveIds.slice(10),
      burdenSide: "con",
    },
  ];
  const generated = new Map();
  for (const definition of shardDefinitions) {
    const schemaPath = `${RECOVERY}/schemas/debate-176-pass-b-shard-${definition.shard}.schema.json`;
    const outputPath = `${RECOVERY}/outputs/debate-176-pass-b-shard-${definition.shard}.json`;
    const schemaBytes = jsonBytes(
      makeShardSchema(fullSchema, definition.moveIds, definition.burdenSide)
    );
    generated.set(schemaPath, schemaBytes);
    definition.schema = schemaPath;
    definition.schemaSha256 = sha256(schemaBytes);
    definition.output = outputPath;
  }
  const resumptionDefinitions = [
    {
      recoveryContextIndex: 2,
      originalContextIndex: 17,
      kind: "stop-boundary-resumption",
    },
    {
      recoveryContextIndex: 3,
      originalContextIndex: 18,
      kind: "stop-boundary-resumption",
    },
    {
      recoveryContextIndex: 4,
      originalContextIndex: 19,
      kind: "original-unattempted-resumption",
    },
  ].map((definition) => {
    const context = originalActivation.contexts[definition.originalContextIndex];
    return {
      ...definition,
      schema: context.schema,
      schemaSha256: context.schemaSha256,
      output: `${RECOVERY}/outputs/debate-${context.debateNumber}-pass-${context.reviewerPass.toLowerCase()}.json`,
    };
  });
  const contexts = [...shardDefinitions, ...resumptionDefinitions].map(
    (definition) => {
      const original =
        originalActivation.contexts[definition.originalContextIndex];
      return {
        ...definition,
        debateNumber: original.debateNumber,
        debateId: original.debateId,
        reviewerPass: original.reviewerPass,
        reviewerRole: original.reviewerRole,
        sourcePacket: original.sourcePacket,
        sourcePacketSha256: original.sourcePacketSha256,
        judgmentPacket: original.judgmentPacket,
        judgmentPacketSha256: original.judgmentPacketSha256,
        lockedInventory: original.lockedInventory,
        lockedInventorySha256: original.lockedInventorySha256,
        lockedInventoryCanonicalSha256:
          original.lockedInventoryCanonicalSha256,
        finalJudgmentOutput: original.judgmentOutput,
        finalRawOutput: original.rawOutput,
        finalValidationOutput: original.validationOutput,
        finalProvenanceOutput: original.provenanceOutput,
        attemptsMaximum: 1,
        retriesMaximum: 0,
        timeoutExtensionsMaximum: 0,
      };
    }
  );

  const diagnosis = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-09-independent-judgment-recovery-diagnosis",
    protocolId:
      "assessment-production-post-canary-batch-09-independent-judgment-recovery-1",
    status:
      "preserved-batch-09-independent-judgment-timeout-and-stop-boundary-interruption-diagnosed",
    frozenAt,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    directIncrementalCostUsd: 0,
    acceptedOriginalContexts: accepted,
    acceptedOriginalContextsCount: accepted.length,
    primaryFailure: {
      originalContextIndex: 13,
      debateNumber: "176",
      reviewerPass: "B",
      category: "model-context-timeout-without-output",
      timeoutMsApplied: 900000,
      observedConsoleRecord:
        "[batch-09-judgment] Debate 176 Pass B timed-out in 15.00m",
      failedPartialOutputExists: false,
      failedPartialOutputReusable: false,
    },
    stopBoundaryDisposition: {
      activationPermittedSteadyPhaseContinuation: true,
      operatorStopAppliedAfterTimeoutObservation: true,
      contextsStartedThenStoppedWithoutOutput: [
        { originalContextIndex: 17, debateNumber: "112", reviewerPass: "B" },
        { originalContextIndex: 18, debateNumber: "17", reviewerPass: "A" },
      ],
      originalUnattemptedContexts: [
        { originalContextIndex: 19, debateNumber: "17", reviewerPass: "B" },
      ],
    },
    diagnosis: {
      timeoutCause:
        "The complete twenty-move Debate 176 Pass B output exceeded the frozen 900,000-millisecond transport window; no response file survived.",
      recoveryShape:
        "Use the minimum two field-disjoint shards for the twenty move judgments, assign one burden-adjustment side to each shard, resume the two stop-boundary contexts once, and execute the untouched Debate 17 Pass B context once.",
      originalAcceptedOutputsChanged: false,
      sourcesChanged: false,
      inventoriesChanged: false,
      scoresDerived: 0,
    },
  };
  const diagnosisBytes = jsonBytes(diagnosis);
  generated.set(DIAGNOSIS, diagnosisBytes);

  const sourceFiles = [
    ORIGINAL_ACTIVATION,
    PREPARATION,
    SCRIPT,
    VALIDATOR,
    POST_CANARY_BATCH_09_STANDING_AUTHORIZATION,
    originalActivation.modelInputs.manual,
    ...accepted.flatMap((item) => Object.values(item.files)),
    ...RECOVERY_SOURCE_INDEXES.flatMap((index) => {
      const context = originalActivation.contexts[index];
      return [
        context.sourcePacket,
        context.judgmentPacket,
        context.schema,
        context.lockedInventory,
      ];
    }),
    ...shardDefinitions.map((context) => context.schema),
    DIAGNOSIS,
  ];
  const sourceHashes = {};
  for (const file of [...new Set(sourceFiles)].sort()) {
    const bytes = generated.get(file) ?? (await readFile(file));
    sourceHashes[file] = sha256(bytes);
  }
  const manifest = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-09-independent-judgment-recovery-manifest",
    protocolId:
      "assessment-production-post-canary-batch-09-independent-judgment-recovery-1",
    status:
      "frozen-five-context-batch-09-independent-judgment-recovery-prepared-not-authorized",
    frozenAt,
    checkpointCommit: diagnosis.checkpointCommit,
    branch: "main",
    standingAuthorization: POST_CANARY_BATCH_09_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standingAuthorization.sha256,
    diagnosis: DIAGNOSIS,
    diagnosisSha256: sha256(diagnosisBytes),
    originalActivation: ORIGINAL_ACTIVATION,
    originalActivationSha256: sha256(await readFile(ORIGINAL_ACTIVATION)),
    originalPreparation: PREPARATION,
    originalPreparationSha256: sha256(await readFile(PREPARATION)),
    model: structuredClone(originalActivation.model),
    sourceCompatibility: structuredClone(
      originalActivation.sourceCompatibility
    ),
    contexts,
    acceptedOriginalContexts: accepted,
    executionPolicy: {
      contexts: 5,
      schedulerRamp: [1, 2],
      rampPhases: [
        { phase: "operational-canary-one", contextIndexes: [0], maximumParallelContexts: 1 },
        { phase: "ramp-two", contextIndexes: [1, 2], maximumParallelContexts: 2 },
        { phase: "steady-two", contextIndexes: [3, 4], maximumParallelContexts: 2 },
      ],
      attemptsPerContext: 1,
      retriesMaximum: 0,
      timeoutMsPerContext: 900000,
      timeoutExtensionsMaximum: 0,
      stopRemainingContextsAfterAnyFailure: true,
      maximumParallelContexts: 2,
      failedPartialOutputReusable: false,
      eachOriginalFieldAcceptedExactlyOnce: true,
      minimumFieldDisjointShardCount: 2,
      directIncrementalCostUsdMaximum: 0,
    },
    mergeRule: {
      debate176PassBMoveJudgmentShards: [0, 1],
      shardMoveSetsDisjoint: true,
      shardMoveSetUnionEqualsOriginal: true,
      burdenAdjustmentSideSetsDisjoint: true,
      burdenAdjustmentSideSetUnionEqualsOriginal: true,
      immutableMetadataMustMatchAcrossShards: true,
      completeMergedOutputMustPassOriginalValidator: true,
      acceptedOriginalOutputsPreservedByteIdentically: true,
    },
    futureOutputs: [
      ACTIVATION,
      EXECUTION,
      ANALYSIS,
      FINAL_EXECUTION,
      ...contexts.map((context) => context.output),
      ...contexts.map((context) => context.finalJudgmentOutput),
      ...contexts.flatMap((context) => [
        context.finalRawOutput,
        context.finalValidationOutput,
        context.finalProvenanceOutput,
      ]),
    ].filter(
      (file) =>
        !accepted.some((item) => Object.values(item.files).includes(file))
    ),
    sourceHashes,
    authorization: {
      correctionModelContexts: false,
      deterministicMerge: false,
      completeCohortReplay: false,
      retries: false,
      timeoutExtensions: false,
      scoreDerivation: false,
      paidServices: false,
      productionMutation: false,
    },
  };
  generated.set(MANIFEST, jsonBytes(manifest));
  return { generated, manifest, diagnosis };
}

async function prepare() {
  const shouldWrite = process.argv.includes("--write");
  const index = process.argv.indexOf("--frozen-at");
  const frozenAt = index >= 0 ? process.argv[index + 1] : null;
  const built = await buildPreparation(frozenAt);
  for (const context of built.manifest.contexts) {
    assertV4(!(await exists(context.output)), `${context.output} already exists`);
  }
  if (shouldWrite) {
    for (const [file, bytes] of built.generated) {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes);
    }
  }
  console.log(
    JSON.stringify(
      {
        status: shouldWrite ? built.manifest.status : "preview",
        acceptedOriginalContexts: 16,
        recoveryContexts: built.manifest.contexts.map((context) => ({
          recoveryContextIndex: context.recoveryContextIndex,
          originalContextIndex: context.originalContextIndex,
          debateNumber: context.debateNumber,
          reviewerPass: context.reviewerPass,
          kind: context.kind,
          moves: context.moveIds?.length ?? 20,
          burdenSide: context.burdenSide ?? "both",
        })),
        attemptsPerContext: 1,
        retriesMaximum: 0,
        timeoutExtensionsMaximum: 0,
        directIncrementalCostUsdMaximum: 0,
        modelExecutionAuthorized: false,
      },
      null,
      2
    )
  );
}

async function validatePreparedManifest(manifest) {
  const { originalActivation, standingAuthorization } = await loadBoundary();
  assertV4(
    manifest.status ===
        "frozen-five-context-batch-09-independent-judgment-recovery-prepared-not-authorized" &&
      manifest.contexts.length === 5 &&
      manifest.acceptedOriginalContexts.length === 16 &&
      manifest.model.label === "5.6 Sol" &&
      manifest.model.slug === "gpt-5.6-sol" &&
      manifest.model.reasoningEffort === "low" &&
      manifest.model.authentication === "ChatGPT subscription" &&
      manifest.model.scoreBlind === true &&
      manifest.executionPolicy.attemptsPerContext === 1 &&
      manifest.executionPolicy.retriesMaximum === 0 &&
      manifest.executionPolicy.timeoutExtensionsMaximum === 0 &&
      manifest.executionPolicy.minimumFieldDisjointShardCount === 2 &&
      manifest.executionPolicy.directIncrementalCostUsdMaximum === 0 &&
      manifest.standingAuthorizationSha256 === standingAuthorization.sha256 &&
      manifest.originalActivationSha256 ===
        sha256(await readFile(ORIGINAL_ACTIVATION)),
    "recovery manifest boundary changed"
  );
  for (const [file, digest] of Object.entries(manifest.sourceHashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: recovery source drifted`);
  }
  const shards = manifest.contexts.slice(0, 2);
  assertV4(
    shards.every(
      (context) =>
        context.originalContextIndex === 13 &&
        context.kind === "field-disjoint-timeout-shard" &&
        context.moveIds.length === 10
    ) &&
      new Set(shards.flatMap((context) => context.moveIds)).size === 20 &&
      shards[0].burdenSide === "pro" &&
      shards[1].burdenSide === "con",
    "Debate 176 recovery shards changed"
  );
  for (const accepted of manifest.acceptedOriginalContexts) {
    for (const [key, file] of Object.entries(accepted.files)) {
      assertV4(
        sha256(await readFile(file)) === accepted.hashes[key],
        `${file}: accepted original output changed`
      );
    }
  }
  assertV4(
    originalActivation.contexts.length === 20,
    "original context count changed"
  );
}

async function activate() {
  const shouldWrite = process.argv.includes("--write");
  const index = process.argv.indexOf("--activated-at");
  const activatedAt = index >= 0 ? process.argv[index + 1] : null;
  assertV4(
    activatedAt && !Number.isNaN(Date.parse(activatedAt)),
    "--activated-at requires an ISO timestamp"
  );
  const [manifest, manifestBytes] = await Promise.all([
    readJson(MANIFEST),
    readFile(MANIFEST),
  ]);
  await validatePreparedManifest(manifest);
  assertV4(!shouldWrite || !(await exists(ACTIVATION)), `${ACTIVATION} exists`);
  const sourceHashes = {
    ...manifest.sourceHashes,
    [MANIFEST]: sha256(manifestBytes),
  };
  const activation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-09-independent-judgment-recovery-activation",
    protocolId: manifest.protocolId,
    status:
      "frozen-five-context-batch-09-independent-judgment-recovery-authorized",
    activatedAt,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    manifest: MANIFEST,
    manifestSha256: sha256(manifestBytes),
    model: structuredClone(manifest.model),
    contexts: structuredClone(manifest.contexts),
    acceptedOriginalContexts: structuredClone(
      manifest.acceptedOriginalContexts
    ),
    executionPolicy: structuredClone(manifest.executionPolicy),
    mergeRule: structuredClone(manifest.mergeRule),
    sourceCompatibility: structuredClone(manifest.sourceCompatibility),
    sourceHashes,
    authorization: {
      correctionModelContexts: true,
      deterministicMerge: true,
      completeCohortReplay: true,
      retries: false,
      timeoutExtensions: false,
      scoreDerivation: false,
      paidServices: false,
      productionMutation: false,
    },
    artifacts: { execution: EXECUTION, analysis: ANALYSIS, finalExecution: FINAL_EXECUTION },
  };
  if (shouldWrite) {
    await writeFile(ACTIVATION, jsonBytes(activation));
  }
  console.log(
    JSON.stringify(
      {
        status: shouldWrite ? activation.status : "preview",
        contexts: 5,
        schedulerRamp: [1, 2],
        attemptsPerContext: 1,
        retriesMaximum: 0,
        timeoutExtensionsMaximum: 0,
        directIncrementalCostUsdMaximum: 0,
        model: activation.model,
      },
      null,
      2
    )
  );
}

function runChild(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let forceTimer = null;
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
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

function commonShardFields(output) {
  const copy = structuredClone(output);
  delete copy.moveJudgments;
  delete copy.burdenCompletionAdjustment;
  return copy;
}

async function validateRecoveryOutput(context, output) {
  const parsed = JSON.parse(await readFile(output, "utf8"));
  assertV4(
    parsed.debateNumber === context.debateNumber &&
      parsed.reviewerRole === context.reviewerRole &&
      parsed.assessmentModel === "5.6 Sol" &&
      parsed.calibrationOnly === true &&
      parsed.lockedInventorySha256 ===
        context.lockedInventoryCanonicalSha256 &&
      parsed.isolation?.contaminationDetected === false &&
      parsed.audit?.scoresNotDerived === true,
    `${context.debateNumber}/${context.reviewerPass}: recovery output boundary changed`
  );
  if (context.kind === "field-disjoint-timeout-shard") {
    assertV4(
      canonicalJson(Object.keys(parsed.moveJudgments).sort()) ===
        canonicalJson([...context.moveIds].sort()) &&
        canonicalJson(Object.keys(parsed.burdenCompletionAdjustment)) ===
          canonicalJson([context.burdenSide]),
      `Debate 176 shard ${context.shard}: writable field set changed`
    );
  }
  return parsed;
}

async function executeRecoveryContext(activation, context, authSource) {
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), `slugfester-batch-09-judgment-recovery-${context.recoveryContextIndex}-`)
  );
  const isolatedCodexHome = await mkdtemp(
    path.join(os.tmpdir(), `slugfester-batch-09-judgment-recovery-home-${context.recoveryContextIndex}-`)
  );
  const startedAt = new Date().toISOString();
  const started = Date.now();
  try {
    for (const [source, target] of [
      [(await readJson(ORIGINAL_ACTIVATION)).modelInputs.manual, "manual.md"],
      [context.sourcePacket, "source-packet.json"],
      [context.judgmentPacket, "judgment-packet.json"],
      [context.schema, "schema.json"],
    ]) {
      await copyFile(source, path.join(temporary, target));
    }
    await copyFile(authSource, path.join(isolatedCodexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: isolatedCodexHome };
    for (const key of [
      "OPENAI_API_KEY",
      "OPENAI_ORG_ID",
      "OPENAI_PROJECT_ID",
      "OPENAI_BASE_URL",
      "AZURE_OPENAI_API_KEY",
      "CODEX_API_KEY",
    ]) delete env[key];
    const shardInstruction =
      context.kind === "field-disjoint-timeout-shard"
        ? ` Judge exactly these ten move IDs and no others: ${context.moveIds.join(", ")}. Author only the ${context.burdenSide} burdenCompletionAdjustment side. Treat \"every locked move judged once\" as every move delivered by this recovery schema. This is one field-disjoint half of a deterministic merge; do not infer or author the other half.`
        : " Judge every locked move exactly once and author both burdenCompletionAdjustment sides.";
    const prompt = `Read manual.md, source-packet.json, judgment-packet.json, and schema.json completely; read nothing else. Act only as isolated independent performance Judge ${context.reviewerPass} for production Batch 9 Debate ${context.debateNumber}.${shardInstruction} The score-blind inventory, chronology, source evidence, routes, sections, weights, propositions, and attribution are immutable. Use only legal earlier-opposing targets exposed by the schema. Apply all manual anchors literally. Do not calculate scores, name a winner, claim audio review, alter candidate selection, or write publication prose. The other independent judgment, all other debates, all accepted outputs, and all legacy assessment material are unavailable. Return exactly one schema-conforming JSON object and no commentary.`;
    process.stdout.write(
      `[batch-09-judgment-recovery] starting ${context.recoveryContextIndex} Debate ${context.debateNumber} Pass ${context.reviewerPass} ${context.kind}\n`
    );
    const invocation = await runChild(
      "/Applications/ChatGPT.app/Contents/Resources/codex",
      [
        "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules",
        "--model", "gpt-5.6-sol", "-c", 'model_reasoning_effort="low"',
        "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search",
        "--disable", "apps", "--disable", "memories", "--disable", "multi_agent",
        "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies",
        "--sandbox", "read-only", "--color", "never", "--output-schema", "schema.json",
        "--output-last-message", "result.json", prompt,
      ],
      { cwd: temporary, env },
      900000
    );
    const resultPath = path.join(temporary, "result.json");
    const resultExists = await exists(resultPath);
    if (resultExists) {
      await mkdir(path.dirname(context.output), { recursive: true });
      await copyFile(resultPath, context.output);
    }
    const base = {
      recoveryContextIndex: context.recoveryContextIndex,
      originalContextIndex: context.originalContextIndex,
      debateNumber: context.debateNumber,
      reviewerPass: context.reviewerPass,
      kind: context.kind,
      startedAt,
      completedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      model: "5.6 Sol",
      modelSlug: "gpt-5.6-sol",
      reasoningEffort: "low",
      authentication: "ChatGPT subscription",
      apiKeysRemoved: true,
      scoreBlind: true,
      timedOut: invocation.timedOut,
      commandExitCode: invocation.code,
      terminationSignal: invocation.signal,
      directIncrementalCostUsd: 0,
    };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) {
      return {
        ...base,
        status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed",
        accepted: false,
        outputWritten: resultExists,
        outputSha256: resultExists ? sha256(await readFile(context.output)) : null,
        stdoutTail: tail(invocation.stdout),
        stderrTail: tail(invocation.stderr),
      };
    }
    try {
      await validateRecoveryOutput(context, context.output);
      return {
        ...base,
        status: "completed-valid",
        accepted: true,
        outputWritten: true,
        outputSha256: sha256(await readFile(context.output)),
      };
    } catch (error) {
      return {
        ...base,
        status: "output-validation-failed",
        accepted: false,
        outputWritten: true,
        outputSha256: sha256(await readFile(context.output)),
        validationMessage: tail(error?.stack ?? String(error)),
      };
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(isolatedCodexHome, { recursive: true, force: true });
  }
}

async function mergeAndValidate(activation, results) {
  const [shard0, shard1] = await Promise.all([
    readJson(activation.contexts[0].output),
    readJson(activation.contexts[1].output),
  ]);
  assertV4(
    canonicalJson(commonShardFields(shard0)) ===
      canonicalJson(commonShardFields(shard1)),
    "Debate 176 shard metadata changed"
  );
  const merged176 = {
    ...commonShardFields(shard0),
    moveJudgments: {
      ...shard0.moveJudgments,
      ...shard1.moveJudgments,
    },
    burdenCompletionAdjustment: {
      ...shard0.burdenCompletionAdjustment,
      ...shard1.burdenCompletionAdjustment,
    },
  };
  await mkdir(path.dirname(activation.contexts[0].finalJudgmentOutput), {
    recursive: true,
  });
  await writeFile(
    activation.contexts[0].finalJudgmentOutput,
    jsonBytes(merged176)
  );
  for (const context of activation.contexts.slice(2)) {
    await copyFile(context.output, context.finalJudgmentOutput);
  }
  const uniqueFinalContexts = [activation.contexts[0], ...activation.contexts.slice(2)];
  for (const context of uniqueFinalContexts) {
    const validation = await runChild(
      process.execPath,
      [
        VALIDATOR,
        context.finalJudgmentOutput,
        PREPARATION,
        context.debateNumber,
        context.reviewerPass,
        "--write",
      ],
      { cwd: process.cwd(), env: process.env },
      180000
    );
    assertV4(
      validation.code === 0 && validation.signal === null && !validation.timedOut,
      `${context.debateNumber}/${context.reviewerPass}: merged recovery validation failed: ${tail(validation.stdout + validation.stderr)}`
    );
  }
  for (const accepted of activation.acceptedOriginalContexts) {
    for (const [key, file] of Object.entries(accepted.files)) {
      assertV4(
        sha256(await readFile(file)) === accepted.hashes[key],
        `${file}: accepted original output changed during merge`
      );
    }
  }

  const originalActivation = await readJson(ORIGINAL_ACTIVATION);
  const recoveryResultByOriginal = new Map();
  for (const context of uniqueFinalContexts) {
    const componentResults = results.filter(
      (result) => result.originalContextIndex === context.originalContextIndex
    );
    recoveryResultByOriginal.set(context.originalContextIndex, componentResults);
  }
  const finalResults = [];
  for (const context of originalActivation.contexts) {
    const judgmentBytes = await readFile(context.judgmentOutput);
    const componentResults = recoveryResultByOriginal.get(context.contextIndex) ?? [];
    finalResults.push({
      contextIndex: context.contextIndex,
      debateNumber: context.debateNumber,
      reviewerPass: context.reviewerPass,
      reviewerRole: context.reviewerRole,
      model: "5.6 Sol",
      modelSlug: "gpt-5.6-sol",
      reasoningEffort: "low",
      attemptCount: 1,
      retryCount: 0,
      timeoutExtensionCount: 0,
      semanticCorrectionCount: 0,
      elapsedMs: componentResults.reduce((sum, result) => sum + result.elapsedMs, 0),
      authentication: "ChatGPT subscription",
      apiKeysRemoved: true,
      scoreBlind: true,
      roundedIntegerScoreTiesPermitted: true,
      copiedInputBytes: context.copiedInputBytes,
      lockedInventorySha256: context.lockedInventoryCanonicalSha256,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      status: "completed-valid",
      accepted: true,
      judgmentWritten: true,
      judgmentSha256: sha256(judgmentBytes),
      rawOutputSha256: sha256(await readFile(context.rawOutput)),
      validationSha256: sha256(await readFile(context.validationOutput)),
      provenanceSha256: sha256(await readFile(context.provenanceOutput)),
      recovered: componentResults.length > 0,
      recoveryContextIndexes: componentResults.map((result) => result.recoveryContextIndex),
    });
  }
  const finalExecution = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-09-independent-judgment-model-execution",
    protocolId: originalActivation.protocolId,
    status: "twenty-post-canary-batch-09-independent-judgment-contexts-passed",
    developmentValidationOnly: false,
    productionCanary: false,
    batchNumber: 5,
    stagingOnly: true,
    contextsPlanned: 20,
    contextsAttempted: 20,
    contextsUnattempted: 0,
    unattemptedContextIndexes: [],
    validContexts: 20,
    invalidContexts: 0,
    attempts: 20,
    retries: 0,
    timeoutExtensions: 0,
    semanticCorrections: 0,
    parallelismMaximumAllowed: 2,
    maximumParallelContextsObserved: 2,
    schedulerRamp: [1, 2],
    rampPhases: [
      { phase: "operational-canary-one", attemptedContextIndexes: [0], validContextIndexes: [0], passed: true },
      { phase: "ramp-two", attemptedContextIndexes: [1, 2], validContextIndexes: [1, 2], passed: true },
      { phase: "steady-two", attemptedContextIndexes: Array.from({ length: 17 }, (_, index) => index + 3), validContextIndexes: Array.from({ length: 17 }, (_, index) => index + 3), passed: true },
    ],
    rampPassed: true,
    results: finalResults,
    authentication: "ChatGPT subscription",
    scoreBlind: true,
    roundedIntegerScoreTiesPermitted: true,
    sourceCompatibility: structuredClone(originalActivation.sourceCompatibility),
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    modelAuthoredScores: 0,
    scoresDerived: 0,
    recoveryAudit: {
      recoveryManifest: MANIFEST,
      recoveryManifestSha256: sha256(await readFile(MANIFEST)),
      recoveryExecution: EXECUTION,
      recoveryExecutionSha256: sha256(await readFile(EXECUTION)),
      originalTimeoutContext: { debateNumber: "176", reviewerPass: "B" },
      originalFailedPartialOutputReused: false,
      fieldDisjointShards: 2,
      acceptedOriginalContextsPreservedByteIdentically: 16,
      recoveryContextsExecuted: 5,
      retries: 0,
      timeoutExtensions: 0,
    },
    authorization: {
      deterministicAnalysis: true,
      independentJudgmentModelExecution: false,
      retry: false,
      timeoutExtension: false,
      semanticCorrection: false,
      disagreementExtraction: false,
      paidTranscription: false,
      unexpectedPaidService: false,
      audioVerification: false,
      adjudicationExecution: false,
      scoreDerivation: false,
      policyPromotion: false,
      publicationFinalization: false,
      publicationModelExecution: false,
      productionMutation: false,
      nextBatchSelection: false,
    },
  };
  await writeFile(FINAL_EXECUTION, jsonBytes(finalExecution));
  return finalExecution;
}

async function runRecovery() {
  const [activation, activationBytes] = await Promise.all([
    readJson(ACTIVATION),
    readFile(ACTIVATION),
  ]);
  assertV4(
    activation.status ===
        "frozen-five-context-batch-09-independent-judgment-recovery-authorized" &&
      activation.contexts.length === 5 &&
      activation.executionPolicy.attemptsPerContext === 1 &&
      activation.executionPolicy.retriesMaximum === 0 &&
      activation.executionPolicy.timeoutExtensionsMaximum === 0 &&
      activation.authorization.correctionModelContexts === true &&
      activation.authorization.paidServices === false &&
      activation.authorization.scoreDerivation === false,
    "recovery execution is unauthorized"
  );
  for (const [file, digest] of Object.entries(activation.sourceHashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${file}: activated source drifted`);
  }
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  await access(authSource);
  const results = [];
  let stopped = false;
  for (const phase of activation.executionPolicy.rampPhases) {
    if (stopped) break;
    const phaseResults = await Promise.all(
      phase.contextIndexes.map((index) =>
        executeRecoveryContext(activation, activation.contexts[index], authSource)
      )
    );
    results.push(...phaseResults);
    if (phaseResults.some((result) => !result.accepted)) stopped = true;
  }
  const execution = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-09-independent-judgment-recovery-execution",
    protocolId: activation.protocolId,
    status:
      results.length === 5 && results.every((result) => result.accepted)
        ? "five-context-batch-09-independent-judgment-recovery-passed"
        : "batch-09-independent-judgment-recovery-failed",
    activationSha256: sha256(activationBytes),
    contextsPlanned: 5,
    contextsAttempted: results.length,
    contextsUnattempted: 5 - results.length,
    validContexts: results.filter((result) => result.accepted).length,
    invalidContexts: results.filter((result) => !result.accepted).length,
    attempts: results.length,
    retries: 0,
    timeoutExtensions: 0,
    directIncrementalCostUsd: 0,
    results,
  };
  await writeFile(EXECUTION, jsonBytes(execution));
  if (execution.status !== "five-context-batch-09-independent-judgment-recovery-passed") {
    console.log(JSON.stringify(execution, null, 2));
    process.exitCode = 1;
    return;
  }
  const finalExecution = await mergeAndValidate(activation, results);
  const analysis = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-09-independent-judgment-recovery-analysis",
    protocolId: activation.protocolId,
    status:
      "batch-09-independent-judgment-recovery-passed-complete-cohort-replay-ready",
    recoveryExecution: EXECUTION,
    recoveryExecutionSha256: sha256(await readFile(EXECUTION)),
    finalExecution: FINAL_EXECUTION,
    finalExecutionSha256: sha256(await readFile(FINAL_EXECUTION)),
    acceptedOriginalContextsPreservedByteIdentically: 16,
    recoveredOriginalContexts: 4,
    recoveryModelContexts: 5,
    completeCohortContexts: finalExecution.validContexts,
    completeCohortMovesAcrossPasses: 360,
    retries: 0,
    timeoutExtensions: 0,
    directIncrementalCostUsd: 0,
    scoresDerived: 0,
    nextAuthorizedAction:
      "run-standard-batch-09-independent-judgment-analysis-and-disagreement-extraction",
  };
  await writeFile(ANALYSIS, jsonBytes(analysis));
  console.log(JSON.stringify(analysis, null, 2));
}

async function validateRecovery() {
  const [manifest, activation, execution, analysis, finalExecution] =
    await Promise.all([
      readJson(MANIFEST),
      readJson(ACTIVATION),
      readJson(EXECUTION),
      readJson(ANALYSIS),
      readJson(FINAL_EXECUTION),
    ]);
  await validatePreparedManifest(manifest);
  assertV4(
    activation.manifestSha256 === sha256(await readFile(MANIFEST)) &&
      execution.status ===
        "five-context-batch-09-independent-judgment-recovery-passed" &&
      execution.contextsAttempted === 5 &&
      execution.validContexts === 5 &&
      execution.invalidContexts === 0 &&
      execution.retries === 0 &&
      execution.timeoutExtensions === 0 &&
      analysis.completeCohortContexts === 20 &&
      analysis.completeCohortMovesAcrossPasses === 360 &&
      finalExecution.status ===
        "twenty-post-canary-batch-09-independent-judgment-contexts-passed" &&
      finalExecution.validContexts === 20 &&
      finalExecution.results.every((result) => result.accepted) &&
      finalExecution.recoveryAudit.originalFailedPartialOutputReused === false &&
      finalExecution.recoveryAudit
        .acceptedOriginalContextsPreservedByteIdentically === 16 &&
      finalExecution.scoresDerived === 0,
    "recovery validation failed"
  );
  console.log(
    JSON.stringify(
      {
        status: "passed-batch-09-independent-judgment-recovery",
        recoveryContexts: 5,
        completeCohortContexts: 20,
        movesJudgedAcrossPasses: 360,
        retries: 0,
        timeoutExtensions: 0,
        directIncrementalCostUsd: 0,
        scoresDerived: 0,
      },
      null,
      2
    )
  );
}

const command = process.argv[2];
if (command === "prepare") await prepare();
else if (command === "activate") await activate();
else if (command === "run") await runRecovery();
else if (command === "validate") await validateRecovery();
else throw new Error("usage: recover-assessment-production-post-canary-batch-09-independent-judgments.mjs <prepare|activate|run|validate>");
