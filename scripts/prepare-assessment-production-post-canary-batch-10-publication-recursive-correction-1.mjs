#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  MODEL,
  PACKET_VERSION,
  PROTOCOL_ID,
  ROOT,
  TARGET_FIELD,
  TARGET_MOVE_ID,
  buildCorrectionSchema
} from "./lib/assessment-production-post-canary-batch-10-publication-recursive-correction-1.mjs";
import { validatePublicationTimeoutRecoveryShardOutput } from
  "./lib/assessment-production-post-canary-batch-10-publication-resumption-timeout-recovery.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--frozen-at");
const frozenAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

const RECOVERY_ROOT = path.dirname(ROOT);
const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/publication-reconstruction";
const DIAGNOSIS = `${ROOT}/diagnosis.json`;
const RECOVERY_EXECUTION = `${RECOVERY_ROOT}/model-execution.json`;
const RECOVERY_ANALYSIS = `${RECOVERY_ROOT}/analysis.json`;
const PRO_OUTPUT = `${RECOVERY_ROOT}/outputs/context-0.json`;
const PRO_VALIDATION = `${RECOVERY_ROOT}/validations/context-0.json`;
const CON_OUTPUT = `${RECOVERY_ROOT}/outputs/context-1.json`;
const CON_VALIDATION = `${RECOVERY_ROOT}/validations/context-1.json`;
const PRO_PACKET = `${RECOVERY_ROOT}/packets/context-0.json`;
const CON_PACKET = `${RECOVERY_ROOT}/packets/context-1.json`;
const PUBLICATION_PACKET = `${PUBLICATION_ROOT}/packets/debate-21.json`;
const MANUAL = `${ROOT}/manual.md`;
const PACKET = `${ROOT}/packet.json`;
const SCHEMA = `${ROOT}/schema.json`;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const CAFFEINATE = "/usr/bin/caffeinate";
const CODEX = "/Applications/ChatGPT.app/Contents/Resources/codex";

const [diagnosisBytes, executionBytes, analysisBytes, proBytes, proValidationBytes,
  conBytes, conValidationBytes, proPacketBytes, conPacketBytes,
  publicationPacketBytes] = await Promise.all([
  DIAGNOSIS, RECOVERY_EXECUTION, RECOVERY_ANALYSIS, PRO_OUTPUT, PRO_VALIDATION,
  CON_OUTPUT, CON_VALIDATION, PRO_PACKET, CON_PACKET, PUBLICATION_PACKET
].map((file) => readFile(path.resolve(file))));
const diagnosis = JSON.parse(diagnosisBytes);
const execution = JSON.parse(executionBytes);
const analysis = JSON.parse(analysisBytes);
const proOutput = JSON.parse(proBytes);
const proValidation = JSON.parse(proValidationBytes);
const conOutput = JSON.parse(conBytes);
const conValidation = JSON.parse(conValidationBytes);
const proPacket = JSON.parse(proPacketBytes);
const conPacket = JSON.parse(conPacketBytes);
const publicationPacket = JSON.parse(publicationPacketBytes);

assertV4(
  diagnosis.status === "diagnosed-one-field-con-shard-word-count-failure" &&
    diagnosis.failedShard.failedField === TARGET_FIELD &&
    diagnosis.failedShard.observedWords === 131 &&
    diagnosis.failedShard.acceptedWordsMaximum === 130 &&
    diagnosis.boundedCorrectionCandidate.freshIsolatedContexts === 1 &&
    diagnosis.boundedCorrectionCandidate.retriesMaximum === 0 &&
    diagnosis.boundedCorrectionCandidate.timeoutExtensionsMaximum === 0,
  "one-field correction diagnosis changed"
);
assertV4(
  sha256(executionBytes) === diagnosis.preservedExecution.sha256 &&
    sha256(proBytes) === diagnosis.passedShard.sha256 &&
    sha256(conBytes) === diagnosis.failedShard.sha256,
  "diagnosed recovery artifacts changed"
);
assertV4(
  execution.validContexts === 1 && execution.invalidContexts === 1 &&
    analysis.status === "batch-10-debate-21-publication-timeout-recovery-failed" &&
    proValidation.status === "passed" && conValidation.status === "failed" &&
    proPacket.side === "pro" && conPacket.side === "con",
  "recovery boundary changed"
);
validatePublicationTimeoutRecoveryShardOutput(proOutput, proPacket);
const targetMove = publicationPacket.moves.find(({ moveId }) => moveId === TARGET_MOVE_ID);
assertV4(targetMove && targetMove.side === "con", "target locked move changed");

// Prove every non-target con field remains validation-clean without retaining the
// diagnosed bad critique. The temporary stand-in is never written or merged.
const structuralAuditClone = structuredClone(conOutput);
const standInMoveId = conPacket.moveIds.find((moveId) => moveId !== TARGET_MOVE_ID);
structuralAuditClone.content.moveProse[TARGET_MOVE_ID].critique =
  conOutput.content.moveProse[standInMoveId].critique;
const nonTargetAudit = validatePublicationTimeoutRecoveryShardOutput(
  structuralAuditClone,
  conPacket
);
assertV4(nonTargetAudit.status === "passed", "non-target con fields are not clean");

const packet = {
  schemaVersion: PACKET_VERSION,
  protocolId: PROTOCOL_ID,
  contextIndex: 0,
  productionCanary: false,
  batchNumber: 10,
  stagingOnly: true,
  debateNumber: publicationPacket.debateNumber,
  debateId: publicationPacket.debateId,
  assessmentModel: MODEL.label,
  correctionLevel: 1,
  correctionType: "one-field-publication-critique-structural-correction",
  writableFields: [TARGET_FIELD],
  writableFieldCount: 1,
  allOtherFieldsUnavailableAndImmutable: true,
  failedOutputAvailable: false,
  failedCritiqueAvailable: false,
  participantJudgmentClosed: true,
  publicationScoreLocked: true,
  scoresRepositoryOwnedAndImmutable: true,
  move: targetMove,
  constraints: {
    sentenceCount: 4,
    orderedLabels: [
      "Strongest feature:",
      "Principal limitation:",
      "Live burden:",
      "Locked score:"
    ],
    wordsMinimum: 105,
    wordsMaximum: 130,
    wordsTargetMinimum: 112,
    wordsTargetMaximum: 118,
    charactersMinimum: 880,
    terminalPunctuationRequired: true,
    namedFallacyOrBiasFieldWritable: false
  }
};
const schema = buildCorrectionSchema(packet);
const packetBytes = pretty(packet);
const schemaBytes = pretty(schema);

const sourceScripts = [
  "scripts/lib/assessment-production-post-canary-batch-10-publication-recursive-correction-1.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-10-publication-recursive-correction-1.mjs",
  "scripts/activate-assessment-production-post-canary-batch-10-publication-recursive-correction-1.mjs",
  "scripts/run-assessment-production-post-canary-batch-10-publication-recursive-correction-1.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-10-publication-recursive-correction-1.mjs",
  "scripts/lib/assessment-production-post-canary-batch-10-publication-resumption-timeout-recovery.mjs",
  "scripts/lib/assessment-production-post-canary-batch-10-publication-validation.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "src/data/references.js"
];
const sourceFiles = [
  DIAGNOSIS, RECOVERY_EXECUTION, RECOVERY_ANALYSIS, PRO_OUTPUT, PRO_VALIDATION,
  CON_OUTPUT, CON_VALIDATION, PRO_PACKET, CON_PACKET, PUBLICATION_PACKET,
  MANUAL,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
  `${PUBLICATION_ROOT}/manual.md`,
  `${PUBLICATION_ROOT}/manual-timeout-recovery-1.md`,
  ...sourceScripts
];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
sourceHashes[CAFFEINATE] = sha256(await readFile(CAFFEINATE));
sourceHashes[PACKET] = sha256(packetBytes);
sourceHashes[SCHEMA] = sha256(schemaBytes);

const futureOutputs = [
  `${ROOT}/execution-activation.json`, `${ROOT}/model-execution.json`,
  `${ROOT}/output.json`, `${ROOT}/validation.json`, `${ROOT}/provenance.json`,
  `${ROOT}/analysis.json`, `${ROOT}/corrected-con-shard.json`,
  `${ROOT}/complete-validation-debate-21.json`, `${ROOT}/merge-audit-debate-21.json`,
  `${PUBLICATION_ROOT}/outputs/debate-21.json`
];
for (const file of futureOutputs) assertV4(!(await exists(file)), `future output exists: ${file}`);

const context = {
  contextIndex: 0,
  contextType: "one-field-publication-recursive-correction",
  debateNumber: "21",
  debateId: publicationPacket.debateId,
  writableFields: [TARGET_FIELD],
  packet: PACKET,
  packetSha256: sha256(packetBytes),
  schema: SCHEMA,
  schemaSha256: sha256(schemaBytes),
  output: `${ROOT}/output.json`,
  validation: `${ROOT}/validation.json`,
  provenance: `${ROOT}/provenance.json`
};
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-10-publication-recursive-correction-preparation",
  protocolId: PROTOCOL_ID,
  status: "frozen-one-context-one-field-debate-21-publication-correction-prepared-not-activated",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 10,
  stagingOnly: true,
  userAuthorization: {
    source: "user message: I authorize that",
    resolvedScope: "one fresh 5.6 Sol/low ChatGPT-subscription context correcting only moveProse.con-judaism-character-and-justice.critique; retain passed pro shard and validation-clean con fields; then validate, merge, and resume only nine unattempted contexts",
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    directIncrementalCostUsdMaximum: 0
  },
  model: MODEL,
  context,
  modelInputs: {
    productionWorkflow: "docs/assessment-production-workflow.md",
    readinessWorkflow: "docs/assessment-workflow-v4.2.21.17.41.md",
    outputContract: "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
    publicationManual: `${PUBLICATION_ROOT}/manual.md`,
    timeoutRecoveryManual: `${PUBLICATION_ROOT}/manual-timeout-recovery-1.md`,
    correctionManual: MANUAL,
    filesPerContext: ["production-workflow.md", "readiness-workflow.md", "output-contract.md", "publication-manual.md", "timeout-recovery-manual.md", "correction-manual.md", "packet.json", "schema.json"]
  },
  isolation: {
    freshContext: true,
    onlyFrozenInputsAvailable: true,
    failedOutputAvailable: false,
    failedCritiqueAvailable: false,
    passedShardAvailableToModel: false,
    validationCleanConFieldsAvailableToModel: false,
    writableFields: [TARGET_FIELD],
    allOtherFieldsImmutable: true
  },
  retentionContract: {
    passedProShardRetained: true,
    validationCleanConFieldsRetainedDeterministically: true,
    failedCritiqueRetained: false,
    correctionReplacesExactlyOneField: true,
    completeConShardRevalidationRequired: true,
    completeDebateMergeAndValidationRequired: true
  },
  executionEnvironment: {
    codexPath: CODEX,
    codexCliVersion: execFileSync(CODEX, ["--version"], { encoding: "utf8" }).trim(),
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHome: true,
    isolatedTemporaryWorkingDirectory: true,
    hostAwakeGuard: { path: CAFFEINATE, sha256: sourceHashes[CAFFEINATE], args: ["-dimsu"] }
  },
  executionPolicy: {
    contexts: 1,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0,
    furtherRecursiveCorrectionsMaximum: 0,
    maximumParallelContexts: 1,
    removedEnvironmentVariables: ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"],
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    separateActivationRequired: true
  },
  stopRules: {
    stopOnTransportFailure: true,
    stopOnTimeout: true,
    stopOnValidationFailure: true,
    noAutomaticRetry: true,
    noTimeoutExtension: true,
    noFurtherAutomaticCorrection: true,
    nineOriginalUnattemptedContextsRemainClosedUntilCompleteDebate21Passes: true,
    stopBeforeBatch11: true
  },
  nonTargetConStructuralAudit: {
    status: nonTargetAudit.status,
    temporaryStandInNotWrittenOrRetained: true,
    otherNineCritiquesPassed: true,
    representativeQuotePassed: true,
    overallCommentaryPassed: true,
    aiExtensionPassed: true
  },
  sourceHashes,
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  artifacts: {
    activation: `${ROOT}/execution-activation.json`,
    execution: `${ROOT}/model-execution.json`,
    output: context.output,
    validation: context.validation,
    provenance: context.provenance,
    analysis: `${ROOT}/analysis.json`,
    correctedConShard: `${ROOT}/corrected-con-shard.json`,
    mergedDebate21: `${PUBLICATION_ROOT}/outputs/debate-21.json`,
    completeValidation: `${ROOT}/complete-validation-debate-21.json`,
    mergeAudit: `${ROOT}/merge-audit-debate-21.json`
  },
  authorization: {
    preparation: true,
    activation: true,
    modelExecution: true,
    deterministicValidationAndMerge: true,
    nineContextResumptionAfterPass: true,
    retries: false,
    timeoutExtensions: false,
    furtherRecursiveCorrections: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "commit-and-push-frozen-correction-then-activate-one-context"
};

if (shouldWrite) {
  assertV4(!(await exists(MANIFEST)), "correction preparation already exists");
  await mkdir(path.resolve(ROOT), { recursive: true });
  await writeFile(path.resolve(PACKET), packetBytes);
  await writeFile(path.resolve(SCHEMA), schemaBytes);
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? manifest.status : "preview",
  contexts: 1,
  writableFields: [TARGET_FIELD],
  failedOutputAvailableToModel: false,
  attempts: 1,
  retries: 0,
  timeoutExtensions: 0,
  costUsdMaximum: 0
}, null, 2));
