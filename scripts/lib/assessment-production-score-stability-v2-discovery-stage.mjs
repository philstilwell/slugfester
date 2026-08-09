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

import { assertV4 } from "./v4-lean-production.mjs";
import {
  parseV42219Ledger,
  serializeV42219Rows,
  validateV42219ChunkLedger,
  validateV42219PartitionPlan,
} from "./v42219-generalized-partition.mjs";
import {
  compileV422112CandidateBundle,
  validateV422112Discovery,
} from "./v422112-simplified-discovery.mjs";

export const V2_DISCOVERY = Object.freeze({
  validationRoot:
    "docs/assessment-production/score-stability-v2-validation-cohort",
  preparation:
    "docs/assessment-production/score-stability-v2-validation-cohort/source-preparation/preparation-manifest.json",
  root:
    "docs/assessment-production/score-stability-v2-validation-cohort/discovery",
  manifest:
    "docs/assessment-production/score-stability-v2-validation-cohort/discovery/execution-manifest.json",
  execution:
    "docs/assessment-production/score-stability-v2-validation-cohort/discovery/model-execution.json",
  analysis:
    "docs/assessment-production/score-stability-v2-validation-cohort/discovery/analysis.json",
  protocolId:
    "assessment-production-score-stability-v2-fresh-validation-discovery",
  manifestStatus:
    "frozen-forty-five-v2-validation-discovery-contexts-authorized",
  executionPassedStatus:
    "forty-five-v2-validation-discovery-contexts-passed",
  executionFailedStatus: "v2-validation-discovery-complete-with-failure",
  analysisStatus:
    "v2-validation-discovery-passed-inventory-packet-preparation-authorized",
  contexts: 45,
  debates: 10,
});

const WORKFLOW = "docs/assessment-production-canary-discovery-workflow.md";
const LIBRARY_PATH =
  "scripts/lib/assessment-production-score-stability-v2-discovery-stage.mjs";
const PREREGISTER_PATH =
  "scripts/preregister-assessment-production-score-stability-v2-discovery.mjs";
const RUNNER_PATH =
  "scripts/run-assessment-production-score-stability-v2-discovery.mjs";
const ANALYZER_PATH =
  "scripts/analyze-assessment-production-score-stability-v2-discovery.mjs";
const TEST_PATH =
  "scripts/test-assessment-production-score-stability-v2-discovery.mjs";
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED_API_ENVIRONMENT_VARIABLES = Object.freeze([
  "OPENAI_API_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "CODEX_API_KEY",
]);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

async function verifyHashes(hashes, prefix = "source") {
  for (const [file, digest] of Object.entries(hashes)) {
    assertV4(
      sha256(await readFile(file)) === digest,
      `${prefix} hash mismatch: ${file}`
    );
  }
}

async function readPreparation() {
  const preparation = JSON.parse(await readFile(V2_DISCOVERY.preparation, "utf8"));
  assertV4(
    preparation.status ===
      "fresh-ten-debate-v2-validation-source-and-discovery-packets-prepared" &&
      preparation.developmentValidationOnly === true &&
      preparation.productionCanary === false &&
      preparation.stagingOnly === true &&
      preparation.contexts.length === V2_DISCOVERY.debates &&
      preparation.totals.discoveryContexts === V2_DISCOVERY.contexts &&
      preparation.totals.ownershipBoundedSchemas === V2_DISCOVERY.contexts &&
      preparation.totals.speakerAllowlistedSchemas === V2_DISCOVERY.contexts &&
      preparation.currentCanaryDisposition?.status ===
        "failed-under-frozen-exact-rounded-winner-rule" &&
      preparation.currentCanaryDisposition?.reclassified === false &&
      preparation.proposedPolicy?.promoted === false &&
      preparation.authorization?.discoveryExecutionManifest === true &&
      preparation.authorization?.discoveryModelExecution === false &&
      preparation.authorization?.inventoryModelExecution === false &&
      preparation.authorization?.scoreDerivation === false &&
      preparation.authorization?.productionMutation === false,
    "v2 source preparation does not authorize a discovery execution manifest"
  );
  assertV4(
    preparation.model?.label === "5.6 Sol" &&
      preparation.model?.slug === "gpt-5.6-sol" &&
      preparation.model?.reasoningEffort === "low" &&
      preparation.model?.authentication === "ChatGPT subscription" &&
      preparation.model?.meteredApiCostUsdMaximum === 0,
    "frozen model, effort, authentication, or cost boundary changed"
  );
  await verifyHashes(preparation.sourceHashes, "preparation source");
  return preparation;
}

async function verifyPreparedContexts(preparation) {
  const contexts = [];
  for (const debate of preparation.contexts) {
    const [packetBytes, planBytes, fullLedgerBytes, eventsBytes] =
      await Promise.all([
        readFile(debate.packet),
        readFile(debate.plan),
        readFile(debate.fullLedger),
        readFile(debate.originalEvents),
      ]);
    assertV4(
      sha256(packetBytes) === debate.packetSha256,
      `${debate.debateNumber}: packet hash mismatch`
    );
    assertV4(
      sha256(planBytes) === debate.planSha256,
      `${debate.debateNumber}: plan hash mismatch`
    );
    assertV4(
      sha256(fullLedgerBytes) === debate.fullLedgerSha256,
      `${debate.debateNumber}: ledger hash mismatch`
    );
    assertV4(
      sha256(eventsBytes) === debate.originalEventsSha256,
      `${debate.debateNumber}: event hash mismatch`
    );
    const packet = JSON.parse(packetBytes);
    assertV4(
      packet.modelInputBoundary?.scoreBlindDiscoveryOnly === true &&
        packet.modelInputBoundary?.developmentValidationOnly === true &&
        packet.modelInputBoundary
          ?.legacyAssessmentsPriorJudgmentsScoresWinnersTagsAndPublicationProseUnavailable ===
          true,
      `${debate.debateNumber}: score-blind packet boundary drifted`
    );
    const plan = JSON.parse(planBytes);
    validateV42219PartitionPlan(plan, fullLedgerBytes);
    assertV4(
      plan.chunks.length === debate.chunks.length,
      `${debate.debateNumber}: chunk count mismatch`
    );
    for (const chunk of debate.chunks) {
      const [chunkBytes, schemaBytes] = await Promise.all([
        readFile(chunk.chunkLedgerPath),
        readFile(chunk.schemaPath),
      ]);
      validateV42219ChunkLedger(chunkBytes, fullLedgerBytes, chunk);
      assertV4(
        sha256(chunkBytes) === chunk.chunkLedgerSha256,
        `${debate.debateNumber}/${chunk.chunkId}: chunk hash mismatch`
      );
      assertV4(
        sha256(schemaBytes) === chunk.schemaSha256,
        `${debate.debateNumber}/${chunk.chunkId}: schema hash mismatch`
      );
      contexts.push({
        contextIndex: contexts.length,
        debateNumber: debate.debateNumber,
        debateId: debate.debateId,
        family: debate.family,
        sourceComplexityBand: debate.sourceComplexityBand,
        packet: debate.packet,
        plan: debate.plan,
        fullLedger: debate.fullLedger,
        originalEvents: debate.originalEvents,
        chunkId: chunk.chunkId,
        coreStartEvent: chunk.coreStartEvent,
        coreEndEvent: chunk.coreEndEvent,
        contextStartEvent: chunk.contextStartEvent,
        contextEndEvent: chunk.contextEndEvent,
        chunkLedgerPath: chunk.chunkLedgerPath,
        chunkLedgerSha256: chunk.chunkLedgerSha256,
        schemaPath: chunk.schemaPath,
        schemaSha256: chunk.schemaSha256,
        copiedInputBytes: chunk.copiedInputBytes,
        rawOutput: chunk.rawOutput,
      });
    }
  }
  assertV4(
    contexts.length === V2_DISCOVERY.contexts,
    `v2 validation must flatten to exactly ${V2_DISCOVERY.contexts} discovery contexts`
  );
  return contexts;
}

export async function preregisterV2Discovery({ shouldWrite, frozenAt }) {
  assertV4(
    frozenAt && !Number.isNaN(Date.parse(frozenAt)),
    "--frozen-at requires an ISO timestamp"
  );
  if (shouldWrite) {
    for (const file of [
      V2_DISCOVERY.manifest,
      V2_DISCOVERY.execution,
      V2_DISCOVERY.analysis,
    ]) {
      assertV4(
        !(await exists(file)),
        `${file} already exists; discovery preregistration is immutable`
      );
    }
  }

  const preparation = await readPreparation();
  const contexts = await verifyPreparedContexts(preparation);
  const bundlePaths = preparation.contexts.map(
    (debate) =>
      `${V2_DISCOVERY.root}/candidate-bundles/debate-${debate.debateNumber}.json`
  );
  const sparsePaths = preparation.contexts.map(
    (debate) =>
      `${V2_DISCOVERY.root}/candidate-context/debate-${debate.debateNumber}.jsonl`
  );
  const sourceFiles = [
    "docs/assessment-production-workflow.md",
    "docs/assessment-production-canary-packet-workflow.md",
    WORKFLOW,
    "docs/assessment-workflow-v4.2.21.17.41.md",
    "docs/reassessment-rubric-v2.1.md",
    preparation.inputs.validationManifest,
    preparation.inputs.selection,
    preparation.inputs.productionManifest,
    preparation.inputs.discoveryManual,
    V2_DISCOVERY.preparation,
    "scripts/lib/v4-lean-production.mjs",
    "scripts/lib/v418-source-integrity.mjs",
    "scripts/lib/v42219-generalized-partition.mjs",
    "scripts/lib/v422112-simplified-discovery.mjs",
    "scripts/validate-v422112-discovery.mjs",
    LIBRARY_PATH,
    PREREGISTER_PATH,
    RUNNER_PATH,
    ANALYZER_PATH,
    TEST_PATH,
    ...preparation.contexts.flatMap((debate) => [
      debate.packet,
      debate.plan,
      debate.fullLedger,
      debate.originalEvents,
      ...debate.chunks.flatMap((chunk) => [
        chunk.chunkLedgerPath,
        chunk.schemaPath,
      ]),
    ]),
  ];
  const sourceHashes = {};
  for (const file of [...new Set(sourceFiles)].sort()) {
    sourceHashes[file] = sha256(await readFile(file));
  }
  const futureOutputs = [
    ...contexts.map((context) => context.rawOutput),
    ...bundlePaths,
    ...sparsePaths,
    V2_DISCOVERY.execution,
    V2_DISCOVERY.analysis,
  ];
  if (shouldWrite) {
    for (const file of futureOutputs) {
      assertV4(!(await exists(file)), `future output already exists: ${file}`);
    }
  }

  const codexCliVersion = execFileSync(CODEX_PATH, ["--version"], {
    encoding: "utf8",
  }).trim();
  const manifest = {
    schemaVersion:
      "1.0-score-stability-v2-fresh-validation-discovery-execution-manifest",
    protocolId: V2_DISCOVERY.protocolId,
    status: V2_DISCOVERY.manifestStatus,
    frozenAt,
    checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    developmentValidationOnly: true,
    productionCanary: false,
    stagingOnly: true,
    AIOnly: true,
    currentCanaryDisposition: structuredClone(
      preparation.currentCanaryDisposition
    ),
    proposedPolicy: {
      version: preparation.proposedPolicy.version,
      promoted: false,
    },
    model: {
      label: preparation.model.label,
      slug: preparation.model.slug,
      reasoningEffort: preparation.model.reasoningEffort,
      authentication: preparation.model.authentication,
    },
    costEstimate: {
      authentication: "ChatGPT subscription",
      meteredApiCostUsdMaximum: 0,
      transcriptionCostUsdMaximum: 0,
      expectedParallelWallMinutes: [16, 32],
      expectedAggregateModelMinutes: [50, 94],
      expectedAggregateComputeHours: [0.83, 1.57],
      absoluteGateTimeoutMinutes: 150,
      estimateBasis:
        "Scaled from the frozen production-canary estimate for 36 equivalent simplified-discovery contexts to 45 contexts.",
    },
    executionEnvironment: {
      codexPath: CODEX_PATH,
      codexCliVersion,
      authentication: "ChatGPT subscription",
      APIKeysRemoved: true,
      isolatedTemporaryCodexHomes: true,
    },
    modelInputs: { manual: preparation.inputs.discoveryManual },
    preparation: V2_DISCOVERY.preparation,
    contexts,
    isolation: {
      freshTemporaryCodexHomePerContext: true,
      freshSourceDirectoryPerContext: true,
      oneChunkPerContext: true,
      otherChunksUnavailable: true,
      otherOutputsUnavailable: true,
      otherDebatesUnavailable: true,
      legacyAssessmentsUnavailable: true,
      priorJudgmentsUnavailable: true,
      ratingsScoresWinnersUnavailable: true,
      tagsAndPublicationProseUnavailable: true,
    },
    executionPolicy: {
      contexts: contexts.length,
      attemptsPerContext: 1,
      retriesMaximum: 0,
      timeoutMsPerContext: 300000,
      absoluteGateTimeoutMs: 9000000,
      maximumParallelContexts: 4,
      schedulerRamp: [1, 2, 4],
      rampOneServesAsOperationalCanary: true,
      eachRampPhaseMustPassBeforeExpansion: true,
      abortBeforeNextRampPhaseOnFailure: true,
      continueIndependentSteadyStateContextsAfterFailure: true,
      deterministicInputOrder: true,
      authentication: "ChatGPT subscription",
      APIKeysRemoved: true,
      removedEnvironmentVariables: [...REMOVED_API_ENVIRONMENT_VARIABLES],
      meteredApiCostUsdMaximum: 0,
      transcriptionCostUsdMaximum: 0,
    },
    compilationPolicy: {
      allContextsMustValidate: true,
      allDiscoveredCandidatesTransported: true,
      silentSemanticDeduplication: false,
      repositoryDerivedMoveKindOnly: true,
      localTargetIdsAbsent: true,
      selectedTargetTopologyDeferredToInventoryLock: true,
      sparseContextFlankEvents: 12,
      sparseSourceRowsMayDeduplicate: true,
      candidateMinimumPerDebate: 8,
      candidateMinimumPerSide: 4,
      scoresDerived: false,
    },
    schemaHardening: {
      candidateStartOwnedCoreBounds: true,
      candidateEndAvailableContextBounds: true,
      frozenDyadicSpeakerAllowlist: true,
      deterministicValidatorRetained: true,
      stagingOnlyCalibrationFlagRequired: true,
    },
    stopRules: structuredClone(preparation.stopRules),
    authorization: {
      modelContexts: true,
      deterministicValidation: true,
      deterministicCandidateCompilation: true,
      analysis: true,
      retry: false,
      semanticCorrection: false,
      inventoryPacketPreparation: false,
      inventoryModelExecution: false,
      independentJudgmentModelExecution: false,
      paidTranscription: false,
      audioVerification: false,
      adjudicationModelExecution: false,
      scoreDerivation: false,
      policyPromotion: false,
      publicationPreparation: false,
      productionMutation: false,
      remainingProductionBatches: false,
    },
    artifacts: {
      execution: V2_DISCOVERY.execution,
      analysis: V2_DISCOVERY.analysis,
      candidateBundles: bundlePaths,
      sparseContexts: sparsePaths,
      rawOutputs: contexts.map((context) => context.rawOutput),
    },
    futureOutputPathsExcludedFromSourceHashes: futureOutputs,
    sourceHashes,
  };

  if (shouldWrite) {
    await mkdir(V2_DISCOVERY.root, { recursive: true });
    await writeFile(V2_DISCOVERY.manifest, jsonBytes(manifest));
  }
  const summary = {
    status: shouldWrite ? "frozen" : "preview",
    debates: preparation.contexts.map((debate) => debate.debateNumber),
    contexts: contexts.length,
    maximumParallelContexts: manifest.executionPolicy.maximumParallelContexts,
    schedulerRamp: manifest.executionPolicy.schedulerRamp,
    rampOneServesAsOperationalCanary: true,
    attemptsMaximum: contexts.length,
    retriesMaximum: 0,
    expectedParallelWallMinutes: manifest.costEstimate.expectedParallelWallMinutes,
    expectedAggregateComputeHours:
      manifest.costEstimate.expectedAggregateComputeHours,
    authentication: manifest.costEstimate.authentication,
    meteredApiCostUsdMaximum: 0,
    transcriptionCostUsdMaximum: 0,
    currentCanaryStillFailed: true,
    proposedPolicyPromoted: false,
    modelContextsExecuted: 0,
    scoresDerived: 0,
    productionMutationAuthorized: false,
  };
  console.log(JSON.stringify(summary, null, 2));
  return { manifest, summary };
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

async function readAuthorizedManifest() {
  const manifest = JSON.parse(await readFile(V2_DISCOVERY.manifest, "utf8"));
  assertV4(
    manifest.status === V2_DISCOVERY.manifestStatus &&
      manifest.developmentValidationOnly === true &&
      manifest.productionCanary === false &&
      manifest.stagingOnly === true &&
      manifest.currentCanaryDisposition?.reclassified === false &&
      manifest.proposedPolicy?.promoted === false &&
      manifest.authorization?.modelContexts === true &&
      manifest.contexts.length === V2_DISCOVERY.contexts &&
      manifest.executionPolicy?.maximumParallelContexts === 4 &&
      JSON.stringify(manifest.executionPolicy?.schedulerRamp) ===
        JSON.stringify([1, 2, 4]) &&
      manifest.executionPolicy?.rampOneServesAsOperationalCanary === true &&
      manifest.executionPolicy?.retriesMaximum === 0,
    "v2 validation discovery execution is unauthorized"
  );
  assertV4(
    manifest.model?.label === "5.6 Sol" &&
      manifest.model?.slug === "gpt-5.6-sol" &&
      manifest.model?.reasoningEffort === "low" &&
      manifest.model?.authentication === "ChatGPT subscription",
    "frozen discovery model boundary changed"
  );
  await verifyHashes(manifest.sourceHashes, "manifest source");
  return manifest;
}

export async function runV2Discovery() {
  const manifest = await readAuthorizedManifest();
  const codex = manifest.executionEnvironment.codexPath;
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  assertV4(
    execFileSync(codex, ["--version"], { encoding: "utf8" }).trim() ===
      manifest.executionEnvironment.codexCliVersion,
    "the frozen Codex CLI version changed"
  );
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
    assertV4(!(await exists(future)), `future output already exists: ${future}`);
  }
  await access(codex);
  await access(authSource);

  const preparation = JSON.parse(await readFile(manifest.preparation, "utf8"));
  let activeContexts = 0;
  let maximumParallelContextsObserved = 0;
  const gateStartedAt = new Date().toISOString();
  const gateStarted = Date.now();
  const gateDeadline = gateStarted + manifest.executionPolicy.absoluteGateTimeoutMs;

  async function executeContext(context, contextIndex) {
    const debate = preparation.contexts.find(
      (item) => item.debateNumber === context.debateNumber
    );
    const chunk = debate.chunks.find((item) => item.chunkId === context.chunkId);
    validateV42219ChunkLedger(
      await readFile(context.chunkLedgerPath),
      await readFile(context.fullLedger),
      chunk
    );
    const remainingGateMs = gateDeadline - Date.now();
    assertV4(
      remainingGateMs > 0,
      "absolute discovery gate timeout reached before context launch"
    );
    const contextTimeoutMs = Math.min(
      manifest.executionPolicy.timeoutMsPerContext,
      remainingGateMs
    );
    const temporary = await mkdtemp(
      path.join(
        os.tmpdir(),
        `slugfester-v2-validation-discovery-${context.debateNumber}-${context.chunkId}-`
      )
    );
    const isolatedCodexHome = await mkdtemp(
      path.join(
        os.tmpdir(),
        `slugfester-v2-validation-discovery-home-${context.debateNumber}-${context.chunkId}-`
      )
    );
    const startedAt = new Date().toISOString();
    const started = Date.now();
    activeContexts += 1;
    maximumParallelContextsObserved = Math.max(
      maximumParallelContextsObserved,
      activeContexts
    );
    let record;
    try {
      for (const [source, target] of [
        [manifest.modelInputs.manual, "manual.md"],
        [context.packet, "packet.json"],
        [context.schemaPath, "schema.json"],
        [context.chunkLedgerPath, "chunk-ledger.jsonl"],
      ]) {
        await copyFile(source, path.join(temporary, target));
      }
      await copyFile(authSource, path.join(isolatedCodexHome, "auth.json"));
      const env = { ...process.env, CODEX_HOME: isolatedCodexHome };
      for (const key of manifest.executionPolicy.removedEnvironmentVariables) {
        delete env[key];
      }
      const prompt = `Read manual.md, packet.json, schema.json, and every line of chunk-ledger.jsonl; read nothing else. Act only as the isolated simplified score-blind source-discovery reviewer for development-validation Debate ${context.debateNumber}, ${context.chunkId}. The owned core is events ${context.coreStartEvent} through ${context.coreEndEvent}; boundary context is events ${context.contextStartEvent} through ${context.contextEndEvent}. Review the entire context. Emit zero to ten chronological load-bearing candidates whose start event lies inside the core. For every reply, describe the earlier contrary position it addresses; never emit target IDs, moveKind, evidence text, ratings, scores, sections, a winner, tags, Overall Commentary, AI Extension, policy analysis, or assessment/publication prose. Return exactly one schema-conforming JSON object.`;
      process.stdout.write(
        `[v2-validation-discovery] starting ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber} ${context.chunkId}\n`
      );
      const invocation = await runChild(
        codex,
        [
          "exec",
          "--ephemeral",
          "--skip-git-repo-check",
          "--ignore-user-config",
          "--ignore-rules",
          "--model",
          manifest.model.slug,
          "-c",
          `model_reasoning_effort="${manifest.model.reasoningEffort}"`,
          "--disable",
          "plugins",
          "--disable",
          "remote_plugin",
          "--disable",
          "skill_search",
          "--disable",
          "apps",
          "--disable",
          "memories",
          "--disable",
          "multi_agent",
          "--disable",
          "browser_use",
          "--disable",
          "computer_use",
          "--disable",
          "workspace_dependencies",
          "--sandbox",
          "read-only",
          "--color",
          "never",
          "--output-schema",
          "schema.json",
          "--output-last-message",
          "result.json",
          prompt,
        ],
        { cwd: temporary, env },
        contextTimeoutMs
      );
      const resultPath = path.join(temporary, "result.json");
      const resultExists = await exists(resultPath);
      const base = {
        contextIndex,
        debateNumber: context.debateNumber,
        chunkId: context.chunkId,
        model: manifest.model.label,
        modelSlug: manifest.model.slug,
        reasoningEffort: manifest.model.reasoningEffort,
        attemptCount: 1,
        retryCount: 0,
        startedAt,
        completedAt: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        timeoutMsApplied: contextTimeoutMs,
        timedOut: invocation.timedOut,
        commandExitCode: invocation.code,
        terminationSignal: invocation.signal,
        authentication: "ChatGPT subscription",
        apiKeysRemoved: true,
        meteredApiCostUsd: 0,
        transcriptionCostUsd: 0,
        stdoutSha256: sha256(invocation.stdout),
        stderrSha256: sha256(invocation.stderr),
      };
      if (
        invocation.timedOut ||
        invocation.code !== 0 ||
        invocation.signal !== null ||
        !resultExists
      ) {
        record = {
          ...base,
          status: invocation.timedOut
            ? "timed-out"
            : !resultExists
              ? "result-missing"
              : "transport-failed",
          accepted: false,
          rawOutputWritten: false,
          stdoutTail: invocation.stdout.slice(-12000),
          stderrTail: invocation.stderr.slice(-12000),
        };
      } else {
        await mkdir(path.dirname(context.rawOutput), { recursive: true });
        await copyFile(resultPath, context.rawOutput);
        const validation = await runChild(
          process.execPath,
          [
            "scripts/validate-v422112-discovery.mjs",
            context.rawOutput,
            manifest.preparation,
            context.debateNumber,
            context.chunkId,
          ],
          { cwd: process.cwd(), env: process.env },
          120000
        );
        const valid =
          validation.code === 0 &&
          validation.signal === null &&
          !validation.timedOut;
        record = {
          ...base,
          status: valid ? "completed-valid" : "output-validation-failed",
          accepted: valid,
          rawOutputWritten: true,
          rawOutputSha256: sha256(await readFile(context.rawOutput)),
          validationSummary: valid ? JSON.parse(validation.stdout) : null,
          validationMessage: valid
            ? null
            : `${validation.stdout}\n${validation.stderr}`.trim().slice(-6000),
          stdoutTail: valid ? null : invocation.stdout.slice(-12000),
          stderrTail: valid ? null : invocation.stderr.slice(-12000),
          validationStdoutTail: valid
            ? null
            : validation.stdout.slice(-12000),
          validationStderrTail: valid
            ? null
            : validation.stderr.slice(-12000),
        };
      }
    } finally {
      activeContexts -= 1;
      await rm(temporary, { recursive: true, force: true });
      await rm(isolatedCodexHome, { recursive: true, force: true });
    }
    process.stdout.write(
      `[v2-validation-discovery] Debate ${context.debateNumber} ${context.chunkId} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`
    );
    return record;
  }

  const resultsByIndex = new Array(manifest.contexts.length);
  const rampPhases = [];
  async function runFixedIndexes(indexes, maximumParallelContexts, phase) {
    const startedAt = new Date().toISOString();
    let cursor = 0;
    async function worker() {
      while (cursor < indexes.length) {
        const position = cursor;
        cursor += 1;
        const contextIndex = indexes[position];
        resultsByIndex[contextIndex] = await executeContext(
          manifest.contexts[contextIndex],
          contextIndex
        );
      }
    }
    await Promise.all(
      Array.from(
        { length: Math.min(maximumParallelContexts, indexes.length) },
        () => worker()
      )
    );
    const phaseResults = indexes.map((index) => resultsByIndex[index]);
    const passed = phaseResults.every((result) => result.accepted);
    rampPhases.push({
      phase,
      maximumParallelContexts,
      contextIndexes: indexes,
      startedAt,
      completedAt: new Date().toISOString(),
      passed,
    });
    return passed;
  }

  let rampPassed = await runFixedIndexes([0], 1, "operational-canary-one");
  if (rampPassed) {
    rampPassed = await runFixedIndexes([1, 2], 2, "ramp-two");
  }
  if (rampPassed) {
    await runFixedIndexes(
      Array.from(
        { length: manifest.contexts.length - 3 },
        (_, index) => index + 3
      ),
      4,
      "steady-four"
    );
  }

  const results = resultsByIndex.filter(Boolean);
  const validContexts = results.filter((result) => result.accepted).length;
  const execution = {
    schemaVersion:
      "1.0-score-stability-v2-fresh-validation-discovery-model-execution",
    protocolId: manifest.protocolId,
    status:
      validContexts === manifest.contexts.length
        ? V2_DISCOVERY.executionPassedStatus
        : V2_DISCOVERY.executionFailedStatus,
    developmentValidationOnly: true,
    productionCanary: false,
    stagingOnly: true,
    gateStartedAt,
    gateCompletedAt: new Date().toISOString(),
    contextsPlanned: manifest.contexts.length,
    contextsAttempted: results.length,
    contextsUnattempted: manifest.contexts.length - results.length,
    validContexts,
    invalidContexts: results.length - validContexts,
    attempts: results.length,
    retries: 0,
    parallelismMaximumAllowed:
      manifest.executionPolicy.maximumParallelContexts,
    maximumParallelContextsObserved,
    schedulerRamp: manifest.executionPolicy.schedulerRamp,
    rampPhases,
    rampPassed,
    wallElapsedMs: Date.now() - gateStarted,
    modelWorkElapsedMs: results.reduce(
      (sum, result) => sum + result.elapsedMs,
      0
    ),
    results,
    authentication: "ChatGPT subscription",
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    currentCanaryReclassified: false,
    proposedPolicyPromoted: false,
    authorization: {
      deterministicAnalysis: true,
      retry: false,
      semanticCorrection: false,
      inventoryPacketPreparation: false,
      inventoryModelExecution: false,
      scoreDerivation: false,
      policyPromotion: false,
      productionMutation: false,
    },
  };
  await writeFile(manifest.artifacts.execution, jsonBytes(execution));
  console.log(
    JSON.stringify(
      {
        status: execution.status,
        contextsAttempted: results.length,
        validContexts,
        invalidContexts: execution.invalidContexts,
        wallElapsedMinutes: Number(
          (execution.wallElapsedMs / 60000).toFixed(2)
        ),
        aggregateModelMinutes: Number(
          (execution.modelWorkElapsedMs / 60000).toFixed(2)
        ),
        maximumParallelContextsObserved,
        retries: 0,
        authentication: execution.authentication,
        meteredApiCostUsd: 0,
        transcriptionCostUsd: 0,
        scoresDerived: 0,
      },
      null,
      2
    )
  );
  return execution;
}

export async function analyzeV2Discovery({ shouldWrite }) {
  const manifest = await readAuthorizedManifest();
  const execution = JSON.parse(
    await readFile(manifest.artifacts.execution, "utf8")
  );
  assertV4(
    execution.status === V2_DISCOVERY.executionPassedStatus &&
      execution.validContexts === manifest.contexts.length &&
      execution.invalidContexts === 0 &&
      execution.retries === 0 &&
      execution.rampPassed === true &&
      execution.maximumParallelContextsObserved <=
        manifest.executionPolicy.maximumParallelContexts,
    "all v2 validation discovery contexts must pass without retry before analysis"
  );
  const preparation = JSON.parse(await readFile(manifest.preparation, "utf8"));
  const debates = [];
  for (const debate of preparation.contexts) {
    const [packetBytes, planBytes, eventsBytes, fullLedgerBytes] =
      await Promise.all([
        readFile(debate.packet),
        readFile(debate.plan),
        readFile(debate.originalEvents),
        readFile(debate.fullLedger),
      ]);
    const packet = JSON.parse(packetBytes);
    const plan = JSON.parse(planBytes);
    const eventsDocument = JSON.parse(eventsBytes);
    const outputs = [];
    for (const chunk of debate.chunks) {
      const [outputBytes, chunkBytes] = await Promise.all([
        readFile(chunk.rawOutput),
        readFile(chunk.chunkLedgerPath),
      ]);
      const output = JSON.parse(outputBytes);
      validateV422112Discovery(output, {
        packet,
        chunk,
        plan,
        eventsDocument,
        eventsBytes,
        chunkBytes,
        fullLedgerBytes,
      });
      outputs.push(output);
    }
    const bundle = compileV422112CandidateBundle({ packet, plan, outputs });
    const pro = bundle.candidates.filter(
      (candidate) => candidate.side === "pro"
    ).length;
    const con = bundle.candidates.filter(
      (candidate) => candidate.side === "con"
    ).length;
    assertV4(
      bundle.candidateCount >=
        manifest.compilationPolicy.candidateMinimumPerDebate &&
        pro >= manifest.compilationPolicy.candidateMinimumPerSide &&
        con >= manifest.compilationPolicy.candidateMinimumPerSide,
      `${debate.debateNumber}: discovery inventory is insufficient for inventory locking`
    );
    const rows = parseV42219Ledger(fullLedgerBytes);
    const included = new Set();
    for (const candidate of bundle.candidates) {
      for (
        let event = Math.max(
          0,
          candidate.sourceSpan.startEvent -
            manifest.compilationPolicy.sparseContextFlankEvents
        );
        event <=
        Math.min(
          rows.length - 1,
          candidate.sourceSpan.endEvent +
            manifest.compilationPolicy.sparseContextFlankEvents
        );
        event += 1
      ) {
        included.add(event);
      }
    }
    const sparseRows = [...included]
      .sort((left, right) => left - right)
      .map((event) => rows[event]);
    const sparseBytes = serializeV42219Rows(sparseRows);
    const bundlePath = `${V2_DISCOVERY.root}/candidate-bundles/debate-${debate.debateNumber}.json`;
    const sparsePath = `${V2_DISCOVERY.root}/candidate-context/debate-${debate.debateNumber}.jsonl`;
    const bundleBytes = jsonBytes(bundle);
    if (shouldWrite) {
      await mkdir(path.dirname(bundlePath), { recursive: true });
      await mkdir(path.dirname(sparsePath), { recursive: true });
      await writeFile(bundlePath, bundleBytes);
      await writeFile(sparsePath, sparseBytes);
    }
    const executionRows = execution.results.filter(
      (result) => result.debateNumber === debate.debateNumber
    );
    const mediumAttributionCandidates = bundle.candidates.filter(
      (candidate) => candidate.attributionConfidence === "medium"
    ).length;
    const lowAttributionCandidates = bundle.candidates.filter(
      (candidate) => candidate.attributionConfidence === "low"
    ).length;
    debates.push({
      debateNumber: debate.debateNumber,
      debateId: debate.debateId,
      family: debate.family,
      sourceComplexityBand: debate.sourceComplexityBand,
      chunks: debate.chunks.length,
      candidates: bundle.candidateCount,
      pro,
      con,
      constructive: bundle.candidates.filter(
        (candidate) => candidate.moveKind === "constructive"
      ).length,
      reply: bundle.candidates.filter(
        (candidate) => candidate.moveKind === "reply"
      ).length,
      mediumAttributionCandidates,
      lowAttributionCandidates,
      belowHighAttributionCandidates:
        mediumAttributionCandidates + lowAttributionCandidates,
      selectedBelowHighCandidatesRequireLaterAudioVerification: true,
      bundlePath,
      bundleSha256: sha256(bundleBytes),
      sparsePath,
      sparseEvents: sparseRows.length,
      sparseBytes: sparseBytes.length,
      sparseSha256: sha256(sparseBytes),
      candidateSpansIncluded: bundle.candidates.every((candidate) => {
        for (
          let event = candidate.sourceSpan.startEvent;
          event <= candidate.sourceSpan.endEvent;
          event += 1
        ) {
          if (!included.has(event)) return false;
        }
        return true;
      }),
      allDiscoveredCandidatesTransported: true,
      localTargetIdsModelAuthored: false,
      semanticDeduplicationPerformed: false,
      modelWorkElapsedMs: executionRows.reduce(
        (sum, result) => sum + result.elapsedMs,
        0
      ),
    });
  }
  const analysis = {
    schemaVersion:
      "1.0-score-stability-v2-fresh-validation-discovery-analysis",
    protocolId: manifest.protocolId,
    status: V2_DISCOVERY.analysisStatus,
    developmentValidationOnly: true,
    productionCanary: false,
    stagingOnly: true,
    AIOnly: true,
    currentCanaryDisposition: structuredClone(
      manifest.currentCanaryDisposition
    ),
    proposedPolicy: { ...manifest.proposedPolicy, promoted: false },
    debates,
    audit: {
      frozenContexts: manifest.contexts.length,
      validContexts: execution.validContexts,
      invalidContexts: execution.invalidContexts,
      retries: execution.retries,
      rampOneServedAsOperationalCanary: true,
      schedulerRamp: execution.schedulerRamp,
      rampPhases: execution.rampPhases,
      rampPassed: execution.rampPassed,
      maximumParallelContextsAllowed:
        manifest.executionPolicy.maximumParallelContexts,
      maximumParallelContextsObserved:
        execution.maximumParallelContextsObserved,
      candidateStartOwnedCoreBounds:
        manifest.schemaHardening.candidateStartOwnedCoreBounds,
      candidateEndAvailableContextBounds:
        manifest.schemaHardening.candidateEndAvailableContextBounds,
      frozenDyadicSpeakerAllowlist:
        manifest.schemaHardening.frozenDyadicSpeakerAllowlist,
      everySourceEventOwnedExactlyOnce: true,
      exactChunkReplay: true,
      localTargetIdsModelAuthored: false,
      targetTopologyDeferredToInventoryLock: true,
      repositoryDerivedMoveKind: true,
      allDiscoveredCandidatesTransported: true,
      silentSemanticDeduplication: false,
      candidateBundlesInventoryFeasible: true,
      currentCanaryReclassified: false,
      proposedPolicyPromoted: false,
      scoresDerived: 0,
    },
    totals: {
      debates: debates.length,
      candidates: debates.reduce((sum, debate) => sum + debate.candidates, 0),
      pro: debates.reduce((sum, debate) => sum + debate.pro, 0),
      con: debates.reduce((sum, debate) => sum + debate.con, 0),
      belowHighAttributionCandidates: debates.reduce(
        (sum, debate) => sum + debate.belowHighAttributionCandidates,
        0
      ),
      sparseEvents: debates.reduce(
        (sum, debate) => sum + debate.sparseEvents,
        0
      ),
      wallElapsedMs: execution.wallElapsedMs,
      modelWorkElapsedMs: execution.modelWorkElapsedMs,
      modelContextsExecuted: execution.contextsAttempted,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
      scoresDerived: 0,
    },
    authorization: {
      inventoryPacketPreparation: true,
      inventoryExecutionManifest: false,
      inventoryModelExecution: false,
      independentJudgmentModelExecution: false,
      paidTranscription: false,
      audioVerification: false,
      adjudicationModelExecution: false,
      scoreDerivation: false,
      policyPromotion: false,
      publicationPreparation: false,
      productionMutation: false,
      remainingProductionBatches: false,
    },
  };
  if (shouldWrite) {
    await writeFile(manifest.artifacts.analysis, jsonBytes(analysis));
  }
  console.log(
    JSON.stringify(
      {
        status: analysis.status,
        debates,
        totals: analysis.totals,
        inventoryPacketPreparationAuthorized: true,
        inventoryModelExecutionAuthorized: false,
        currentCanaryStillFailed: true,
        proposedPolicyPromoted: false,
        scoresDerived: 0,
        productionMutationAuthorized: false,
      },
      null,
      2
    )
  );
  return analysis;
}

export async function testV2Discovery() {
  const preparation = await readPreparation();
  await verifyPreparedContexts(preparation);
  if (!(await exists(V2_DISCOVERY.manifest))) {
    const summary = {
      status: "passed-prefreeze",
      debates: V2_DISCOVERY.debates,
      contexts: V2_DISCOVERY.contexts,
      ownershipBoundedSchemas: V2_DISCOVERY.contexts,
      speakerAllowlistedSchemas: V2_DISCOVERY.contexts,
      currentCanaryStillFailed: true,
      proposedPolicyPromoted: false,
      modelContexts: 0,
      scoresDerived: 0,
      productionMutation: false,
    };
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }
  const manifest = await readAuthorizedManifest();
  assertV4(
    manifest.costEstimate?.authentication === "ChatGPT subscription" &&
      manifest.costEstimate?.meteredApiCostUsdMaximum === 0 &&
      manifest.costEstimate?.transcriptionCostUsdMaximum === 0,
    "cost or authentication boundary drifted"
  );
  assertV4(
    manifest.executionPolicy?.timeoutMsPerContext === 300000 &&
      manifest.executionPolicy?.absoluteGateTimeoutMs === 9000000 &&
      manifest.executionPolicy?.retriesMaximum === 0 &&
      manifest.authorization?.retry === false,
    "timeout or retry boundary drifted"
  );
  assertV4(
    manifest.compilationPolicy?.allDiscoveredCandidatesTransported === true &&
      manifest.compilationPolicy?.silentSemanticDeduplication === false &&
      manifest.compilationPolicy?.selectedTargetTopologyDeferredToInventoryLock ===
        true,
    "candidate compilation boundary drifted"
  );
  assertV4(
    manifest.schemaHardening?.candidateStartOwnedCoreBounds === true &&
      manifest.schemaHardening?.candidateEndAvailableContextBounds === true &&
      manifest.schemaHardening?.frozenDyadicSpeakerAllowlist === true &&
      manifest.schemaHardening?.stagingOnlyCalibrationFlagRequired === true,
    "schema-hardening boundary drifted"
  );
  for (const key of [
    "inventoryModelExecution",
    "independentJudgmentModelExecution",
    "paidTranscription",
    "audioVerification",
    "adjudicationModelExecution",
    "scoreDerivation",
    "policyPromotion",
    "publicationPreparation",
    "productionMutation",
    "remainingProductionBatches",
  ]) {
    assertV4(
      manifest.authorization[key] === false,
      `${key}: premature downstream authorization`
    );
  }
  if (!(await exists(manifest.artifacts.execution))) {
    for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
      assertV4(
        !(await exists(future)),
        `future output exists before discovery execution: ${future}`
      );
    }
    const summary = {
      status: "passed-frozen",
      debates: V2_DISCOVERY.debates,
      contexts: V2_DISCOVERY.contexts,
      schedulerRamp: [1, 2, 4],
      maximumParallelContexts: 4,
      operationalCanary: "first-real-context",
      expectedParallelWallMinutes:
        manifest.costEstimate.expectedParallelWallMinutes,
      expectedAggregateComputeHours:
        manifest.costEstimate.expectedAggregateComputeHours,
      authentication: manifest.costEstimate.authentication,
      currentCanaryStillFailed: true,
      proposedPolicyPromoted: false,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      productionMutation: false,
    };
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }

  const execution = JSON.parse(
    await readFile(manifest.artifacts.execution, "utf8")
  );
  assertV4(
    execution.contextsPlanned === V2_DISCOVERY.contexts &&
      execution.contextsAttempted >= 1 &&
      execution.contextsAttempted <= V2_DISCOVERY.contexts &&
      execution.contextsUnattempted ===
        V2_DISCOVERY.contexts - execution.contextsAttempted &&
      execution.attempts === execution.contextsAttempted &&
      execution.retries === 0,
    "execution attempt ledger drifted"
  );
  assertV4(
    execution.maximumParallelContextsObserved <= 4 &&
      JSON.stringify(execution.schedulerRamp) === JSON.stringify([1, 2, 4]) &&
      execution.rampPhases.length >= 1 &&
      execution.rampPhases.length <= 3,
    "executed scheduler ramp drifted"
  );
  assertV4(
    execution.rampPhases[0].phase === "operational-canary-one" &&
      JSON.stringify(execution.rampPhases[0].contextIndexes) ===
        JSON.stringify([0]),
    "operational canary phase drifted"
  );
  for (const result of execution.results) {
    assertV4(
      result.attemptCount === 1 && result.retryCount === 0,
      `${result.debateNumber}/${result.chunkId}: retry ledger drifted`
    );
    if (result.rawOutputWritten) {
      assertV4(
        result.rawOutputSha256 ===
          sha256(
            await readFile(manifest.contexts[result.contextIndex].rawOutput)
          ),
        `${result.debateNumber}/${result.chunkId}: raw output hash drifted`
      );
    }
  }
  if (execution.status !== V2_DISCOVERY.executionPassedStatus) {
    assertV4(
      execution.invalidContexts >= 1,
      "failed execution must record an invalid context"
    );
    if (!execution.rampPhases[0].passed) {
      assertV4(
        execution.contextsAttempted === 1 &&
          execution.contextsUnattempted === V2_DISCOVERY.contexts - 1,
        "operational-canary failure did not abort expansion"
      );
    }
    if (
      execution.rampPhases[0].passed &&
      execution.rampPhases[1] &&
      !execution.rampPhases[1].passed
    ) {
      assertV4(
        execution.contextsAttempted === 3 &&
          execution.contextsUnattempted === V2_DISCOVERY.contexts - 3,
        "ramp-two failure did not abort expansion"
      );
    }
    const summary = {
      status: "passed-recorded-failure",
      contextsAttempted: execution.contextsAttempted,
      contextsUnattempted: execution.contextsUnattempted,
      validContexts: execution.validContexts,
      invalidContexts: execution.invalidContexts,
      retries: 0,
      scoresDerived: 0,
      productionMutation: false,
    };
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }
  assertV4(
    execution.contextsAttempted === V2_DISCOVERY.contexts &&
      execution.contextsUnattempted === 0 &&
      execution.validContexts === V2_DISCOVERY.contexts &&
      execution.invalidContexts === 0 &&
      execution.rampPassed &&
      execution.rampPhases.length === 3 &&
      execution.rampPhases.every((phase) => phase.passed) &&
      execution.maximumParallelContextsObserved === 4,
    "passing execution coverage or ramp drifted"
  );
  if (!(await exists(manifest.artifacts.analysis))) {
    const summary = {
      status: "passed-execution",
      validContexts: V2_DISCOVERY.contexts,
      retries: 0,
      wallElapsedMinutes: Number(
        (execution.wallElapsedMs / 60000).toFixed(2)
      ),
      aggregateModelMinutes: Number(
        (execution.modelWorkElapsedMs / 60000).toFixed(2)
      ),
      scoresDerived: 0,
      productionMutation: false,
    };
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }
  const analysis = JSON.parse(
    await readFile(manifest.artifacts.analysis, "utf8")
  );
  assertV4(
    analysis.status === V2_DISCOVERY.analysisStatus &&
      analysis.debates.length === V2_DISCOVERY.debates &&
      analysis.audit.allDiscoveredCandidatesTransported &&
      analysis.audit.rampPassed &&
      analysis.audit.rampOneServedAsOperationalCanary &&
      analysis.audit.currentCanaryReclassified === false &&
      analysis.audit.proposedPolicyPromoted === false,
    "discovery analysis audit drifted"
  );
  assertV4(
    analysis.debates.every(
      (debate) =>
        debate.candidates >= 8 &&
        debate.pro >= 4 &&
        debate.con >= 4 &&
        debate.candidateSpansIncluded
    ),
    "candidate sufficiency drifted"
  );
  assertV4(
    analysis.authorization.inventoryPacketPreparation &&
      !analysis.authorization.inventoryModelExecution &&
      !analysis.authorization.scoreDerivation &&
      !analysis.authorization.policyPromotion &&
      !analysis.authorization.productionMutation,
    "analysis authorization drifted"
  );
  const summary = {
    status: "passed-complete",
    debates: analysis.totals.debates,
    contexts: analysis.totals.modelContextsExecuted,
    candidates: analysis.totals.candidates,
    belowHighAttributionCandidates:
      analysis.totals.belowHighAttributionCandidates,
    wallElapsedMinutes: Number(
      (analysis.totals.wallElapsedMs / 60000).toFixed(2)
    ),
    aggregateModelMinutes: Number(
      (analysis.totals.modelWorkElapsedMs / 60000).toFixed(2)
    ),
    retries: 0,
    scoresDerived: 0,
    productionMutation: false,
  };
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}
