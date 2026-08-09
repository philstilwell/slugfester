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
  auditDecomposedStrictSchema,
  buildDecomposedInventorySelectionSchema,
  candidateTransportCanonicalSha256,
  compileDecomposedInventory,
  inventoryPlanSha256,
  validateDecomposedInventoryPlan,
  validateDecomposedInventorySelection,
} from "./assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";

export const V2_DECOMPOSED_INVENTORY = Object.freeze({
  validationRoot:
    "docs/assessment-production/score-stability-v2-validation-cohort",
  root:
    "docs/assessment-production/score-stability-v2-validation-cohort/inventory-decomposed-plan-selection-successor",
  preparation:
    "docs/assessment-production/score-stability-v2-validation-cohort/inventory-decomposed-plan-selection-successor/preparation-manifest.json",
  manifest:
    "docs/assessment-production/score-stability-v2-validation-cohort/inventory-decomposed-plan-selection-successor/execution-manifest.json",
  planExecution:
    "docs/assessment-production/score-stability-v2-validation-cohort/inventory-decomposed-plan-selection-successor/plan-model-execution.json",
  selectionExecution:
    "docs/assessment-production/score-stability-v2-validation-cohort/inventory-decomposed-plan-selection-successor/selection-model-execution.json",
  execution:
    "docs/assessment-production/score-stability-v2-validation-cohort/inventory-decomposed-plan-selection-successor/model-execution.json",
  analysis:
    "docs/assessment-production/score-stability-v2-validation-cohort/inventory-decomposed-plan-selection-successor/analysis.json",
  manifestStatus:
    "frozen-ten-fresh-decomposed-plan-selection-v2-validation-score-blind-inventory-successor-stage-contexts-authorized",
  executionPassedStatus:
    "twenty-fresh-decomposed-plan-selection-v2-validation-score-blind-inventory-stage-contexts-passed",
  executionFailedStatus:
    "v2-validation-score-blind-inventory-decomposed-plan-selection-successor-complete-with-failure",
  analysisStatus:
    "ten-fresh-decomposed-plan-selection-v2-validation-score-blind-inventories-passed-independent-judgment-packet-preparation-authorized",
  contextsPerStage: 10,
  stageContexts: 20,
  candidates: 406,
});

const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const REMOVED_API_ENVIRONMENT_VARIABLES = Object.freeze([
  "OPENAI_API_KEY",
  "OPENAI_ORG_ID",
  "OPENAI_PROJECT_ID",
  "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "CODEX_API_KEY",
]);
const STAGE_LIBRARY_PATH =
  "scripts/lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection-successor-stage.mjs";
const DECOMPOSED_LIBRARY_PATH =
  "scripts/lib/assessment-production-score-stability-v2-inventory-decomposed-plan-selection.mjs";
const PREREGISTER_PATH =
  "scripts/preregister-assessment-production-score-stability-v2-inventory-decomposed-plan-selection-successor.mjs";
const RUNNER_PATH =
  "scripts/run-assessment-production-score-stability-v2-inventory-decomposed-plan-selection-successor.mjs";
const ANALYZER_PATH =
  "scripts/analyze-assessment-production-score-stability-v2-inventory-decomposed-plan-selection-successor.mjs";
const VALIDATOR_PATH =
  "scripts/validate-assessment-production-score-stability-v2-inventory-decomposed-plan-selection-successor.mjs";
const TEST_PATH =
  "scripts/test-assessment-production-score-stability-v2-inventory-decomposed-plan-selection-successor-gate.mjs";
const PREPARATION_TEST_PATH =
  "scripts/test-assessment-production-score-stability-v2-inventory-decomposed-plan-selection-successor-preparation.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const compactJsonBytes = (value) => Buffer.from(`${JSON.stringify(value)}\n`);
const exists = (file) => access(file).then(() => true, () => false);

async function verifyHashes(hashes, label) {
  for (const [file, digest] of Object.entries(hashes)) {
    assertV4(sha256(await readFile(file)) === digest, `${label} hash mismatch: ${file}`);
  }
}

async function readPreparation() {
  const preparation = JSON.parse(
    await readFile(V2_DECOMPOSED_INVENTORY.preparation, "utf8")
  );
  assertV4(
    preparation.status ===
        "ten-fresh-decomposed-plan-selection-v2-validation-inventory-contexts-prepared" &&
      preparation.contexts?.length === V2_DECOMPOSED_INVENTORY.contextsPerStage &&
      preparation.totals?.stageContextsPlanned ===
        V2_DECOMPOSED_INVENTORY.stageContexts &&
      preparation.totals?.candidates === V2_DECOMPOSED_INVENTORY.candidates &&
      preparation.totals?.modelContextsExecuted === 0 &&
      preparation.currentCanaryDisposition?.reclassified === false &&
      preparation.proposedPolicy?.promoted === false &&
      preparation.failedGateDisposition?.allFourAcceptedAsPassed === false &&
      preparation.failedGateDisposition
        ?.sidePartitionedSelectionSuccessorGatePreservedFailed === true &&
      preparation.isolation?.twentyFreshStageContextsRequired === true &&
      preparation.isolation?.freshTemporaryCodexHomePerStageContext === true &&
      preparation.decomposedTopology
        ?.actualSelectionSchemaGeneratedOnlyAfterValidPlan === true &&
      preparation.decomposedTopology
        ?.developmentSelectionSchemaPrototypesAreNotExecutionInputs === true &&
      preparation.executionDesign?.allPlansMustPassBeforeSelectionStageBegins ===
        true &&
      preparation.executionDesign?.attemptsPerStageContext === 1 &&
      preparation.executionDesign?.retriesMaximum === 0 &&
      preparation.executionDesign?.timeoutMsPerStageContext === 600000 &&
      preparation.executionDesign?.timeoutExtensionApplied === false &&
      preparation.transport?.planMaximumCopiedInputBytes <= 115000 &&
      preparation.transport?.selectionMaximumCopiedInputBoundBytes <= 115000 &&
      preparation.authorization?.successorExecutionManifest === true &&
      preparation.authorization?.successorModelExecution === false &&
      preparation.authorization?.retry === false &&
      preparation.authorization?.timeoutExtension === false &&
      preparation.authorization?.semanticCorrection === false &&
      preparation.authorization?.scoreDerivation === false &&
      preparation.authorization?.productionMutation === false,
    "decomposed preparation does not authorize an execution manifest"
  );
  assertV4(
    preparation.model?.label === "5.6 Sol" &&
      preparation.model?.slug === "gpt-5.6-sol" &&
      preparation.model?.reasoningEffort === "low" &&
      preparation.model?.authentication === "ChatGPT subscription" &&
      preparation.model?.meteredApiCostUsdMaximum === 0,
    "frozen model boundary changed"
  );
  await verifyHashes(preparation.sourceHashes, "preparation source");
  return preparation;
}

export async function preregisterV2DecomposedInventorySuccessor({
  shouldWrite,
  frozenAt,
}) {
  assertV4(
    frozenAt && !Number.isNaN(Date.parse(frozenAt)),
    "--frozen-at requires an ISO timestamp"
  );
  const preparation = await readPreparation();
  if (shouldWrite) {
    assertV4(
      !(await exists(V2_DECOMPOSED_INVENTORY.manifest)),
      "decomposed execution manifest already exists"
    );
    for (const output of preparation.futureOutputPathsExcludedFromSourceHashes) {
      assertV4(!(await exists(output)), `future output already exists: ${output}`);
    }
  }
  const sourceFiles = [
    ...Object.keys(preparation.sourceHashes),
    V2_DECOMPOSED_INVENTORY.preparation,
    "docs/assessment-production/manifest-v1.json",
    `${V2_DECOMPOSED_INVENTORY.validationRoot}/selection.json`,
    `${V2_DECOMPOSED_INVENTORY.validationRoot}/validation-manifest.json`,
    `${V2_DECOMPOSED_INVENTORY.validationRoot}/discovery/analysis.json`,
    "docs/assessment-production-canary-inventory-execution-workflow.md",
    DECOMPOSED_LIBRARY_PATH,
    STAGE_LIBRARY_PATH,
    PREREGISTER_PATH,
    RUNNER_PATH,
    ANALYZER_PATH,
    VALIDATOR_PATH,
    TEST_PATH,
    PREPARATION_TEST_PATH,
  ];
  const sourceHashes = {};
  for (const file of [...new Set(sourceFiles)].sort()) {
    sourceHashes[file] = sha256(await readFile(file));
  }
  const manifestPath = V2_DECOMPOSED_INVENTORY.manifest;
  assertV4(
    preparation.futureOutputPathsExcludedFromSourceHashes.includes(manifestPath),
    "preparation did not reserve the execution manifest"
  );
  const futureOutputPaths = preparation.futureOutputPathsExcludedFromSourceHashes
    .filter((file) => file !== manifestPath);
  const codexCliVersion = execFileSync(CODEX_PATH, ["--version"], {
    encoding: "utf8",
  }).trim();
  const manifest = {
    schemaVersion:
      "1.0-score-stability-v2-fresh-validation-decomposed-plan-selection-score-blind-inventory-successor-execution-manifest",
    protocolId: preparation.protocolId,
    status: V2_DECOMPOSED_INVENTORY.manifestStatus,
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
    proposedPolicy: { ...structuredClone(preparation.proposedPolicy), promoted: false },
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
      expectedParallelWallMinutes: [20, 50],
      expectedAggregateModelMinutes: [30, 70],
      expectedAggregateComputeHours: [0.5, 1.17],
      absoluteGateTimeoutMinutes: 120,
      estimateBasis:
        "Twenty fresh contexts replace ten monolithic contexts. Each stage output is regression-proven smaller, the maximum plan input is 83,285 bytes, the maximum selection bound is 100,678 bytes, and each stage preserves the prior 600-second per-context timeout with the 1-to-2 ramp.",
    },
    executionEnvironment: {
      codexPath: CODEX_PATH,
      codexCliVersion,
      authentication: "ChatGPT subscription",
      APIKeysRemoved: true,
      isolatedTemporaryCodexHomes: true,
    },
    modelInputs: {
      manual: preparation.inputs.manual,
      columnarTransportGuide: preparation.inputs.columnarTransportGuide,
      decomposedInventoryGuide: preparation.inputs.decomposedInventoryGuide,
      plannerFiles: [
        "manual.md",
        "columnar-transport-guide.md",
        "decomposed-inventory-guide.md",
        "packet.json",
        "candidate-evidence-bundle.json",
        "plan-schema.json",
      ],
      selectorFiles: [
        "columnar-transport-guide.md",
        "decomposed-inventory-guide.md",
        "candidate-evidence-bundle.json",
        "frozen-plan.json",
        "selection-schema.json",
      ],
    },
    preparation: V2_DECOMPOSED_INVENTORY.preparation,
    contexts: preparation.contexts,
    priorFailedGateEvidence: {
      ...structuredClone(preparation.failedGateDisposition),
      allFourGatesPreservedAsFailed: true,
      priorOutputsAvailableToModels: false,
      priorOutputsReusableForAcceptance: false,
    },
    isolation: structuredClone(preparation.isolation),
    decomposedTopology: structuredClone(preparation.decomposedTopology),
    executionPolicy: {
      stageOrder: ["inventory-plan", "candidate-selection"],
      contextsPerStage: V2_DECOMPOSED_INVENTORY.contextsPerStage,
      stageContexts: V2_DECOMPOSED_INVENTORY.stageContexts,
      attemptsPerStageContext: 1,
      retriesMaximum: 0,
      timeoutMsPerStageContext: 600000,
      absoluteTimeoutMsPerStage: 3600000,
      absoluteGateTimeoutMs: 7200000,
      maximumParallelContexts: 2,
      schedulerRampPerStage: [1, 2],
      rampOneServesAsOperationalCanaryPerStage: true,
      eachRampPhaseMustPassBeforeExpansion: true,
      allPlansMustPassBeforeSelectionStageBegins: true,
      planFailureBlocksSelectionStage: true,
      selectionFailureBlocksAcceptance: true,
      deterministicInputOrder: true,
      copiedInputBytesMaximum: 115000,
      timeoutExtensionApplied: false,
      authentication: "ChatGPT subscription",
      APIKeysRemoved: true,
      removedEnvironmentVariables: [...REMOVED_API_ENVIRONMENT_VARIABLES],
      meteredApiCostUsdMaximum: 0,
      transcriptionCostUsdMaximum: 0,
    },
    deterministicCompilation: structuredClone(
      preparation.deterministicCompilation
    ),
    transport: structuredClone(preparation.transport),
    audioPolicy: structuredClone(preparation.audioPolicy),
    stopRules: structuredClone(preparation.stopRules),
    acceptance: {
      validPlansRequired: 10,
      validSelectionsRequired: 10,
      validComposedInventoriesRequired: 10,
      allTwentyFreshStageContextsRequired: true,
      actualSelectionSchemaGeneratedOnlyAfterValidPlan: true,
      developmentSelectionSchemaPrototypeAsExecutionInputAllowed: false,
      candidateTransportHashBindingRequiredInBothStages: true,
      immutablePlanHashBindingRequiredInSelection: true,
      deterministicCompositionRequired: true,
      everyCandidateKeyRequired: true,
      duplicateCandidateSelectionRepresentable: false,
      wrongSideCandidateKeyRepresentable: false,
      modelAuthoredOrderAbsent: true,
      positionCollisionRepresentable: false,
      sectionSideCardinalityDeterministicallyValidated: true,
      semanticRepairs: 0,
      ratings: 0,
      responseTopology: 0,
      scores: 0,
    },
    authorization: {
      planModelContexts: true,
      selectionModelContexts: true,
      deterministicSelectionSchemaGeneration: true,
      deterministicValidation: true,
      deterministicCompilation: true,
      deterministicPassingAnalysis: true,
      failureDiagnosisOnGateFailure: true,
      retry: false,
      timeoutExtension: false,
      semanticCorrection: false,
      priorOutputReuseForAcceptance: false,
      independentJudgmentPacketPreparation: false,
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
      planExecution: V2_DECOMPOSED_INVENTORY.planExecution,
      selectionExecution: V2_DECOMPOSED_INVENTORY.selectionExecution,
      execution: V2_DECOMPOSED_INVENTORY.execution,
      analysis: V2_DECOMPOSED_INVENTORY.analysis,
      plans: preparation.contexts.map((context) => context.planOutput),
      selectionSchemas: preparation.contexts.map(
        (context) => context.selectionSchemaOutput
      ),
      selections: preparation.contexts.map((context) => context.selectionOutput),
      proposals: preparation.contexts.map(
        (context) => context.composedProposalOutput
      ),
      lockedInventories: preparation.contexts.map(
        (context) => context.lockedInventoryOutput
      ),
      validations: preparation.contexts.map((context) => context.validationOutput),
      provenance: preparation.contexts.map((context) => context.provenanceOutput),
    },
    futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
    sourceHashes,
  };
  if (shouldWrite) await writeFile(manifestPath, jsonBytes(manifest));
  const summary = {
    status: shouldWrite ? "frozen" : "preview",
    debates: manifest.contexts.map((context) => context.debateNumber),
    stageContexts: manifest.executionPolicy.stageContexts,
    schedulerRampPerStage: manifest.executionPolicy.schedulerRampPerStage,
    maximumParallelContexts: manifest.executionPolicy.maximumParallelContexts,
    maximumPlanCopiedInputBytes: manifest.transport.planMaximumCopiedInputBytes,
    maximumSelectionCopiedInputBoundBytes:
      manifest.transport.selectionMaximumCopiedInputBoundBytes,
    authentication: manifest.model.authentication,
    meteredApiCostUsdMaximum: 0,
    modelContextsExecuted: 0,
    scoresDerived: 0,
    productionMutationAuthorized: false,
  };
  console.log(JSON.stringify(summary, null, 2));
  return { manifest, summary };
}

export async function validateV2DecomposedInventorySuccessor({
  planPath,
  selectionPath,
  preparationPath,
  debateNumber,
  shouldWrite,
}) {
  const preparation = JSON.parse(await readFile(preparationPath, "utf8"));
  assertV4(
    preparation.status ===
      "ten-fresh-decomposed-plan-selection-v2-validation-inventory-contexts-prepared",
    "decomposed preparation unavailable"
  );
  const context = preparation.contexts.find(
    (item) => item.debateNumber === debateNumber
  );
  assertV4(context && planPath && selectionPath, "validation context unavailable");
  const [plan, selection, candidateTransport, legacySchema, evidenceBundle, events] =
    await Promise.all([
      readFile(planPath, "utf8").then(JSON.parse),
      readFile(selectionPath, "utf8").then(JSON.parse),
      readFile(context.modelCandidateTransport, "utf8").then(JSON.parse),
      readFile(context.priorSchema, "utf8").then(JSON.parse),
      readFile(context.validatorCandidateEvidenceBundle, "utf8").then(JSON.parse),
      readFile(context.originalEvents, "utf8").then(JSON.parse),
    ]);
  const compiled = compileDecomposedInventory({
    plan,
    selection,
    legacySchema,
    candidateTransport,
    evidenceBundle,
    eventsDocument: events,
  });
  const belowHighAttributionMoveIds = compiled.lockedInventory.moves
    .filter((move) => move.attributionConfidence !== "high")
    .map((move) => move.moveId);
  const summary = {
    schemaVersion:
      "1.0-score-stability-v2-decomposed-plan-selection-inventory-successor-validation",
    protocolId: preparation.protocolId,
    status: "passed",
    developmentValidationOnly: true,
    productionCanary: false,
    stagingOnly: true,
    debateNumber,
    candidateTransportCanonicalSha256:
      candidateTransportCanonicalSha256(candidateTransport),
    inventoryPlanSha256: inventoryPlanSha256(plan),
    sections: compiled.lockedInventory.sections.length,
    moves: compiled.lockedInventory.moves.length,
    proMoves: compiled.lockedInventory.moves.filter((move) => move.side === "pro")
      .length,
    conMoves: compiled.lockedInventory.moves.filter((move) => move.side === "con")
      .length,
    belowHighAttributionMoveIds,
    decomposedPlanSelectionUsed: true,
    planSelectionContextsIsolated: true,
    dynamicallyGeneratedSelectionSchemaUsed: true,
    candidateTransportHashBoundInBothStages: true,
    immutablePlanHashBoundInSelection: true,
    duplicateCandidateSelectionRepresentable: false,
    wrongSideCandidateKeyRepresentable: false,
    modelAuthoredOrderAbsent: true,
    positionCollisionRepresentable: false,
    sectionSideCardinalityDeterministicallyValidated: true,
    finalEvidenceSourceExact: compiled.validation.finalEvidenceSourceExact,
    ratingsAbsent: compiled.validation.ratingsAbsent,
    responseTopologyAbsent: compiled.validation.responseTopologyAbsent,
    semanticRepairPerformed: false,
    scoresDerived: 0,
  };
  if (shouldWrite) {
    for (const output of [
      context.composedProposalOutput,
      context.lockedInventoryOutput,
      context.validationOutput,
      context.provenanceOutput,
    ]) await mkdir(path.dirname(output), { recursive: true });
    await writeFile(context.composedProposalOutput, jsonBytes(compiled.proposal));
    await writeFile(context.lockedInventoryOutput, jsonBytes(compiled.lockedInventory));
    await writeFile(context.validationOutput, jsonBytes(summary));
    await writeFile(context.provenanceOutput, jsonBytes(compiled.provenance));
  }
  console.log(JSON.stringify(summary, null, 2));
  return summary;
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

async function readAuthorizedManifest() {
  const manifest = JSON.parse(
    await readFile(V2_DECOMPOSED_INVENTORY.manifest, "utf8")
  );
  assertV4(
    manifest.status === V2_DECOMPOSED_INVENTORY.manifestStatus &&
      manifest.contexts?.length === V2_DECOMPOSED_INVENTORY.contextsPerStage &&
      manifest.currentCanaryDisposition?.reclassified === false &&
      manifest.proposedPolicy?.promoted === false &&
      manifest.priorFailedGateEvidence?.allFourGatesPreservedAsFailed === true &&
      manifest.executionPolicy?.stageContexts === 20 &&
      manifest.executionPolicy?.attemptsPerStageContext === 1 &&
      manifest.executionPolicy?.retriesMaximum === 0 &&
      manifest.executionPolicy?.timeoutMsPerStageContext === 600000 &&
      manifest.executionPolicy?.timeoutExtensionApplied === false &&
      manifest.executionPolicy?.allPlansMustPassBeforeSelectionStageBegins ===
        true &&
      manifest.authorization?.planModelContexts === true &&
      manifest.authorization?.selectionModelContexts === true &&
      manifest.authorization?.retry === false &&
      manifest.authorization?.semanticCorrection === false &&
      manifest.model?.label === "5.6 Sol" &&
      manifest.model?.slug === "gpt-5.6-sol" &&
      manifest.model?.reasoningEffort === "low" &&
      manifest.model?.authentication === "ChatGPT subscription",
    "decomposed inventory execution is unauthorized"
  );
  await verifyHashes(manifest.sourceHashes, "manifest source");
  return manifest;
}

function codexArgs(manifest, schemaFile, resultFile, prompt) {
  return [
    "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config",
    "--ignore-rules", "--model", manifest.model.slug, "-c",
    `model_reasoning_effort="${manifest.model.reasoningEffort}"`,
    "--disable", "plugins", "--disable", "remote_plugin", "--disable",
    "skill_search", "--disable", "apps", "--disable", "memories",
    "--disable", "multi_agent", "--disable", "browser_use", "--disable",
    "computer_use", "--disable", "workspace_dependencies", "--sandbox",
    "read-only", "--color", "never", "--output-schema", schemaFile,
    "--output-last-message", resultFile, prompt,
  ];
}

async function runRamp(contexts, executeContext, maximumParallelContexts) {
  const results = new Array(contexts.length);
  const phases = [];
  async function runIndexes(indexes, parallel, phase) {
    const startedAt = new Date().toISOString();
    let cursor = 0;
    async function worker() {
      while (cursor < indexes.length) {
        const offset = cursor++;
        const index = indexes[offset];
        results[index] = await executeContext(contexts[index], index);
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(parallel, indexes.length) }, () => worker())
    );
    const passed = indexes.every((index) => results[index].accepted);
    phases.push({
      phase,
      maximumParallelContexts: parallel,
      contextIndexes: indexes,
      startedAt,
      completedAt: new Date().toISOString(),
      passed,
    });
    return passed;
  }
  let passed = await runIndexes([0], 1, "operational-canary-one");
  if (passed) passed = await runIndexes([1, 2], maximumParallelContexts, "ramp-two");
  if (passed) {
    passed = await runIndexes(
      Array.from({ length: contexts.length - 3 }, (_, index) => index + 3),
      maximumParallelContexts,
      "steady-two"
    );
  }
  return { results: results.filter(Boolean), phases, passed };
}

export async function runV2DecomposedInventorySuccessor() {
  const manifest = await readAuthorizedManifest();
  const codex = manifest.executionEnvironment.codexPath;
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  assertV4(
    execFileSync(codex, ["--version"], { encoding: "utf8" }).trim() ===
      manifest.executionEnvironment.codexCliVersion,
    "frozen Codex CLI version changed"
  );
  await access(authSource);
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
    assertV4(!(await exists(future)), `future output already exists: ${future}`);
  }
  let active = 0;
  let maximumParallelContextsObserved = 0;
  async function isolatedInvocation({ context, index, stage, files, schemaName, prompt }) {
    const temporary = await mkdtemp(
      path.join(os.tmpdir(), `slugfester-decomposed-${stage}-${context.debateNumber}-`)
    );
    const isolatedHome = await mkdtemp(
      path.join(os.tmpdir(), `slugfester-decomposed-${stage}-home-${context.debateNumber}-`)
    );
    const startedAt = new Date().toISOString();
    const started = Date.now();
    active += 1;
    maximumParallelContextsObserved = Math.max(maximumParallelContextsObserved, active);
    try {
      for (const [source, target] of files) await copyFile(source, path.join(temporary, target));
      await copyFile(authSource, path.join(isolatedHome, "auth.json"));
      const env = { ...process.env, CODEX_HOME: isolatedHome };
      for (const key of manifest.executionPolicy.removedEnvironmentVariables) delete env[key];
      const invocation = await runChild(
        codex,
        codexArgs(manifest, schemaName, "result.json", prompt),
        { cwd: temporary, env },
        manifest.executionPolicy.timeoutMsPerStageContext
      );
      const resultPath = path.join(temporary, "result.json");
      const resultExists = await exists(resultPath);
      return {
        invocation,
        resultBytes: resultExists ? await readFile(resultPath) : null,
        base: {
          stage,
          contextIndex: index,
          debateNumber: context.debateNumber,
          model: manifest.model.label,
          modelSlug: manifest.model.slug,
          reasoningEffort: manifest.model.reasoningEffort,
          attemptCount: 1,
          retryCount: 0,
          startedAt,
          completedAt: new Date().toISOString(),
          elapsedMs: Date.now() - started,
          timeoutMsApplied: manifest.executionPolicy.timeoutMsPerStageContext,
          timedOut: invocation.timedOut,
          commandExitCode: invocation.code,
          terminationSignal: invocation.signal,
          authentication: "ChatGPT subscription",
          apiKeysRemoved: true,
          meteredApiCostUsd: 0,
          stdoutSha256: sha256(invocation.stdout),
          stderrSha256: sha256(invocation.stderr),
        },
      };
    } finally {
      active -= 1;
      await rm(temporary, { recursive: true, force: true });
      await rm(isolatedHome, { recursive: true, force: true });
    }
  }
  async function executePlan(context, index) {
    const prompt = `Read manual.md, columnar-transport-guide.md, decomposed-inventory-guide.md, packet.json, candidate-evidence-bundle.json, and plan-schema.json completely; read nothing else. Act only as the isolated score-blind inventory planner for fresh development-validation successor Debate ${context.debateNumber}. Author only one burden route per side with bridges and four to six weighted issue sections totaling exactly 100 percent. Candidate selection is deferred to another fresh context. Ratings, response topology, burden contact, adjustments, scores, winners, tags, prior outputs, other debates, publication prose, and any candidate selection are prohibited. Return exactly one plan-schema-conforming JSON object.`;
    const outcome = await isolatedInvocation({
      context,
      index,
      stage: "inventory-plan",
      schemaName: "plan-schema.json",
      prompt,
      files: [
        [manifest.modelInputs.manual, "manual.md"],
        [manifest.modelInputs.columnarTransportGuide, "columnar-transport-guide.md"],
        [manifest.modelInputs.decomposedInventoryGuide, "decomposed-inventory-guide.md"],
        [context.packet, "packet.json"],
        [context.modelCandidateTransport, "candidate-evidence-bundle.json"],
        [context.planSchema, "plan-schema.json"],
      ],
    });
    const { invocation, resultBytes, base } = outcome;
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal || !resultBytes) {
      return {
        ...base,
        copiedInputBytes: context.planCopiedInputBytes,
        status: invocation.timedOut ? "timed-out" : !resultBytes ? "result-missing" : "transport-failed",
        accepted: false,
        stdoutTail: invocation.stdout.slice(-12000),
        stderrTail: invocation.stderr.slice(-12000),
      };
    }
    await mkdir(path.dirname(context.planOutput), { recursive: true });
    await writeFile(context.planOutput, resultBytes);
    try {
      const [plan, transport, legacySchema] = await Promise.all([
        readFile(context.planOutput, "utf8").then(JSON.parse),
        readFile(context.modelCandidateTransport, "utf8").then(JSON.parse),
        readFile(context.priorSchema, "utf8").then(JSON.parse),
      ]);
      validateDecomposedInventoryPlan({ plan, legacySchema, candidateTransport: transport });
      assertV4(resultBytes.length <= context.maximumPlanOutputBytes, "plan output bound exceeded");
      const selectionSchema = buildDecomposedInventorySelectionSchema({
        legacySchema,
        candidateTransport: transport,
        plan,
      });
      auditDecomposedStrictSchema(selectionSchema);
      const schemaBytes = compactJsonBytes(selectionSchema);
      assertV4(
        schemaBytes.length <= context.developmentMaximumPlanSelectionSchemaPrototypeBytes,
        "selection schema exceeded development maximum"
      );
      await mkdir(path.dirname(context.selectionSchemaOutput), { recursive: true });
      await writeFile(context.selectionSchemaOutput, schemaBytes);
      return {
        ...base,
        copiedInputBytes: context.planCopiedInputBytes,
        status: "completed-valid",
        accepted: true,
        planSha256: sha256(resultBytes),
        inventoryPlanCanonicalSha256: inventoryPlanSha256(plan),
        selectionSchemaSha256: sha256(schemaBytes),
        selectionSchemaBytes: schemaBytes.length,
      };
    } catch (error) {
      return {
        ...base,
        copiedInputBytes: context.planCopiedInputBytes,
        status: "output-validation-failed",
        accepted: false,
        planSha256: sha256(resultBytes),
        validationMessage: error.message,
      };
    }
  }
  async function executeSelection(context, index) {
    const [planBytes, schemaBytes] = await Promise.all([
      readFile(context.planOutput),
      readFile(context.selectionSchemaOutput),
    ]);
    const actualCopiedInputBytes =
      (await readFile(manifest.modelInputs.columnarTransportGuide)).length +
      (await readFile(manifest.modelInputs.decomposedInventoryGuide)).length +
      (await readFile(context.modelCandidateTransport)).length +
      planBytes.length + schemaBytes.length;
    assertV4(
      actualCopiedInputBytes <= context.maximumSelectionCopiedInputBytes,
      "selection input exceeded frozen maximum"
    );
    const prompt = `Read columnar-transport-guide.md, decomposed-inventory-guide.md, candidate-evidence-bundle.json, frozen-plan.json, and selection-schema.json completely; read nothing else. Act only as the fresh isolated score-blind candidate selector for development-validation successor Debate ${context.debateNumber}. Treat frozen-plan.json as immutable. Review every candidate key exactly once under its repository-owned side and use null for every unselected candidate. Select 8 to 24 candidates total, with one or two pro and one or two con selections in every frozen section. For selected candidates author only sectionId, moveId, moveKind, and a source-faithful proposition. Do not author routes, sections, side, order, positions, ratings, response topology, burden contact, scores, winners, prior execution information, other debates, or publication prose. Return exactly one selection-schema-conforming JSON object.`;
    const outcome = await isolatedInvocation({
      context,
      index,
      stage: "candidate-selection",
      schemaName: "selection-schema.json",
      prompt,
      files: [
        [manifest.modelInputs.columnarTransportGuide, "columnar-transport-guide.md"],
        [manifest.modelInputs.decomposedInventoryGuide, "decomposed-inventory-guide.md"],
        [context.modelCandidateTransport, "candidate-evidence-bundle.json"],
        [context.planOutput, "frozen-plan.json"],
        [context.selectionSchemaOutput, "selection-schema.json"],
      ],
    });
    const { invocation, resultBytes, base } = outcome;
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal || !resultBytes) {
      return {
        ...base,
        copiedInputBytes: actualCopiedInputBytes,
        status: invocation.timedOut ? "timed-out" : !resultBytes ? "result-missing" : "transport-failed",
        accepted: false,
        stdoutTail: invocation.stdout.slice(-12000),
        stderrTail: invocation.stderr.slice(-12000),
      };
    }
    await mkdir(path.dirname(context.selectionOutput), { recursive: true });
    await writeFile(context.selectionOutput, resultBytes);
    const validation = await runChild(
      process.execPath,
      [
        VALIDATOR_PATH,
        context.planOutput,
        context.selectionOutput,
        manifest.preparation,
        context.debateNumber,
        "--write",
      ],
      { cwd: process.cwd(), env: process.env },
      180000
    );
    const valid = validation.code === 0 && validation.signal === null && !validation.timedOut;
    return {
      ...base,
      copiedInputBytes: actualCopiedInputBytes,
      status: valid ? "completed-valid" : "output-validation-failed",
      accepted: valid,
      selectionSha256: sha256(resultBytes),
      validationSummary: valid ? JSON.parse(validation.stdout) : null,
      validationMessage: valid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-10000),
      proposalSha256: valid ? sha256(await readFile(context.composedProposalOutput)) : null,
      lockedInventorySha256: valid ? sha256(await readFile(context.lockedInventoryOutput)) : null,
      validationSha256: valid ? sha256(await readFile(context.validationOutput)) : null,
      provenanceSha256: valid ? sha256(await readFile(context.provenanceOutput)) : null,
    };
  }

  const gateStartedAt = new Date().toISOString();
  const gateStarted = Date.now();
  const planStarted = Date.now();
  const planRamp = await runRamp(
    manifest.contexts,
    executePlan,
    manifest.executionPolicy.maximumParallelContexts
  );
  const planExecution = {
    schemaVersion: "1.0-decomposed-inventory-plan-model-execution",
    protocolId: manifest.protocolId,
    status: planRamp.passed ? "ten-inventory-plans-passed" : "inventory-plan-stage-failed",
    contextsPlanned: 10,
    contextsAttempted: planRamp.results.length,
    validContexts: planRamp.results.filter((result) => result.accepted).length,
    invalidContexts: planRamp.results.filter((result) => !result.accepted).length,
    retries: 0,
    rampPhases: planRamp.phases,
    rampPassed: planRamp.passed,
    wallElapsedMs: Date.now() - planStarted,
    modelWorkElapsedMs: planRamp.results.reduce((sum, result) => sum + result.elapsedMs, 0),
    results: planRamp.results,
  };
  await writeFile(manifest.artifacts.planExecution, jsonBytes(planExecution));
  let selectionExecution = null;
  if (planRamp.passed) {
    const selectionStarted = Date.now();
    const selectionRamp = await runRamp(
      manifest.contexts,
      executeSelection,
      manifest.executionPolicy.maximumParallelContexts
    );
    selectionExecution = {
      schemaVersion: "1.0-decomposed-inventory-selection-model-execution",
      protocolId: manifest.protocolId,
      status: selectionRamp.passed
        ? "ten-candidate-selections-passed"
        : "candidate-selection-stage-failed",
      contextsPlanned: 10,
      contextsAttempted: selectionRamp.results.length,
      validContexts: selectionRamp.results.filter((result) => result.accepted).length,
      invalidContexts: selectionRamp.results.filter((result) => !result.accepted).length,
      retries: 0,
      rampPhases: selectionRamp.phases,
      rampPassed: selectionRamp.passed,
      wallElapsedMs: Date.now() - selectionStarted,
      modelWorkElapsedMs: selectionRamp.results.reduce(
        (sum, result) => sum + result.elapsedMs,
        0
      ),
      results: selectionRamp.results,
    };
    await writeFile(manifest.artifacts.selectionExecution, jsonBytes(selectionExecution));
  }
  const passed = planRamp.passed && selectionExecution?.rampPassed === true;
  const execution = {
    schemaVersion:
      "1.0-score-stability-v2-decomposed-plan-selection-inventory-successor-model-execution",
    protocolId: manifest.protocolId,
    status: passed
      ? V2_DECOMPOSED_INVENTORY.executionPassedStatus
      : V2_DECOMPOSED_INVENTORY.executionFailedStatus,
    developmentValidationOnly: true,
    productionCanary: false,
    stagingOnly: true,
    gateStartedAt,
    gateCompletedAt: new Date().toISOString(),
    stageContextsPlanned: 20,
    stageContextsAttempted:
      planExecution.contextsAttempted + (selectionExecution?.contextsAttempted ?? 0),
    validPlans: planExecution.validContexts,
    validSelections: selectionExecution?.validContexts ?? 0,
    retries: 0,
    maximumParallelContextsObserved,
    wallElapsedMs: Date.now() - gateStarted,
    modelWorkElapsedMs:
      planExecution.modelWorkElapsedMs +
      (selectionExecution?.modelWorkElapsedMs ?? 0),
    planExecution: manifest.artifacts.planExecution,
    selectionExecution: selectionExecution ? manifest.artifacts.selectionExecution : null,
    authentication: "ChatGPT subscription",
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    currentCanaryReclassified: false,
    proposedPolicyPromoted: false,
    scoresDerived: 0,
    authorization: {
      deterministicPassingAnalysis: passed,
      failureDiagnosis: !passed,
      independentJudgmentPacketPreparation: passed,
      independentJudgmentModelExecution: false,
      retry: false,
      scoreDerivation: false,
      productionMutation: false,
    },
  };
  await writeFile(manifest.artifacts.execution, jsonBytes(execution));
  console.log(JSON.stringify(execution, null, 2));
  return execution;
}

export async function analyzeV2DecomposedInventorySuccessor({ shouldWrite }) {
  const manifest = await readAuthorizedManifest();
  const execution = JSON.parse(await readFile(manifest.artifacts.execution, "utf8"));
  assertV4(
    execution.status === V2_DECOMPOSED_INVENTORY.executionPassedStatus &&
      execution.validPlans === 10 &&
      execution.validSelections === 10 &&
      execution.retries === 0,
    "all twenty decomposed stage contexts must pass before analysis"
  );
  const debates = [];
  for (const context of manifest.contexts) {
    const [inventory, validation] = await Promise.all([
      readFile(context.lockedInventoryOutput, "utf8").then(JSON.parse),
      readFile(context.validationOutput, "utf8").then(JSON.parse),
    ]);
    debates.push({
      debateNumber: context.debateNumber,
      debateId: context.debateId,
      candidatesAvailable: context.candidates,
      sections: inventory.sections.length,
      moves: inventory.moves.length,
      proMoves: inventory.moves.filter((move) => move.side === "pro").length,
      conMoves: inventory.moves.filter((move) => move.side === "con").length,
      belowHighAttributionMoveIds: validation.belowHighAttributionMoveIds,
      lockedInventory: context.lockedInventoryOutput,
      decomposedPlanSelectionUsed: validation.decomposedPlanSelectionUsed,
      planSelectionContextsIsolated: validation.planSelectionContextsIsolated,
      candidateTransportHashBoundInBothStages:
        validation.candidateTransportHashBoundInBothStages,
      immutablePlanHashBoundInSelection:
        validation.immutablePlanHashBoundInSelection,
      finalEvidenceSourceExact: validation.finalEvidenceSourceExact,
      ratingsAbsent: validation.ratingsAbsent,
      responseTopologyAbsent: validation.responseTopologyAbsent,
    });
  }
  assertV4(
    debates.every(
      (debate) =>
        debate.sections >= 4 && debate.sections <= 6 &&
        debate.moves >= 8 && debate.moves <= 24 &&
        debate.proMoves >= 4 && debate.conMoves >= 4 &&
        debate.decomposedPlanSelectionUsed &&
        debate.planSelectionContextsIsolated &&
        debate.candidateTransportHashBoundInBothStages &&
        debate.immutablePlanHashBoundInSelection &&
        debate.finalEvidenceSourceExact && debate.ratingsAbsent &&
        debate.responseTopologyAbsent
    ),
    "decomposed inventory acceptance drifted"
  );
  const pendingAudio = debates.flatMap((debate) =>
    debate.belowHighAttributionMoveIds.map((moveId) => ({
      debateNumber: debate.debateNumber,
      moveId,
    }))
  );
  const analysis = {
    schemaVersion:
      "1.0-score-stability-v2-decomposed-plan-selection-inventory-successor-analysis",
    protocolId: manifest.protocolId,
    status: V2_DECOMPOSED_INVENTORY.analysisStatus,
    developmentValidationOnly: true,
    productionCanary: false,
    stagingOnly: true,
    AIOnly: true,
    currentCanaryDisposition: structuredClone(manifest.currentCanaryDisposition),
    proposedPolicy: { ...structuredClone(manifest.proposedPolicy), promoted: false },
    independentJudgmentEvidenceHeldOut: true,
    execution: {
      stageContextsPlanned: 20,
      stageContextsAttempted: execution.stageContextsAttempted,
      validPlans: execution.validPlans,
      validSelections: execution.validSelections,
      retries: 0,
      maximumParallelContextsObserved: execution.maximumParallelContextsObserved,
      wallElapsedMs: execution.wallElapsedMs,
      modelWorkElapsedMs: execution.modelWorkElapsedMs,
    },
    debates,
    acceptance: {
      tenValidPlans: true,
      tenValidSelections: true,
      tenValidComposedInventories: true,
      candidateTransportAndPlanBindingsValid: true,
      semanticRepairs: 0,
      ratings: 0,
      responseTopology: 0,
      scores: 0,
      passed: true,
    },
    audioPolicy: {
      selectedBelowHighAttributionMoveRequiresVerification: true,
      mediumConfidenceAlwaysRequiresVerification: true,
      pendingVerificationMoves: pendingAudio,
      audioCallsThisStage: 0,
    },
    totals: {
      debates: debates.length,
      candidatesAvailable: debates.reduce((sum, debate) => sum + debate.candidatesAvailable, 0),
      movesLocked: debates.reduce((sum, debate) => sum + debate.moves, 0),
      pendingAudioVerificationMoves: pendingAudio.length,
      modelContextsExecuted: 20,
      scoresDerived: 0,
      meteredApiCostUsd: 0,
      transcriptionCostUsd: 0,
    },
    authorization: {
      independentJudgmentPacketPreparation: true,
      independentJudgmentModelExecution: false,
      disagreementExtraction: false,
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
  if (shouldWrite) await writeFile(manifest.artifacts.analysis, jsonBytes(analysis));
  console.log(JSON.stringify(analysis, null, 2));
  return analysis;
}

export async function testV2DecomposedInventorySuccessorGate() {
  const preparation = await readPreparation();
  if (!(await exists(V2_DECOMPOSED_INVENTORY.manifest))) {
    const summary = {
      status: "passed-prefreeze",
      debates: 10,
      stageContexts: 20,
      candidates: 406,
      modelContextsExecuted: 0,
      scoresDerived: 0,
    };
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }
  const manifest = await readAuthorizedManifest();
  assertV4(
    manifest.executionPolicy?.absoluteTimeoutMsPerStage === 3600000 &&
      manifest.executionPolicy?.absoluteGateTimeoutMs === 7200000 &&
      JSON.stringify(manifest.executionPolicy?.schedulerRampPerStage) ===
        JSON.stringify([1, 2]) &&
      manifest.executionPolicy?.maximumParallelContexts === 2 &&
      manifest.acceptance?.validPlansRequired === 10 &&
      manifest.acceptance?.validSelectionsRequired === 10 &&
      manifest.acceptance?.validComposedInventoriesRequired === 10 &&
      manifest.acceptance
        ?.developmentSelectionSchemaPrototypeAsExecutionInputAllowed === false &&
      manifest.acceptance?.candidateTransportHashBindingRequiredInBothStages ===
        true &&
      manifest.acceptance?.immutablePlanHashBindingRequiredInSelection === true,
    "decomposed execution or acceptance policy drifted"
  );
  for (const key of [
    "retry",
    "timeoutExtension",
    "semanticCorrection",
    "priorOutputReuseForAcceptance",
    "independentJudgmentPacketPreparation",
    "independentJudgmentModelExecution",
    "paidTranscription",
    "audioVerification",
    "adjudicationModelExecution",
    "scoreDerivation",
    "policyPromotion",
    "publicationPreparation",
    "productionMutation",
    "remainingProductionBatches",
  ]) assertV4(manifest.authorization[key] === false, `${key}: premature authorization`);
  if (!(await exists(manifest.artifacts.execution))) {
    for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
      assertV4(
        !(await exists(future)) && !Object.hasOwn(manifest.sourceHashes, future),
        `future output exists before execution: ${future}`
      );
    }
    const summary = {
      status: "passed-frozen",
      debates: 10,
      stageContexts: 20,
      schedulerRampPerStage: [1, 2],
      maximumParallelContexts: 2,
      authentication: manifest.model.authentication,
      maximumPlanCopiedInputBytes: preparation.transport.planMaximumCopiedInputBytes,
      maximumSelectionCopiedInputBoundBytes:
        preparation.transport.selectionMaximumCopiedInputBoundBytes,
      modelContextsExecuted: 0,
      scoresDerived: 0,
      productionMutation: false,
    };
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }
  const execution = JSON.parse(await readFile(manifest.artifacts.execution, "utf8"));
  assertV4(
    execution.stageContextsAttempted >= 1 &&
      execution.stageContextsAttempted <= 20 &&
      execution.retries === 0 &&
      execution.maximumParallelContextsObserved <= 2 &&
      execution.currentCanaryReclassified === false &&
      execution.proposedPolicyPromoted === false &&
      execution.scoresDerived === 0,
    "decomposed execution ledger drifted"
  );
  const summary = {
    status:
      execution.status === V2_DECOMPOSED_INVENTORY.executionPassedStatus
        ? "passed-execution"
        : "passed-recorded-failure",
    stageContextsAttempted: execution.stageContextsAttempted,
    validPlans: execution.validPlans,
    validSelections: execution.validSelections,
    retries: 0,
    scoresDerived: 0,
    productionMutation: false,
  };
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}
