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
import { compileV422116LockedInventory } from "./v422116-decomposed-consensus.mjs";

export const V2_INVENTORY = Object.freeze({
  validationRoot:
    "docs/assessment-production/score-stability-v2-validation-cohort",
  root: "docs/assessment-production/score-stability-v2-validation-cohort/inventory-columnar-recovery",
  preparation:
    "docs/assessment-production/score-stability-v2-validation-cohort/inventory-columnar-recovery/preparation-manifest.json",
  manifest:
    "docs/assessment-production/score-stability-v2-validation-cohort/inventory-columnar-recovery/execution-manifest.json",
  execution:
    "docs/assessment-production/score-stability-v2-validation-cohort/inventory-columnar-recovery/model-execution.json",
  analysis:
    "docs/assessment-production/score-stability-v2-validation-cohort/inventory-columnar-recovery/analysis.json",
  manifestStatus:
    "frozen-ten-fresh-columnar-v2-validation-score-blind-inventory-recovery-contexts-authorized",
  executionPassedStatus:
    "ten-fresh-columnar-v2-validation-score-blind-inventory-recovery-contexts-passed",
  executionFailedStatus:
    "v2-validation-score-blind-inventory-columnar-recovery-complete-with-failure",
  analysisStatus:
    "ten-fresh-columnar-v2-validation-score-blind-inventory-recovery-contexts-passed-independent-judgment-packet-preparation-authorized",
  contexts: 10,
  candidates: 406,
  proCandidates: 203,
  conCandidates: 203,
});

const EXECUTION_WORKFLOW =
  "docs/assessment-production-canary-inventory-execution-workflow.md";
const RETIRED_EXECUTION =
  "docs/calibration/v4.2.21.17.24/hard-route-score-blind-inventory/model-execution.json";
const RETIRED_ANALYSIS =
  "docs/calibration/v4.2.21.17.24/hard-route-score-blind-inventory/analysis.json";
const PRIOR_FAILED_EXECUTION =
  "docs/assessment-production/score-stability-v2-validation-cohort/inventory/model-execution.json";
const TIMEOUT_DIAGNOSIS = `${V2_INVENTORY.root}/timeout-diagnosis.json`;
const LIBRARY_PATH =
  "scripts/lib/assessment-production-score-stability-v2-inventory-columnar-recovery-stage.mjs";
const PREREGISTER_PATH =
  "scripts/preregister-assessment-production-score-stability-v2-inventory-columnar-recovery.mjs";
const RUNNER_PATH =
  "scripts/run-assessment-production-score-stability-v2-inventory-columnar-recovery.mjs";
const ANALYZER_PATH =
  "scripts/analyze-assessment-production-score-stability-v2-inventory-columnar-recovery.mjs";
const VALIDATOR_PATH =
  "scripts/validate-assessment-production-score-stability-v2-inventory-columnar-recovery.mjs";
const TEST_PATH =
  "scripts/test-assessment-production-score-stability-v2-inventory-columnar-recovery-gate.mjs";
const PREPARATION_TEST_PATH =
  "scripts/test-assessment-production-score-stability-v2-inventory-columnar-recovery-preparation.mjs";
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
  const preparation = JSON.parse(await readFile(V2_INVENTORY.preparation, "utf8"));
  assertV4(
    preparation.status ===
      "ten-fresh-columnar-v2-validation-inventory-contexts-prepared" &&
      preparation.developmentValidationOnly === true &&
      preparation.productionCanary === false &&
      preparation.stagingOnly === true &&
      preparation.currentCanaryDisposition?.status ===
        "failed-under-frozen-exact-rounded-winner-rule" &&
      preparation.currentCanaryDisposition?.reclassified === false &&
      preparation.proposedPolicy?.promoted === false &&
      preparation.contexts?.length === V2_INVENTORY.contexts &&
      preparation.totals?.candidates === V2_INVENTORY.candidates &&
      preparation.totals?.proCandidates === V2_INVENTORY.proCandidates &&
      preparation.totals?.conCandidates === V2_INVENTORY.conCandidates &&
      preparation.transport?.everyCandidateRetained === true &&
      preparation.transport?.everyOriginalModelVisibleFieldRetained === true &&
      preparation.transport?.semanticCandidateDownselectionPerformed === false &&
      preparation.transport?.parsedRoundTripIdentityVerified === true &&
      preparation.transport?.timeoutExtensionApplied === false &&
      preparation.totals?.maximumCopiedInputBytes <= 115000 &&
      preparation.priorGateDisposition?.preservedAsFailed === true &&
      preparation.priorGateDisposition
        ?.priorValidOutputsReusableForSuccessorAcceptance === false &&
      preparation.authorization?.recoveryExecutionManifest === true &&
      preparation.authorization?.recoveryModelExecution === false &&
      preparation.authorization?.scoreDerivation === false &&
      preparation.authorization?.policyPromotion === false &&
      preparation.authorization?.productionMutation === false,
    "v2 inventory preparation does not authorize an execution manifest"
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

export async function preregisterV2InventoryColumnarRecovery({ shouldWrite, frozenAt }) {
  assertV4(
    frozenAt && !Number.isNaN(Date.parse(frozenAt)),
    "--frozen-at requires an ISO timestamp"
  );
  if (shouldWrite) {
    for (const file of [
      V2_INVENTORY.manifest,
      V2_INVENTORY.execution,
      V2_INVENTORY.analysis,
    ]) {
      assertV4(
        !(await exists(file)),
        `${file} already exists; inventory preregistration is immutable`
      );
    }
  }
  const [
    preparation,
    retiredExecution,
    retiredAnalysis,
    priorFailedExecution,
    timeoutDiagnosis,
  ] = await Promise.all([
    readPreparation(),
    readFile(RETIRED_EXECUTION, "utf8").then(JSON.parse),
    readFile(RETIRED_ANALYSIS, "utf8").then(JSON.parse),
    readFile(PRIOR_FAILED_EXECUTION, "utf8").then(JSON.parse),
    readFile(TIMEOUT_DIAGNOSIS, "utf8").then(JSON.parse),
  ]);
  assertV4(
    retiredExecution.status ===
      "five-hard-route-score-blind-inventory-contexts-passed" &&
      retiredExecution.validContexts === 5 &&
      retiredExecution.retries === 0 &&
      retiredExecution.maximumParallelContextsObserved === 2 &&
      retiredAnalysis.status ===
        "five-hard-route-score-blind-inventories-passed-independent-judgment-packet-preparation-authorized",
    "retired inventory execution evidence is unavailable"
  );
  assertV4(
    priorFailedExecution.status ===
        "v2-validation-score-blind-inventory-complete-with-failure" &&
      priorFailedExecution.validContexts === 9 &&
      priorFailedExecution.invalidContexts === 1 &&
      priorFailedExecution.retries === 0 &&
      priorFailedExecution.currentCanaryReclassified === false &&
      priorFailedExecution.proposedPolicyPromoted === false &&
      timeoutDiagnosis.status ===
        "failed-inventory-gate-preserved-columnar-full-cohort-successor-preparation-authorized" &&
      timeoutDiagnosis.requiredSuccessorDesign?.fullTenContextFreshExecution ===
        true &&
      timeoutDiagnosis.requiredSuccessorDesign
        ?.priorNineValidOutputsReusableForSuccessorAcceptance === false &&
      timeoutDiagnosis.requiredSuccessorDesign?.samePerContextTimeoutMs ===
        600000 &&
      timeoutDiagnosis.authorization?.recoveryModelExecution === false,
    "failed predecessor gate or timeout diagnosis drifted"
  );
  for (const context of preparation.contexts) {
    const [transportBytes, schemaBytes] = await Promise.all([
      readFile(context.modelCandidateTransport),
      readFile(context.schema),
    ]);
    assertV4(
      transportBytes.equals(
        Buffer.from(`${JSON.stringify(JSON.parse(transportBytes))}\n`)
      ) &&
        schemaBytes.equals(Buffer.from(`${JSON.stringify(JSON.parse(schemaBytes))}\n`)),
      `${context.debateNumber}: compact transport serialization drifted`
    );
    assertV4(
      context.copiedInputBytes <= 115000,
      `${context.debateNumber}: copied input exceeds the proven ceiling`
    );
  }
  const sourceFiles = [
    "docs/assessment-production-workflow.md",
    "docs/assessment-production-canary-inventory-workflow.md",
    EXECUTION_WORKFLOW,
    "docs/assessment-workflow-v4.2.21.17.41.md",
    "docs/reassessment-rubric-v2.1.md",
    "docs/assessment-production/manifest-v1.json",
    `${V2_INVENTORY.validationRoot}/selection.json`,
    `${V2_INVENTORY.validationRoot}/validation-manifest.json`,
    `${V2_INVENTORY.validationRoot}/discovery/analysis.json`,
    V2_INVENTORY.preparation,
    TIMEOUT_DIAGNOSIS,
    PRIOR_FAILED_EXECUTION,
    preparation.inputs.manual,
    preparation.inputs.columnarTransportGuide,
    RETIRED_EXECUTION,
    RETIRED_ANALYSIS,
    "scripts/lib/v4-lean-production.mjs",
    "scripts/lib/v418-source-integrity.mjs",
    "scripts/lib/v4220-source-span-rendering.mjs",
    "scripts/lib/v422115-candidate-evidence-transport.mjs",
    "scripts/lib/v422116-decomposed-consensus.mjs",
    "scripts/lib/v4221162-inventory-transport.mjs",
    LIBRARY_PATH,
    VALIDATOR_PATH,
    PREREGISTER_PATH,
    RUNNER_PATH,
    ANALYZER_PATH,
    PREPARATION_TEST_PATH,
    TEST_PATH,
    ...preparation.contexts.flatMap((context) => [
      context.packet,
      context.discoveryCandidateBundle,
      context.discoverySparseContext,
      context.validatorCandidateEvidenceBundle,
      context.modelCandidateTransport,
      context.originalEvents,
      context.fullLedger,
      context.schema,
    ]),
  ];
  const sourceHashes = {};
  for (const file of [...new Set(sourceFiles)].sort()) {
    sourceHashes[file] = sha256(await readFile(file));
  }
  const futureOutputPaths = [
    ...preparation.contexts.flatMap((context) => [
      context.proposalOutput,
      context.lockedInventoryOutput,
      context.validationOutput,
      context.provenanceOutput,
    ]),
    V2_INVENTORY.execution,
    V2_INVENTORY.analysis,
  ];
  if (shouldWrite) {
    for (const file of futureOutputPaths) {
      assertV4(!(await exists(file)), `future output already exists: ${file}`);
    }
  }
  const codexCliVersion = execFileSync(CODEX_PATH, ["--version"], {
    encoding: "utf8",
  }).trim();
  const manifest = {
    schemaVersion:
      "1.0-score-stability-v2-fresh-validation-columnar-score-blind-inventory-recovery-execution-manifest",
    protocolId: preparation.protocolId,
    status: V2_INVENTORY.manifestStatus,
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
      expectedParallelWallMinutes: [10, 22],
      expectedAggregateModelMinutes: [12, 30],
      expectedAggregateComputeHours: [0.2, 0.5],
      absoluteGateTimeoutMinutes: 60,
      estimateBasis:
        "The failed predecessor attempted all ten contexts in 17.84 wall-minutes and 24.31 aggregate model-minutes; the recovery preserves the same ramp and timeouts while losslessly reducing the maximum copied input from 98,839 to 83,711 bytes.",
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
    },
    preparation: V2_INVENTORY.preparation,
    contexts: preparation.contexts,
    retiredGateEvidence: {
      execution: RETIRED_EXECUTION,
      analysis: RETIRED_ANALYSIS,
      validContexts: retiredExecution.validContexts,
      retries: retiredExecution.retries,
      wallElapsedMs: retiredExecution.wallElapsedMs,
      modelWorkElapsedMs: retiredExecution.modelWorkElapsedMs,
      maximumParallelContextsObserved:
        retiredExecution.maximumParallelContextsObserved,
    },
    priorFailedGateEvidence: {
      execution: PRIOR_FAILED_EXECUTION,
      timeoutDiagnosis: TIMEOUT_DIAGNOSIS,
      status: priorFailedExecution.status,
      validContexts: priorFailedExecution.validContexts,
      invalidContexts: priorFailedExecution.invalidContexts,
      retries: priorFailedExecution.retries,
      preservedAsFailed: true,
      priorValidOutputsReusableForSuccessorAcceptance: false,
    },
    isolation: {
      freshTemporaryCodexHomePerContext: true,
      freshSourceDirectoryPerContext: true,
      oneDebatePerContext: true,
      fullTenContextFreshExecutionRequired: true,
      priorNineValidOutputsUnavailable: true,
      priorFailedAttemptUnavailable: true,
      priorExecutionMetadataUnavailable: true,
      completeCandidateTransportAvailable: true,
      fullValidatorEvidenceUnavailableToModel: true,
      otherDebatesUnavailable: true,
      legacyAssessmentsUnavailable: true,
      independentJudgmentsUnavailable: true,
      ratingsScoresWinnersTagsAndPublicationProseUnavailable: true,
      proposedScorePolicyUnavailable: true,
    },
    executionPolicy: {
      contexts: V2_INVENTORY.contexts,
      attemptsPerContext: 1,
      retriesMaximum: 0,
      timeoutMsPerContext: 600000,
      absoluteGateTimeoutMs: 3600000,
      maximumParallelContexts: 2,
      schedulerRamp: [1, 2],
      rampOneServesAsOperationalCanary: true,
      eachRampPhaseMustPassBeforeExpansion: true,
      abortBeforeNextRampPhaseOnFailure: true,
      continueIndependentContextsWithinStartedPhaseAfterFailure: true,
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
      validInventoriesRequired: V2_INVENTORY.contexts,
      deterministicLockedInventoryCompilationsRequired: V2_INVENTORY.contexts,
      everyCandidateAvailableDuringSelection: true,
      compactTransportSemanticIdentityRequired: true,
      columnarTransportRoundTripIdentityRequired: true,
      semanticRepairs: 0,
      ratings: 0,
      responseTopology: 0,
      scores: 0,
    },
    authorization: {
      modelContexts: true,
      deterministicValidation: true,
      deterministicCompilation: true,
      analysis: true,
      retry: false,
      semanticCorrection: false,
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
      execution: V2_INVENTORY.execution,
      analysis: V2_INVENTORY.analysis,
      proposals: preparation.contexts.map((context) => context.proposalOutput),
      lockedInventories: preparation.contexts.map(
        (context) => context.lockedInventoryOutput
      ),
      validations: preparation.contexts.map(
        (context) => context.validationOutput
      ),
      provenance: preparation.contexts.map(
        (context) => context.provenanceOutput
      ),
    },
    futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
    sourceHashes,
  };
  if (shouldWrite) await writeFile(V2_INVENTORY.manifest, jsonBytes(manifest));
  const summary = {
    status: shouldWrite ? "frozen" : "preview",
    debates: manifest.contexts.map((context) => context.debateNumber),
    contexts: manifest.contexts.length,
    candidates: preparation.totals.candidates,
    schedulerRamp: manifest.executionPolicy.schedulerRamp,
    maximumParallelContexts: manifest.executionPolicy.maximumParallelContexts,
    operationalCanary: "first-real-context",
    expectedParallelWallMinutes: manifest.costEstimate.expectedParallelWallMinutes,
    expectedAggregateComputeHours:
      manifest.costEstimate.expectedAggregateComputeHours,
    authentication: manifest.costEstimate.authentication,
    maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes,
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

export async function validateV2InventoryColumnarRecoveryProposal({
  proposalPath,
  preparationPath,
  debateNumber,
  shouldWrite,
}) {
  assertV4(
    proposalPath && preparationPath && debateNumber,
    "inventory proposal, preparation, and debate number are required"
  );
  const preparation = JSON.parse(await readFile(preparationPath, "utf8"));
  assertV4(
    preparation.status ===
      "ten-fresh-columnar-v2-validation-inventory-contexts-prepared" &&
      preparation.developmentValidationOnly === true &&
      preparation.productionCanary === false &&
      preparation.stagingOnly === true &&
      preparation.currentCanaryDisposition?.reclassified === false &&
      preparation.proposedPolicy?.promoted === false,
    "v2 validation inventory preparation unavailable"
  );
  const context = preparation.contexts.find(
    (item) => item.debateNumber === debateNumber
  );
  assertV4(context, `${debateNumber}: inventory context unavailable`);
  const [proposal, evidenceBundle, eventsDocument] = await Promise.all([
    readFile(proposalPath, "utf8").then(JSON.parse),
    readFile(context.validatorCandidateEvidenceBundle, "utf8").then(JSON.parse),
    readFile(context.originalEvents, "utf8").then(JSON.parse),
  ]);
  const compiled = compileV422116LockedInventory(
    proposal,
    evidenceBundle,
    eventsDocument
  );
  const belowHighAttributionMoveIds = compiled.lockedInventory.moves
    .filter((move) => move.attributionConfidence !== "high")
    .map((move) => move.moveId);
  const summary = {
    schemaVersion:
      "1.0-score-stability-v2-fresh-validation-columnar-score-blind-inventory-recovery-validation",
    protocolId: preparation.protocolId,
    status: "passed",
    developmentValidationOnly: true,
    productionCanary: false,
    stagingOnly: true,
    debateNumber,
    sections: compiled.lockedInventory.sections.length,
    moves: compiled.lockedInventory.moves.length,
    proMoves: compiled.lockedInventory.moves.filter(
      (move) => move.side === "pro"
    ).length,
    conMoves: compiled.lockedInventory.moves.filter(
      (move) => move.side === "con"
    ).length,
    belowHighAttributionMoveIds,
    belowHighAttributionMovesRequireAudioVerification: true,
    everyCandidateAvailableDuringSelection: true,
    compactModelTransportUsed: true,
    losslessColumnarModelTransportUsed: true,
    omittedValidatorFieldsRestoredFromFullEvidenceBundle: true,
    finalEvidenceSourceExact: compiled.validation.finalEvidenceSourceExact,
    ratingsAbsent: compiled.validation.ratingsAbsent,
    responseTopologyAbsent: compiled.validation.responseTopologyAbsent,
    semanticRepairPerformed: false,
    currentCanaryReclassified: false,
    proposedPolicyPromoted: false,
    scoresDerived: 0,
  };
  if (shouldWrite) {
    for (const output of [
      context.lockedInventoryOutput,
      context.validationOutput,
      context.provenanceOutput,
    ]) {
      await mkdir(path.dirname(output), { recursive: true });
    }
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
  const manifest = JSON.parse(await readFile(V2_INVENTORY.manifest, "utf8"));
  assertV4(
    manifest.status === V2_INVENTORY.manifestStatus &&
      manifest.developmentValidationOnly === true &&
      manifest.productionCanary === false &&
      manifest.stagingOnly === true &&
      manifest.currentCanaryDisposition?.reclassified === false &&
      manifest.proposedPolicy?.promoted === false &&
      manifest.authorization?.modelContexts === true &&
      manifest.contexts?.length === V2_INVENTORY.contexts &&
      manifest.priorFailedGateEvidence?.preservedAsFailed === true &&
      manifest.priorFailedGateEvidence
        ?.priorValidOutputsReusableForSuccessorAcceptance === false &&
      manifest.isolation?.fullTenContextFreshExecutionRequired === true &&
      manifest.isolation?.priorNineValidOutputsUnavailable === true &&
      manifest.isolation?.priorFailedAttemptUnavailable === true &&
      manifest.modelInputs?.columnarTransportGuide ===
        manifest.preparation.replace(/preparation-manifest\.json$/, "columnar-transport-guide.md") &&
      manifest.executionPolicy?.maximumParallelContexts === 2 &&
      JSON.stringify(manifest.executionPolicy?.schedulerRamp) ===
        JSON.stringify([1, 2]) &&
      manifest.executionPolicy?.rampOneServesAsOperationalCanary === true &&
      manifest.executionPolicy?.retriesMaximum === 0 &&
      manifest.executionPolicy?.timeoutMsPerContext === 600000 &&
      manifest.executionPolicy?.timeoutExtensionApplied === false,
    "v2 inventory execution is unauthorized"
  );
  assertV4(
    manifest.model?.label === "5.6 Sol" &&
      manifest.model?.slug === "gpt-5.6-sol" &&
      manifest.model?.reasoningEffort === "low" &&
      manifest.model?.authentication === "ChatGPT subscription",
    "frozen inventory model boundary changed"
  );
  await verifyHashes(manifest.sourceHashes, "manifest source");
  return manifest;
}

export async function runV2InventoryColumnarRecovery() {
  const manifest = await readAuthorizedManifest();
  const codex = manifest.executionEnvironment.codexPath;
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  assertV4(
    execFileSync(codex, ["--version"], { encoding: "utf8" }).trim() ===
      manifest.executionEnvironment.codexCliVersion,
    "frozen Codex CLI version changed"
  );
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) {
    assertV4(!(await exists(future)), `future output already exists: ${future}`);
  }
  await access(codex);
  await access(authSource);
  let activeContexts = 0;
  let maximumParallelContextsObserved = 0;
  const gateStartedAt = new Date().toISOString();
  const gateStarted = Date.now();
  const gateDeadline = gateStarted + manifest.executionPolicy.absoluteGateTimeoutMs;

  async function executeContext(context, contextIndex) {
    const remainingGateMs = gateDeadline - Date.now();
    assertV4(
      remainingGateMs > 0,
      "absolute inventory gate timeout reached before context launch"
    );
    const contextTimeoutMs = Math.min(
      manifest.executionPolicy.timeoutMsPerContext,
      remainingGateMs
    );
    const temporary = await mkdtemp(
      path.join(
        os.tmpdir(),
        `slugfester-v2-validation-inventory-columnar-recovery-${context.debateNumber}-`
      )
    );
    const isolatedCodexHome = await mkdtemp(
      path.join(
        os.tmpdir(),
        `slugfester-v2-validation-inventory-columnar-recovery-home-${context.debateNumber}-`
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
        [manifest.modelInputs.columnarTransportGuide, "columnar-transport-guide.md"],
        [context.packet, "packet.json"],
        [context.modelCandidateTransport, "candidate-evidence-bundle.json"],
        [context.schema, "schema.json"],
      ]) {
        await copyFile(source, path.join(temporary, target));
      }
      await copyFile(authSource, path.join(isolatedCodexHome, "auth.json"));
      const env = { ...process.env, CODEX_HOME: isolatedCodexHome };
      for (const key of manifest.executionPolicy.removedEnvironmentVariables) {
        delete env[key];
      }
      const prompt = `Read manual.md, columnar-transport-guide.md, packet.json, candidate-evidence-bundle.json, and schema.json completely; read nothing else. Act only as the isolated score-blind inventory curator for fresh development-validation recovery Debate ${context.debateNumber}. The candidate evidence uses the lossless columnar representation defined in columnar-transport-guide.md. All ${context.candidates} discovered candidates and all original model-visible fields remain present with source-exact excerpts. Produce four to six weighted issue sections totaling exactly 100 percent, with one or two pro and one or two con selections in every section and no candidate used twice. Define one route per side and its burden bridges. Author only each selected candidate ID, a unique move ID, a global constructive-or-reply classification, and a source-faithful proposition. A reply must have an earlier selected opposing move in source chronology, but do not name targets. Ratings, response topology, burden contact, adjustments, scores, winners, tags, Overall Commentary, AI Extension, score-policy analysis, prior execution information, and publication prose are prohibited. Return exactly one schema-conforming JSON object.`;
      process.stdout.write(
        `[v2-validation-inventory-columnar-recovery] starting ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber}\n`
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
        copiedInputBytes: context.copiedInputBytes,
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
          proposalWritten: false,
          stdoutTail: invocation.stdout.slice(-12000),
          stderrTail: invocation.stderr.slice(-12000),
        };
      } else {
        await mkdir(path.dirname(context.proposalOutput), { recursive: true });
        await copyFile(resultPath, context.proposalOutput);
        const validation = await runChild(
          process.execPath,
          [
            VALIDATOR_PATH,
            context.proposalOutput,
            manifest.preparation,
            context.debateNumber,
            "--write",
          ],
          { cwd: process.cwd(), env: process.env },
          180000
        );
        const valid =
          validation.code === 0 &&
          validation.signal === null &&
          !validation.timedOut;
        record = {
          ...base,
          status: valid ? "completed-valid" : "output-validation-failed",
          accepted: valid,
          proposalWritten: true,
          proposalSha256: sha256(await readFile(context.proposalOutput)),
          validationSummary: valid ? JSON.parse(validation.stdout) : null,
          validationMessage: valid
            ? null
            : `${validation.stdout}\n${validation.stderr}`.trim().slice(-10000),
          lockedInventorySha256: valid
            ? sha256(await readFile(context.lockedInventoryOutput))
            : null,
          validationSha256: valid
            ? sha256(await readFile(context.validationOutput))
            : null,
          provenanceSha256: valid
            ? sha256(await readFile(context.provenanceOutput))
            : null,
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
      `[v2-validation-inventory-columnar-recovery] Debate ${context.debateNumber} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`
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
    const passed = indexes.every((index) => resultsByIndex[index].accepted);
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
    rampPassed = await runFixedIndexes(
      Array.from(
        { length: manifest.contexts.length - 3 },
        (_, index) => index + 3
      ),
      2,
      "steady-two"
    );
  }
  const results = resultsByIndex.filter(Boolean);
  const validContexts = results.filter((result) => result.accepted).length;
  const execution = {
    schemaVersion:
      "1.0-score-stability-v2-fresh-validation-columnar-score-blind-inventory-recovery-model-execution",
    protocolId: manifest.protocolId,
    status:
      validContexts === manifest.contexts.length
        ? V2_INVENTORY.executionPassedStatus
        : V2_INVENTORY.executionFailedStatus,
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
    scoresDerived: 0,
    authorization: {
      deterministicAnalysis: true,
      retry: false,
      semanticCorrection: false,
      independentJudgmentPacketPreparation:
        validContexts === manifest.contexts.length,
      independentJudgmentModelExecution: false,
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
        contextsAttempted: execution.contextsAttempted,
        contextsUnattempted: execution.contextsUnattempted,
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

export async function analyzeV2InventoryColumnarRecovery({ shouldWrite }) {
  const manifest = await readAuthorizedManifest();
  const execution = JSON.parse(
    await readFile(manifest.artifacts.execution, "utf8")
  );
  assertV4(
    execution.status === V2_INVENTORY.executionPassedStatus &&
      execution.validContexts === V2_INVENTORY.contexts &&
      execution.invalidContexts === 0 &&
      execution.retries === 0 &&
      execution.rampPassed === true,
    "all ten v2 inventory contexts must pass without retry before analysis"
  );
  const debates = [];
  for (const result of execution.results) {
    const context = manifest.contexts[result.contextIndex];
    const [inventory, validation] = await Promise.all([
      readFile(context.lockedInventoryOutput, "utf8").then(JSON.parse),
      readFile(context.validationOutput, "utf8").then(JSON.parse),
    ]);
    debates.push({
      debateNumber: result.debateNumber,
      debateId: context.debateId,
      family: context.family,
      sourceComplexityBand: context.sourceComplexityBand,
      candidatesAvailable: context.candidates,
      sections: inventory.sections.length,
      moves: inventory.moves.length,
      proMoves: inventory.moves.filter((move) => move.side === "pro").length,
      conMoves: inventory.moves.filter((move) => move.side === "con").length,
      constructive: inventory.moves.filter(
        (move) => move.moveKind === "constructive"
      ).length,
      replies: inventory.moves.filter((move) => move.moveKind === "reply").length,
      belowHighAttributionMoveIds: validation.belowHighAttributionMoveIds,
      belowHighAttributionMovesRequireAudioVerification: true,
      lockedInventory: context.lockedInventoryOutput,
      lockedInventorySha256: result.lockedInventorySha256,
      finalEvidenceSourceExact: validation.finalEvidenceSourceExact,
      ratingsAbsent: validation.ratingsAbsent,
      responseTopologyAbsent: validation.responseTopologyAbsent,
      compactModelTransportUsed: validation.compactModelTransportUsed,
      losslessColumnarModelTransportUsed:
        validation.losslessColumnarModelTransportUsed,
      elapsedMs: result.elapsedMs,
    });
  }
  assertV4(
    debates.every(
      (debate) =>
        debate.sections >= 4 &&
        debate.sections <= 6 &&
        debate.moves >= 8 &&
        debate.moves <= 24 &&
        debate.proMoves >= 4 &&
        debate.conMoves >= 4 &&
        debate.finalEvidenceSourceExact &&
        debate.ratingsAbsent &&
        debate.responseTopologyAbsent &&
        debate.compactModelTransportUsed &&
        debate.losslessColumnarModelTransportUsed
    ),
    "locked v2 inventory acceptance drifted"
  );
  const belowHighAttributionMoveIds = debates.flatMap((debate) =>
    debate.belowHighAttributionMoveIds.map((moveId) => ({
      debateNumber: debate.debateNumber,
      moveId,
    }))
  );
  const analysis = {
    schemaVersion:
      "1.0-score-stability-v2-fresh-validation-columnar-score-blind-inventory-recovery-analysis",
    protocolId: manifest.protocolId,
    status: V2_INVENTORY.analysisStatus,
    developmentValidationOnly: true,
    productionCanary: false,
    stagingOnly: true,
    AIOnly: true,
    currentCanaryDisposition: structuredClone(
      manifest.currentCanaryDisposition
    ),
    proposedPolicy: { ...structuredClone(manifest.proposedPolicy), promoted: false },
    independentJudgmentEvidenceHeldOut: true,
    execution: {
      contextsPlanned: V2_INVENTORY.contexts,
      contextsAttempted: execution.contextsAttempted,
      validContexts: execution.validContexts,
      invalidContexts: execution.invalidContexts,
      retries: 0,
      schedulerRamp: execution.schedulerRamp,
      rampPhases: execution.rampPhases,
      maximumParallelContextsObserved:
        execution.maximumParallelContextsObserved,
      wallElapsedMs: execution.wallElapsedMs,
      modelWorkElapsedMs: execution.modelWorkElapsedMs,
    },
    debates,
    acceptance: {
      tenValidInventories: true,
      tenDeterministicCompilations: true,
      everyDiscoveredCandidateAvailableToCurator: true,
      compactTransportSemanticIdentity: true,
      columnarTransportRoundTripIdentity: true,
      semanticRepairs: 0,
      ratings: 0,
      responseTopology: 0,
      scores: 0,
      passed: true,
    },
    audioPolicy: {
      selectedBelowHighAttributionMoveRequiresVerification: true,
      mediumConfidenceAlwaysRequiresVerification: true,
      pendingVerificationMoves: belowHighAttributionMoveIds,
      audioCallsThisStage: 0,
    },
    totals: {
      debates: debates.length,
      candidatesAvailable: debates.reduce(
        (sum, debate) => sum + debate.candidatesAvailable,
        0
      ),
      movesLocked: debates.reduce((sum, debate) => sum + debate.moves, 0),
      proMoves: debates.reduce((sum, debate) => sum + debate.proMoves, 0),
      conMoves: debates.reduce((sum, debate) => sum + debate.conMoves, 0),
      pendingAudioVerificationMoves: belowHighAttributionMoveIds.length,
      modelContextsExecuted: execution.contextsAttempted,
      audioCalls: 0,
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
  console.log(
    JSON.stringify(
      {
        status: analysis.status,
        execution: analysis.execution,
        debates,
        totals: analysis.totals,
        nextAuthorized: "independent-judgment-packet-preparation",
        independentJudgmentModelExecutionAuthorized: false,
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

export async function testV2InventoryColumnarRecoveryGate() {
  const preparation = await readPreparation();
  if (!(await exists(V2_INVENTORY.manifest))) {
    const summary = {
      status: "passed-prefreeze",
      contexts: V2_INVENTORY.contexts,
      candidates: V2_INVENTORY.candidates,
      maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes,
      currentCanaryStillFailed: true,
      proposedPolicyPromoted: false,
      modelContextsExecuted: 0,
      scoresDerived: 0,
    };
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }
  const manifest = await readAuthorizedManifest();
  assertV4(
    manifest.executionPolicy?.timeoutMsPerContext === 600000 &&
      manifest.executionPolicy?.absoluteGateTimeoutMs === 3600000 &&
      manifest.executionPolicy?.attemptsPerContext === 1 &&
      manifest.executionPolicy?.timeoutExtensionApplied === false &&
      manifest.authorization?.retry === false &&
      manifest.authorization?.semanticCorrection === false,
    "inventory timeout, attempt, or correction boundary drifted"
  );
  assertV4(
    manifest.executionEnvironment?.authentication === "ChatGPT subscription" &&
      manifest.costEstimate?.meteredApiCostUsdMaximum === 0 &&
      manifest.costEstimate?.transcriptionCostUsdMaximum === 0,
    "inventory authentication or cost boundary drifted"
  );
  assertV4(
    manifest.acceptance?.everyCandidateAvailableDuringSelection === true &&
      manifest.acceptance?.compactTransportSemanticIdentityRequired === true &&
      manifest.acceptance?.columnarTransportRoundTripIdentityRequired === true &&
      manifest.transport?.parsedRoundTripIdentityVerified === true &&
      manifest.transport?.maximumCopiedInputBytes === 83711 &&
      manifest.transport?.maximumCopiedInputBytes <=
        manifest.executionPolicy.copiedInputBytesMaximum,
    "inventory transport acceptance drifted"
  );
  assertV4(
    manifest.priorFailedGateEvidence?.preservedAsFailed === true &&
      manifest.priorFailedGateEvidence
        ?.priorValidOutputsReusableForSuccessorAcceptance === false &&
      manifest.isolation?.fullTenContextFreshExecutionRequired === true &&
      manifest.isolation?.priorNineValidOutputsUnavailable === true &&
      manifest.contexts.every(
        (context) =>
          context.modelCandidateTransport.startsWith(
            `${V2_INVENTORY.root}/candidate-transport/`
          ) &&
          context.proposalOutput.startsWith(
            `${V2_INVENTORY.root}/inventory-proposals/`
          ) &&
          context.lockedInventoryOutput.startsWith(
            `${V2_INVENTORY.root}/locked-inventories/`
          )
      ),
    "recovery freshness or namespace isolation drifted"
  );
  for (const key of [
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
        `future output exists before inventory execution: ${future}`
      );
    }
    const summary = {
      status: "passed-frozen",
      debates: V2_INVENTORY.contexts,
      contexts: V2_INVENTORY.contexts,
      candidates: V2_INVENTORY.candidates,
      schedulerRamp: [1, 2],
      maximumParallelContexts: 2,
      operationalCanary: "first-real-context",
      expectedParallelWallMinutes:
        manifest.costEstimate.expectedParallelWallMinutes,
      expectedAggregateComputeHours:
        manifest.costEstimate.expectedAggregateComputeHours,
      authentication: manifest.costEstimate.authentication,
      maximumCopiedInputBytes: manifest.transport.maximumCopiedInputBytes,
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
    execution.contextsPlanned === V2_INVENTORY.contexts &&
      execution.contextsAttempted >= 1 &&
      execution.contextsAttempted <= V2_INVENTORY.contexts &&
      execution.contextsUnattempted ===
        V2_INVENTORY.contexts - execution.contextsAttempted &&
      execution.attempts === execution.contextsAttempted &&
      execution.retries === 0,
    "inventory attempt ledger drifted"
  );
  assertV4(
    execution.maximumParallelContextsObserved <= 2 &&
      JSON.stringify(execution.schedulerRamp) === JSON.stringify([1, 2]) &&
      execution.rampPhases.length >= 1 &&
      execution.rampPhases.length <= 3 &&
      execution.rampPhases[0].phase === "operational-canary-one" &&
      JSON.stringify(execution.rampPhases[0].contextIndexes) ===
        JSON.stringify([0]),
    "inventory executed scheduler ramp drifted"
  );
  for (const result of execution.results) {
    assertV4(
      result.attemptCount === 1 && result.retryCount === 0,
      `${result.debateNumber}: retry ledger drifted`
    );
    if (result.proposalWritten) {
      assertV4(
        result.proposalSha256 ===
          sha256(
            await readFile(manifest.contexts[result.contextIndex].proposalOutput)
          ),
        `${result.debateNumber}: proposal hash drifted`
      );
    }
  }
  if (execution.status !== V2_INVENTORY.executionPassedStatus) {
    assertV4(
      execution.invalidContexts >= 1,
      "failed execution must record an invalid context"
    );
    if (!execution.rampPhases[0].passed) {
      assertV4(
        execution.contextsAttempted === 1 &&
          execution.contextsUnattempted === V2_INVENTORY.contexts - 1,
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
          execution.contextsUnattempted === V2_INVENTORY.contexts - 3,
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
    execution.contextsAttempted === V2_INVENTORY.contexts &&
      execution.contextsUnattempted === 0 &&
      execution.validContexts === V2_INVENTORY.contexts &&
      execution.invalidContexts === 0 &&
      execution.results.every((result) => result.accepted) &&
      execution.rampPassed &&
      execution.rampPhases.length === 3 &&
      execution.rampPhases.every((phase) => phase.passed) &&
      execution.maximumParallelContextsObserved === 2,
    "passing inventory execution or ramp drifted"
  );
  for (const result of execution.results) {
    const context = manifest.contexts[result.contextIndex];
    assertV4(
      result.lockedInventorySha256 ===
        sha256(await readFile(context.lockedInventoryOutput)) &&
        result.validationSha256 ===
          sha256(await readFile(context.validationOutput)) &&
        result.provenanceSha256 ===
          sha256(await readFile(context.provenanceOutput)),
      `${result.debateNumber}: compiled inventory artifact hash drifted`
    );
  }
  if (!(await exists(manifest.artifacts.analysis))) {
    const summary = {
      status: "passed-execution",
      validContexts: V2_INVENTORY.contexts,
      wallElapsedMinutes: Number(
        (execution.wallElapsedMs / 60000).toFixed(2)
      ),
      aggregateModelMinutes: Number(
        (execution.modelWorkElapsedMs / 60000).toFixed(2)
      ),
      retries: 0,
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
    analysis.status === V2_INVENTORY.analysisStatus &&
      analysis.debates.length === V2_INVENTORY.contexts &&
      analysis.acceptance?.passed === true &&
      analysis.currentCanaryDisposition?.reclassified === false &&
      analysis.proposedPolicy?.promoted === false,
    "inventory analysis status drifted"
  );
  assertV4(
    analysis.debates.every(
      (debate) =>
        debate.moves >= 8 &&
        debate.moves <= 24 &&
        debate.proMoves >= 4 &&
        debate.conMoves >= 4 &&
        debate.finalEvidenceSourceExact &&
        debate.ratingsAbsent &&
        debate.responseTopologyAbsent &&
        debate.compactModelTransportUsed &&
        debate.losslessColumnarModelTransportUsed
    ),
    "inventory analysis acceptance drifted"
  );
  assertV4(
    analysis.totals?.scoresDerived === 0 &&
      analysis.authorization?.independentJudgmentPacketPreparation &&
      !analysis.authorization?.independentJudgmentModelExecution &&
      !analysis.authorization?.scoreDerivation &&
      !analysis.authorization?.policyPromotion &&
      !analysis.authorization?.productionMutation &&
      !analysis.authorization?.remainingProductionBatches,
    "premature downstream authorization"
  );
  const summary = {
    status: "passed-complete",
    debates: analysis.totals.debates,
    candidatesAvailable: analysis.totals.candidatesAvailable,
    movesLocked: analysis.totals.movesLocked,
    pendingAudioVerificationMoves:
      analysis.totals.pendingAudioVerificationMoves,
    wallElapsedMinutes: Number(
      (analysis.execution.wallElapsedMs / 60000).toFixed(2)
    ),
    aggregateModelMinutes: Number(
      (analysis.execution.modelWorkElapsedMs / 60000).toFixed(2)
    ),
    retries: 0,
    scoresDerived: 0,
    productionMutation: false,
  };
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}
