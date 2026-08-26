#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  MODEL,
  PROTOCOL_ID,
  ROOT,
  TARGETS,
  buildTransportCorrectedSchema
} from "./lib/assessment-production-post-canary-batch-10-publication-debate-107-transport-correction-1.mjs";
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
const PRIOR_ROOT = `${RESUMPTION_ROOT}/debate-107-correction-1`;
const TRANSPORT_DIAGNOSIS = `${PRIOR_ROOT}/transport-diagnosis.json`;
const PRIOR_PREPARATION = `${PRIOR_ROOT}/execution-preparation-manifest.json`;
const PRIOR_ACTIVATION = `${PRIOR_ROOT}/execution-activation.json`;
const PRIOR_EXECUTION = `${PRIOR_ROOT}/model-execution.json`;
const PRIOR_ANALYSIS = `${PRIOR_ROOT}/analysis.json`;
const PACKET = `${PRIOR_ROOT}/packet.json`;
const CORRECTION_MANUAL = `${PRIOR_ROOT}/manual.md`;
const FAILED_OUTPUT = `${PUBLICATION_ROOT}/outputs/debate-107.json`;
const FAILED_VALIDATION = `${PUBLICATION_ROOT}/validations/debate-107.json`;
const FAILED_PROVENANCE = `${PUBLICATION_ROOT}/provenance/debate-107.json`;
const PUBLICATION_PACKET = `${PUBLICATION_ROOT}/packets/debate-107.json`;
const PASSED_74 = `${PUBLICATION_ROOT}/outputs/debate-74.json`;
const PASSED_142 = `${PUBLICATION_ROOT}/outputs/debate-142.json`;
const SCHEMA = `${ROOT}/schema.json`;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const CAFFEINATE = "/usr/bin/caffeinate";
const CODEX = "/Applications/ChatGPT.app/Contents/Resources/codex";
const paths = [
  TRANSPORT_DIAGNOSIS, PRIOR_PREPARATION, PRIOR_ACTIVATION, PRIOR_EXECUTION,
  PRIOR_ANALYSIS, PACKET, CORRECTION_MANUAL, FAILED_OUTPUT, FAILED_VALIDATION,
  FAILED_PROVENANCE, PUBLICATION_PACKET, PASSED_74, PASSED_142
];
const bytes = Object.fromEntries(await Promise.all(paths.map(async (file) =>
  [file, await readFile(path.resolve(file))])));
const diagnosis = JSON.parse(bytes[TRANSPORT_DIAGNOSIS]);
const priorPreparation = JSON.parse(bytes[PRIOR_PREPARATION]);
const priorActivation = JSON.parse(bytes[PRIOR_ACTIVATION]);
const priorExecution = JSON.parse(bytes[PRIOR_EXECUTION]);
const priorAnalysis = JSON.parse(bytes[PRIOR_ANALYSIS]);
const packet = JSON.parse(bytes[PACKET]);
const failedOutput = JSON.parse(bytes[FAILED_OUTPUT]);
const publicationPacket = JSON.parse(bytes[PUBLICATION_PACKET]);

assertV4(
  diagnosis.status === "diagnosed-response-schema-rejected-before-model-output" &&
    diagnosis.failure.providerErrorCode === "invalid_json_schema" &&
    diagnosis.failure.modelOutputGenerated === false &&
    diagnosis.failure.outputFileWritten === false &&
    diagnosis.failure.baseDebate107OutputMutated === false &&
    diagnosis.boundedTransportCorrectionCandidate.freshIsolatedContexts === 1 &&
    diagnosis.boundedTransportCorrectionCandidate.modelInputsOtherwiseUnchanged === true &&
    canonicalJson(diagnosis.boundedTransportCorrectionCandidate.sameThreeWritableFields) ===
      canonicalJson(TARGETS.map((target) => target.field)),
  "prior transport-failure diagnosis changed"
);
assertV4(
  sha256(bytes[PRIOR_EXECUTION]) === diagnosis.preservedExecution.sha256 &&
    sha256(bytes[FAILED_OUTPUT]) === diagnosis.preservedContent.debate107FailedPublicationOutput.sha256 &&
    sha256(bytes[PASSED_74]) === diagnosis.preservedContent.passedDebate74Output.sha256 &&
    sha256(bytes[PASSED_142]) === diagnosis.preservedContent.passedDebate142Output.sha256,
  "preserved transport-failure artifacts changed"
);
assertV4(
  priorPreparation.userAuthorization?.explicitThreeWritableFieldException === true &&
    priorActivation.status === "frozen-one-context-three-field-debate-107-publication-correction-activated" &&
    priorExecution.status === "result-missing" && priorExecution.attemptCount === 1 &&
    priorExecution.retryCount === 0 && priorExecution.outputWritten === false &&
    priorAnalysis.status === "batch-10-debate-107-three-field-publication-correction-failed" &&
    packet.userAuthorizedThreeFieldException === true &&
    packet.failedPublicationOutputAvailable === false &&
    packet.rejectedExplanationsAvailable === false &&
    canonicalJson(packet.authorizedWritableFields) ===
      canonicalJson(TARGETS.map((target) => target.field)),
  "prior correction boundary changed"
);

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
const schema = buildTransportCorrectedSchema(packet);
const schemaBytes = pretty(schema);
assertV4(
  schema.properties.corrections.type === "object" &&
    schema.properties.corrections.additionalProperties === false &&
    !Object.hasOwn(schema.properties.corrections, "items") &&
    !Object.hasOwn(schema.properties.corrections, "prefixItems"),
  "transport-corrected schema shape changed"
);

const sourceScripts = [
  "scripts/lib/assessment-production-post-canary-batch-10-publication-debate-107-transport-correction-1.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-10-publication-debate-107-transport-correction-1.mjs",
  "scripts/activate-assessment-production-post-canary-batch-10-publication-debate-107-transport-correction-1.mjs",
  "scripts/run-assessment-production-post-canary-batch-10-publication-debate-107-transport-correction-1.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-10-publication-debate-107-transport-correction-1.mjs",
  "scripts/lib/assessment-production-post-canary-batch-10-publication-validation.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "src/data/references.js"
];
const sourceFiles = [
  ...paths,
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
  contextType: "schema-corrected-three-field-ai-extension-novelty-explanation-correction",
  debateNumber: "107",
  debateId: packet.debateId,
  writableFields: TARGETS.map((target) => target.field),
  writableFieldCount: 3,
  packet: PACKET,
  packetSha256: sha256(bytes[PACKET]),
  schema: SCHEMA,
  schemaSha256: sha256(schemaBytes),
  output: `${ROOT}/output.json`,
  validation: `${ROOT}/validation.json`,
  provenance: `${ROOT}/provenance.json`
};
const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-10-publication-debate-107-transport-correction-preparation",
  protocolId: PROTOCOL_ID,
  status: "frozen-one-context-schema-corrected-three-field-debate-107-publication-correction-prepared-not-activated",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 10,
  stagingOnly: true,
  userAuthorization: {
    source: "user message: I authorize that",
    resolvedScope: "one new schema-corrected 5.6 Sol/low ChatGPT-subscription context with the same three Debate 107 writable explanations and all prior restrictions; resume only six untouched contexts after complete validation",
    explicitThreeWritableFieldException: true,
    newContextNotAutomaticRetry: true,
    priorTransportAttemptProducedNoModelOutput: true,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    directIncrementalCostUsdMaximum: 0
  },
  priorTransportFailure: {
    diagnosis: TRANSPORT_DIAGNOSIS,
    diagnosisSha256: sha256(bytes[TRANSPORT_DIAGNOSIS]),
    execution: PRIOR_EXECUTION,
    executionSha256: sha256(bytes[PRIOR_EXECUTION]),
    modelOutputGenerated: false,
    outputReused: false
  },
  schemaCorrection: {
    priorUnsupportedShape: "tuple-array-with-prefixItems-and-items-false",
    correctedShape: "object-with-three-fixed-named-string-properties",
    arrayItemsKeywordPresent: false,
    prefixItemsKeywordPresent: false,
    endpointCompatibilityPreflightPassed: true
  },
  model: MODEL,
  context,
  modelInputs: {
    productionWorkflow: "docs/assessment-production-workflow.md",
    readinessWorkflow: "docs/assessment-workflow-v4.2.21.17.41.md",
    outputContract: "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
    publicationManual: `${PUBLICATION_ROOT}/manual.md`,
    correctionManual: CORRECTION_MANUAL,
    filesPerContext: ["production-workflow.md", "readiness-workflow.md", "output-contract.md", "publication-manual.md", "correction-manual.md", "packet.json", "schema.json"]
  },
  isolation: {
    freshContext: true,
    onlyFrozenInputsAvailable: true,
    priorTransportOutputAvailable: false,
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
  nextAuthorizedAction: "commit-and-push-frozen-schema-corrected-debate-107-context-then-activate"
};
if (shouldWrite) {
  await mkdir(path.resolve(ROOT), { recursive: true });
  await writeFile(path.resolve(SCHEMA), schemaBytes);
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? manifest.status : "preview",
  debate: "107",
  contexts: 1,
  schemaShape: manifest.schemaCorrection.correctedShape,
  writableFields: context.writableFields,
  priorTransportOutputReused: false,
  attempts: 1,
  retries: 0,
  timeoutExtensions: 0,
  costUsdMaximum: 0
}, null, 2));
