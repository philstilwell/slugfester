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
  TARGETS,
  buildCorrectionSchema
} from "./lib/assessment-production-post-canary-batch-10-publication-debate-107-correction-1.mjs";
import { validatePostCanaryBatch10PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-10-publication-validation.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--frozen-at");
const frozenAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-10/publication-reconstruction";
const RESUMPTION_ROOT = path.dirname(ROOT);
const DIAGNOSIS = `${RESUMPTION_ROOT}/debate-107-diagnosis.json`;
const RESUMPTION_EXECUTION = `${RESUMPTION_ROOT}/model-execution.json`;
const RESUMPTION_ANALYSIS = `${RESUMPTION_ROOT}/analysis.json`;
const FAILED_OUTPUT = `${PUBLICATION_ROOT}/outputs/debate-107.json`;
const FAILED_VALIDATION = `${PUBLICATION_ROOT}/validations/debate-107.json`;
const FAILED_PROVENANCE = `${PUBLICATION_ROOT}/provenance/debate-107.json`;
const PUBLICATION_PACKET = `${PUBLICATION_ROOT}/packets/debate-107.json`;
const PASSED_74 = `${PUBLICATION_ROOT}/outputs/debate-74.json`;
const PASSED_142 = `${PUBLICATION_ROOT}/outputs/debate-142.json`;
const MANUAL = `${ROOT}/manual.md`;
const PACKET = `${ROOT}/packet.json`;
const SCHEMA = `${ROOT}/schema.json`;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const CAFFEINATE = "/usr/bin/caffeinate";
const CODEX = "/Applications/ChatGPT.app/Contents/Resources/codex";

const paths = [
  DIAGNOSIS, RESUMPTION_EXECUTION, RESUMPTION_ANALYSIS, FAILED_OUTPUT,
  FAILED_VALIDATION, FAILED_PROVENANCE, PUBLICATION_PACKET, PASSED_74, PASSED_142
];
const bytes = Object.fromEntries(await Promise.all(paths.map(async (file) =>
  [file, await readFile(path.resolve(file))])));
const diagnosis = JSON.parse(bytes[DIAGNOSIS]);
const execution = JSON.parse(bytes[RESUMPTION_EXECUTION]);
const analysis = JSON.parse(bytes[RESUMPTION_ANALYSIS]);
const failedOutput = JSON.parse(bytes[FAILED_OUTPUT]);
const failedValidation = JSON.parse(bytes[FAILED_VALIDATION]);
const failedProvenance = JSON.parse(bytes[FAILED_PROVENANCE]);
const publicationPacket = JSON.parse(bytes[PUBLICATION_PACKET]);

assertV4(
  diagnosis.status ===
    "diagnosed-three-field-ai-extension-novelty-explanation-length-failure" &&
    diagnosis.failedContext.invalidFieldCount === 3 &&
    diagnosis.failedContext.temporaryThreeFieldSubstitutionAudit
      .allOtherDeterministicConstraintsPassed === true &&
    canonicalJson(diagnosis.failedContext.invalidFields.map((row) => ({
      itemId: row.itemId,
      arrayIndex: row.arrayIndex,
      field: row.field
    }))) === canonicalJson(TARGETS) &&
    diagnosis.unattemptedContexts.remainClosed === true,
  "Debate 107 three-field diagnosis changed"
);
assertV4(
  sha256(bytes[RESUMPTION_EXECUTION]) === diagnosis.preservedExecution.sha256 &&
    sha256(bytes[FAILED_OUTPUT]) === diagnosis.failedContext.sha256 &&
    sha256(bytes[FAILED_VALIDATION]) === diagnosis.failedContext.validationSha256,
  "diagnosed artifacts changed"
);
assertV4(
  execution.status === "nine-context-publication-resumption-stopped-with-failure" &&
    execution.contextsAttempted === 3 && execution.validContexts === 2 &&
    execution.invalidContexts === 1 && execution.retries === 0 &&
    execution.timeoutExtensions === 0 && execution.correctionContexts === 0 &&
    canonicalJson(execution.unattemptedOriginalContextIndexes) ===
      canonicalJson([4, 5, 6, 7, 8, 9]) &&
    analysis.status === "nine-context-publication-resumption-failed" &&
    failedValidation.status === "failed" &&
    failedProvenance.originalFirstAttempt === true && failedProvenance.attemptCount === 1,
  "publication resumption boundary changed"
);
for (const retained of diagnosis.retainedPassedContexts) {
  assertV4(sha256(bytes[retained.path]) === retained.sha256,
    `retained Debate ${retained.debateNumber} output changed`);
}

const targetItems = TARGETS.map((target) => {
  const item = failedOutput.aiExtension.pro.premises[target.arrayIndex];
  assertV4(item.id === target.itemId, `${target.itemId}: array position changed`);
  return {
    itemId: item.id,
    field: target.field,
    lockedItemText: item.text,
    lockedNoveltyClassification: item.novelty.classification,
    lockedSourceMoveIds: item.novelty.sourceMoveIds
  };
});
const requiredMoveIds = [...new Set(targetItems.flatMap((item) => item.lockedSourceMoveIds))];
const referencedMoves = requiredMoveIds.map((moveId) => {
  const move = publicationPacket.moves.find((candidate) => candidate.moveId === moveId);
  assertV4(move, `${moveId}: referenced move missing`);
  return {
    moveId: move.moveId,
    side: move.side,
    proposition: move.proposition,
    sourceExcerpt: move.sourceExcerpt,
    responseClass: move.response?.class ?? null,
    evidenceBasis: move.evidenceBasis
  };
});
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
  correctionType: "three-field-ai-extension-novelty-explanation-correction",
  userAuthorizedThreeFieldException: true,
  normalRepairWritableFieldsMaximum: 2,
  authorizedWritableFields: TARGETS.map((target) => target.field),
  writableFieldCount: 3,
  allOtherFieldsUnavailableAndImmutable: true,
  rejectedExplanationsAvailable: false,
  failedPublicationOutputAvailable: false,
  targetItems,
  referencedMoves,
  constraints: {
    wordsMinimum: 8,
    wordsMaximum: 35,
    wordsTargetMinimum: 12,
    wordsTargetMaximum: 18,
    terminalPunctuationRequired: true,
    itemTextImmutable: true,
    noveltyClassificationImmutable: true,
    sourceMoveIdsImmutable: true,
    scoresUnavailableAndImmutable: true,
    tagsUnavailableAndImmutable: true
  }
};
const schema = buildCorrectionSchema(packet);
const packetBytes = pretty(packet);
const schemaBytes = pretty(schema);

// The saved invalid output remains untouched; an in-memory stand-in proves that
// every non-target field passes the complete validator.
const auditClone = structuredClone(failedOutput);
for (const target of TARGETS) {
  auditClone.aiExtension.pro.premises[target.arrayIndex].novelty.explanation =
    "This temporary explanation contains eight exact validation words.";
}
const nonTargetAudit = validatePostCanaryBatch10PublicationOutput(
  auditClone,
  publicationPacket
);
assertV4(nonTargetAudit.status === "passed", "non-target Debate 107 fields changed");

const sourceScripts = [
  "scripts/lib/assessment-production-post-canary-batch-10-publication-debate-107-correction-1.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-10-publication-debate-107-correction-1.mjs",
  "scripts/activate-assessment-production-post-canary-batch-10-publication-debate-107-correction-1.mjs",
  "scripts/run-assessment-production-post-canary-batch-10-publication-debate-107-correction-1.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-10-publication-debate-107-correction-1.mjs",
  "scripts/lib/assessment-production-post-canary-batch-10-publication-validation.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "src/data/references.js"
];
const sourceFiles = [
  ...paths,
  MANUAL,
  "docs/assessment-production-workflow.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
  `${PUBLICATION_ROOT}/manual.md`,
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
  `${ROOT}/analysis.json`, `${ROOT}/corrected-debate-107.json`,
  `${ROOT}/complete-validation-debate-107.json`, `${ROOT}/merge-audit-debate-107.json`
];
for (const file of [MANIFEST, ...futureOutputs]) {
  assertV4(!(await exists(file)), `future output exists: ${file}`);
}

const context = {
  contextIndex: 0,
  contextType: "three-field-ai-extension-novelty-explanation-correction",
  debateNumber: "107",
  debateId: publicationPacket.debateId,
  writableFields: TARGETS.map((target) => target.field),
  writableFieldCount: 3,
  packet: PACKET,
  packetSha256: sha256(packetBytes),
  schema: SCHEMA,
  schemaSha256: sha256(schemaBytes),
  output: `${ROOT}/output.json`,
  validation: `${ROOT}/validation.json`,
  provenance: `${ROOT}/provenance.json`
};
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-10-publication-debate-107-correction-preparation",
  protocolId: PROTOCOL_ID,
  status: "frozen-one-context-three-field-debate-107-publication-correction-prepared-not-activated",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 10,
  stagingOnly: true,
  userAuthorization: {
    source: "user message: I authorize that",
    resolvedScope: "one fresh 5.6 Sol/low ChatGPT-subscription context correcting only three Debate 107 AI-extension novelty explanations; retain every other Debate 107 field and passed Debates 74 and 142; resume only six untouched contexts after complete validation",
    explicitThreeWritableFieldException: true,
    normalRepairWritableFieldsMaximum: 2,
    authorizedWritableFields: 3,
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
    correctionManual: MANUAL,
    filesPerContext: ["production-workflow.md", "readiness-workflow.md", "output-contract.md", "publication-manual.md", "correction-manual.md", "packet.json", "schema.json"]
  },
  isolation: {
    freshContext: true,
    onlyFrozenInputsAvailable: true,
    failedPublicationOutputAvailable: false,
    rejectedExplanationsAvailable: false,
    passedDebateOutputsAvailable: false,
    writableFields: TARGETS.map((target) => target.field),
    allOtherFieldsImmutable: true,
    scoresUnavailableAndImmutable: true
  },
  retentionContract: {
    passedDebates74And142Retained: true,
    allValidationCleanDebate107FieldsRetainedDeterministically: true,
    rejectedExplanationsRetained: false,
    correctionReplacesExactlyThreeFields: true,
    completeDebate107RevalidationRequired: true,
    sixOriginalUnattemptedContextsRemainClosedUntilPass: true
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
    furtherCorrectionsMaximum: 0,
    maximumParallelContexts: 1,
    removedEnvironmentVariables: ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"],
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    separateActivationRequired: true
  },
  stopRules: {
    stopOnSourceHashMismatch: true,
    stopOnTransportFailure: true,
    stopOnTimeout: true,
    stopOnValidationFailure: true,
    noAutomaticRetry: true,
    noTimeoutExtension: true,
    noFurtherAutomaticCorrection: true,
    sixOriginalUnattemptedContextsRemainClosedUntilCompleteDebate107Passes: true,
    stopBeforeBatch11: true
  },
  nonTargetDebate107Audit: {
    status: nonTargetAudit.status,
    temporaryStandInsWrittenOrRetained: false,
    allOtherDeterministicConstraintsPassed: true,
    validationSummary: nonTargetAudit
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
    correctedDebate107: `${ROOT}/corrected-debate-107.json`,
    completeValidation: `${ROOT}/complete-validation-debate-107.json`,
    mergeAudit: `${ROOT}/merge-audit-debate-107.json`,
    acceptedBaseOutput: FAILED_OUTPUT,
    acceptedBaseValidation: FAILED_VALIDATION,
    acceptedBaseProvenance: FAILED_PROVENANCE
  },
  authorization: {
    preparation: true,
    activation: true,
    modelExecution: true,
    deterministicMergeAndValidation: true,
    sixContextResumptionAfterPass: true,
    retries: false,
    timeoutExtensions: false,
    furtherCorrections: false,
    paidServices: false,
    productionMutation: false,
    nextBatchSelection: false
  },
  nextAuthorizedAction: "commit-and-push-frozen-debate-107-correction-then-activate-one-context"
};
if (shouldWrite) {
  await mkdir(path.resolve(ROOT), { recursive: true });
  await writeFile(path.resolve(PACKET), packetBytes);
  await writeFile(path.resolve(SCHEMA), schemaBytes);
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? manifest.status : "preview",
  debate: "107",
  contexts: 1,
  writableFields: TARGETS.map((target) => target.field),
  rejectedExplanationsAvailableToModel: false,
  attempts: 1,
  retries: 0,
  timeoutExtensions: 0,
  costUsdMaximum: 0
}, null, 2));
