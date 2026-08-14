#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const activatedIndex = process.argv.indexOf("--activated-at");
const activatedAt = activatedIndex >= 0 ? process.argv[activatedIndex + 1] : null;
assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)), "--activated-at requires an ISO timestamp");

const ROOT = "docs/assessment-production/post-canary-continuation-v1/source-normalization-repair";
const PLAN = `${ROOT}/repair-plan.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/execution.json`;
const REPAIR_RECORDS = [`${ROOT}/debate-088-repair-record.json`, `${ROOT}/debate-127-repair-record.json`];
const CORPUS_AUDIT = "docs/calibration/v2.1/corpus-transcript-audit.json";
const PRODUCTION_MANIFEST = "docs/assessment-production/manifest-v1.json";
const CONTINUATION_PREPARATION = "docs/assessment-production/post-canary-continuation-v1/preparation-manifest.json";
const CONTINUATION_ANALYSIS = "docs/assessment-production/post-canary-continuation-v1/analysis.json";
const WORKFLOW = "docs/assessment-production-workflow.md";
const VALIDATOR = "scripts/validate-corpus-transcripts.mjs";
const NORMALIZER = "scripts/lib/v418-source-integrity.mjs";
const PLAN_SCRIPT = "scripts/prepare-assessment-production-post-canary-source-normalization-repair-v1.mjs";
const PLAN_TEST = "scripts/test-assessment-production-post-canary-source-normalization-repair-v1.mjs";
const PREPARE_SCRIPT = "scripts/prepare-assessment-production-post-canary-source-normalization-repair-activation-v1.mjs";
const RUNNER = "scripts/run-assessment-production-post-canary-source-normalization-repair-v1.mjs";
const TEST = "scripts/test-assessment-production-post-canary-source-normalization-repair-activation-v1.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const serializedJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const transcriptLines = (value) => value.endsWith("\n") ? value.slice(0, -1).split("\n") : value.split("\n");
const wordCount = (value) => value.split(/\s+/).filter(Boolean).length;
const git = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();

if (shouldWrite) assertV4(!(await exists(ACTIVATION)), "immutable execution activation already exists");
for (const future of [EXECUTION, ...REPAIR_RECORDS]) assertV4(!(await exists(future)), `${future}: future output already exists`);

const sourcePaths = [
  PLAN,
  ANALYSIS,
  CORPUS_AUDIT,
  PRODUCTION_MANIFEST,
  CONTINUATION_PREPARATION,
  CONTINUATION_ANALYSIS,
  WORKFLOW,
  VALIDATOR,
  NORMALIZER,
  PLAN_SCRIPT,
  PLAN_TEST,
  PREPARE_SCRIPT,
  RUNNER,
  TEST
];
const sourceEntries = await Promise.all(sourcePaths.map(async (file) => [file, await readFile(file)]));
const sourceBytes = Object.fromEntries(sourceEntries);
const sourceHashes = Object.fromEntries(sourceEntries.map(([file, bytes]) => [file, sha256(bytes)]));
const plan = JSON.parse(sourceBytes[PLAN]);
const analysis = JSON.parse(sourceBytes[ANALYSIS]);
const corpusAudit = JSON.parse(sourceBytes[CORPUS_AUDIT]);

assertV4(
  plan.status === "two-debate-zero-duration-derived-event-repair-plan-frozen-awaiting-execution-activation-decision" &&
    analysis.status === "two-debate-zero-duration-source-repair-plan-analysis-passed-awaiting-activation-decision" &&
    analysis.repairPlan.sha256 === sha256(sourceBytes[PLAN]) &&
    plan.authorization.repairExecutionActivationPreparation === false &&
    plan.authorization.repairExecution === false &&
    plan.authorization.sourceMutation === false &&
    plan.authorization.modelExecution === false &&
    plan.authorization.productionMutation === false,
  "frozen source repair plan boundary drifted"
);
for (const [file, expected] of Object.entries(plan.sourceHashes)) assertV4(sha256(await readFile(file)) === expected, `${file}: repair-plan source drifted`);
assertV4(plan.targets.length === 2 && canonicalJson(plan.targets.map((target) => target.debateNumber)) === canonicalJson(["88", "127"]), "repair targets drifted");

const auditProjection = structuredClone(corpusAudit);
const targetProjections = [];
const exactExistingMutablePaths = [];
for (const target of plan.targets) {
  const [eventBytes, transcriptBytes, manifestBytes, rawBytes] = await Promise.all([
    readFile(target.projected.events.path),
    readFile(target.projected.transcript.path),
    readFile(target.projected.localManifest.path),
    readFile(target.projected.rawCaption.path)
  ]);
  assertV4(sha256(eventBytes) === target.projected.events.beforeSha256, `Debate ${target.debateNumber}: events baseline drifted`);
  assertV4(sha256(transcriptBytes) === target.projected.transcript.beforeSha256, `Debate ${target.debateNumber}: transcript baseline drifted`);
  assertV4(sha256(manifestBytes) === target.projected.localManifest.beforeSha256, `Debate ${target.debateNumber}: manifest baseline drifted`);
  assertV4(sha256(rawBytes) === target.projected.rawCaption.beforeAndAfterSha256, `Debate ${target.debateNumber}: raw baseline drifted`);

  const events = JSON.parse(eventBytes);
  const lines = transcriptLines(transcriptBytes.toString("utf8"));
  const manifest = JSON.parse(manifestBytes);
  const repairedEvents = events.filter((_, index) => index !== target.diagnosis.normalizedEventIndex);
  normalizeV418Events(repairedEvents);
  const repairedLines = lines.filter((_, index) => index !== target.diagnosis.normalizedEventIndex);
  const repairedEventBytes = Buffer.from(serializedJson(repairedEvents));
  const repairedTranscriptBytes = Buffer.from(`${repairedLines.join("\n")}\n`);
  const repairedManifestBytes = Buffer.from(serializedJson({
    ...structuredClone(manifest),
    normalizedEventsSha256: sha256(repairedEventBytes),
    transcriptSha256: sha256(repairedTranscriptBytes),
    eventCount: repairedEvents.length,
    wordCount: wordCount(repairedTranscriptBytes.toString("utf8"))
  }));
  assertV4(sha256(repairedEventBytes) === target.projected.events.afterSha256, `Debate ${target.debateNumber}: event projection drifted`);
  assertV4(sha256(repairedTranscriptBytes) === target.projected.transcript.afterSha256, `Debate ${target.debateNumber}: transcript projection drifted`);
  assertV4(sha256(repairedManifestBytes) === target.projected.localManifest.afterSha256, `Debate ${target.debateNumber}: manifest projection drifted`);

  const auditEntry = auditProjection.entries.find((entry) => entry.debateId === target.debateId);
  assertV4(
    auditEntry?.normalizedEventsSha256 === target.projected.events.beforeSha256 &&
      auditEntry.transcriptSha256 === target.projected.transcript.beforeSha256 &&
      auditEntry.eventCount === target.projected.events.beforeCount &&
      auditEntry.wordCount === target.projected.localManifest.beforeWordCount,
    `Debate ${target.debateNumber}: corpus audit baseline drifted`
  );
  const auditBefore = {
    normalizedEventsSha256: auditEntry.normalizedEventsSha256,
    transcriptSha256: auditEntry.transcriptSha256,
    eventCount: auditEntry.eventCount,
    wordCount: auditEntry.wordCount
  };
  auditEntry.normalizedEventsSha256 = target.projected.events.afterSha256;
  auditEntry.transcriptSha256 = target.projected.transcript.afterSha256;
  auditEntry.eventCount = target.projected.events.afterCount;
  auditEntry.wordCount = target.projected.localManifest.afterWordCount;
  const auditAfter = {
    normalizedEventsSha256: auditEntry.normalizedEventsSha256,
    transcriptSha256: auditEntry.transcriptSha256,
    eventCount: auditEntry.eventCount,
    wordCount: auditEntry.wordCount
  };
  targetProjections.push({
    debateNumber: target.debateNumber,
    debateId: target.debateId,
    videoId: target.videoId,
    ignoredPaths: [
      { path: target.projected.events.path, beforeSha256: target.projected.events.beforeSha256, afterSha256: target.projected.events.afterSha256 },
      { path: target.projected.transcript.path, beforeSha256: target.projected.transcript.beforeSha256, afterSha256: target.projected.transcript.afterSha256 },
      { path: target.projected.localManifest.path, beforeSha256: target.projected.localManifest.beforeSha256, afterSha256: target.projected.localManifest.afterSha256 }
    ],
    corpusAuditEntry: { changedFieldsOnly: ["normalizedEventsSha256", "transcriptSha256", "eventCount", "wordCount"], before: auditBefore, after: auditAfter },
    rawCaptionSha256BeforeAndAfter: target.projected.rawCaption.beforeAndAfterSha256,
    uniqueSemanticContentRemoved: false
  });
  exactExistingMutablePaths.push(target.projected.events.path, target.projected.transcript.path, target.projected.localManifest.path);
}
exactExistingMutablePaths.push(CORPUS_AUDIT);
const projectedAuditBytes = Buffer.from(serializedJson(auditProjection));
const repairPlanTestOutput = execFileSync("node", [PLAN_TEST], { encoding: "utf8" });
assertV4(JSON.parse(repairPlanTestOutput).status === "passed", "frozen repair plan test failed before activation");

const branch = git(["branch", "--show-current"]);
const head = git(["rev-parse", "HEAD"]);
const remoteMain = git(["rev-parse", "origin/main"]);
assertV4(branch === "main" && head === remoteMain, "activation preparation requires synchronized branch main");

const activation = {
  schemaVersion: "1.0-assessment-production-post-canary-two-debate-source-normalization-repair-execution-activation",
  protocolId: plan.protocolId,
  status: "two-debate-source-normalization-repair-execution-activation-frozen-awaiting-separate-execution-authorization",
  activatedAt,
  checkpointCommit: head,
  branch: "main",
  activationOnly: true,
  userAuthorization: {
    instruction: "Proceed with the next task at your discretion.",
    scopeInterpretation: "Prepare, verify, commit, and push only the deterministic activation package for the frozen two-debate source-normalization repair. Do not execute the repair, mutate source files or the corpus audit, write repair records, select a production batch, execute models, derive scores, reconstruct publication prose, or mutate production.",
    directIncrementalCostEstimateUsd: 0,
    repairExecutionActivationPreparationAuthorized: true,
    repairExecutionAuthorized: false
  },
  planLocks: {
    repairPlan: { path: PLAN, bytes: sourceBytes[PLAN].byteLength, sha256: sha256(sourceBytes[PLAN]), status: plan.status },
    analysis: { path: ANALYSIS, bytes: sourceBytes[ANALYSIS].byteLength, sha256: sha256(sourceBytes[ANALYSIS]), status: analysis.status }
  },
  targetProjections,
  corpusAuditProjection: {
    path: CORPUS_AUDIT,
    reason: "The required corpus transcript validator reads this index; its two affected entries must follow the repaired local source hashes and counts.",
    changedEntriesOnly: ["88", "127"],
    changedFieldsPerEntryOnly: ["normalizedEventsSha256", "transcriptSha256", "eventCount", "wordCount"],
    beforeBytes: sourceBytes[CORPUS_AUDIT].byteLength,
    beforeSha256: sha256(sourceBytes[CORPUS_AUDIT]),
    afterBytes: projectedAuditBytes.byteLength,
    afterSha256: sha256(projectedAuditBytes)
  },
  executionProgram: { path: RUNNER, bytes: sourceBytes[RUNNER].byteLength, sha256: sha256(sourceBytes[RUNNER]) },
  executionContract: {
    executionMayNotStartFromThisArtifactAlone: true,
    separateUserAuthorizationRequiredAfterActivation: true,
    attemptsMaximumUnderThisActivation: 1,
    retriesWithinThisActivationMaximum: 0,
    automaticRetryAllowed: false,
    allOrNothing: true,
    exactExistingMutablePaths,
    exactExistingMutablePathCount: 7,
    exactIgnoredSourcePaths: exactExistingMutablePaths.slice(0, 6),
    exactTrackedIndexPaths: [CORPUS_AUDIT],
    futureCommittedArtifactsAfterSuccessfulValidation: [...REPAIR_RECORDS, EXECUTION],
    repairRecordsMayBeWrittenOnlyAfterAllPostwriteValidatorsPass: true,
    executionAuditMayRecordEitherSuccessOrFailureAfterRollback: true,
    rollbackAllSevenExistingPathsOnAnyMismatch: true,
    rawCaptionMutationAllowed: false,
    productionManifestMutationAllowed: false,
    continuationArtifactMutationAllowed: false,
    acquisitionParserMutationAllowed: false
  },
  mandatoryExecutionPreflight: {
    branchMainAndCommittedActivationExact: true,
    checkpointCommitAncestor: true,
    cleanWorktree: true,
    allActivationSourceHashesExact: true,
    allSevenExistingPathsAtFrozenBaselines: true,
    futureExecutionAndRepairRecordsAbsent: true,
    exactProjectionsReproducedBeforeWriting: true
  },
  mandatoryPostwriteValidation: {
    allSevenProjectedHashesExact: true,
    canonicalEventValidationBothDebates: true,
    transcriptLineCountEqualsEventCountBothDebates: true,
    localManifestHashChainAndWordCountsExact: true,
    everyNonTargetEventAndTranscriptLinePreserved: true,
    rawCaptionHashesUnchanged: true,
    productionManifestAndContinuationArtifactsUnchanged: true,
    corpusTranscriptValidator: "node scripts/validate-corpus-transcripts.mjs",
    completeRepositoryCheck: "npm run check",
    repairRecordsWrittenOnlyAfterBothCommandsPass: true
  },
  rollbackBoundary: {
    requiredOnAnyWriteOrValidationMismatch: true,
    restoreExistingPaths: 7,
    removeAnyPartiallyWrittenRepairRecords: true,
    pathsOutsideExactBoundaryMayBeChanged: false,
    automaticRetryAfterRollbackAllowed: false,
    failureExecutionAuditRequired: true
  },
  postwriteImmutableHashes: {
    [PRODUCTION_MANIFEST]: sourceHashes[PRODUCTION_MANIFEST],
    [CONTINUATION_PREPARATION]: sourceHashes[CONTINUATION_PREPARATION],
    [CONTINUATION_ANALYSIS]: sourceHashes[CONTINUATION_ANALYSIS],
    [PLAN]: sourceHashes[PLAN],
    [ANALYSIS]: sourceHashes[ANALYSIS]
  },
  sourceHashes,
  futureOutputPathsExcludedFromSourceHashes: [...REPAIR_RECORDS, EXECUTION],
  activationPreflight: {
    branchMain: true,
    localHeadMatchesRemoteMain: true,
    frozenPlanAndAnalysisHashesPassed: true,
    frozenPlanSourceHashReplayPassed: true,
    frozenPlanTestPassedBeforeActivationWrite: true,
    exactSixIgnoredSourceProjectionsPassed: true,
    exactTwoEntryCorpusAuditProjectionPassed: true,
    rawCaptionHashesPassed: true,
    sourceMutations: 0,
    corpusAuditMutations: 0,
    repairRecordsWritten: 0,
    modelContexts: 0,
    meteredApiCostUsd: 0
  },
  modelBoundary: {
    preservedAssessmentModel: "5.6 Sol",
    preservedReasoningEffort: "low",
    preservedAuthentication: "ChatGPT subscription",
    participantJudgmentMustRemainScoreBlind: true,
    roundedIntegerScoreTiesPermitted: true,
    modelContexts: 0,
    judgmentExecution: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    meteredApiCostUsdMaximum: 0
  },
  stopRules: {
    executionMayNotStartFromThisActivationAlone: true,
    separateRepairExecutionAuthorizationRequired: true,
    anyFrozenHashMismatchBlocks: true,
    anyProjectionMismatchBlocks: true,
    anyAdditionalPathMutationBlocks: true,
    anyRawCaptionMutationBlocks: true,
    anyProductionManifestMutationBlocks: true,
    anyContinuationArtifactMutationBlocks: true,
    anyValidatorFailureRequiresRollback: true,
    automaticRetryBlocks: true,
    batchSelectionBlocks: true,
    modelExecutionBlocks: true,
    scoreDerivationBlocks: true,
    publicationReconstructionBlocks: true,
    productionMutationBlocks: true,
    paidServiceUseBlocks: true
  },
  authorization: {
    repairExecutionActivationPreparation: true,
    repairExecution: false,
    sourceMutation: false,
    corpusAuditMutation: false,
    repairRecordWrite: false,
    continuationSelectionPolicyPreparation: false,
    batchSelection: false,
    modelExecution: false,
    scoreDerivation: false,
    publicationReconstruction: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction: "user-decision-on-two-debate-source-normalization-repair-execution"
};

if (shouldWrite) await writeFile(ACTIVATION, serializedJson(activation));
console.log(JSON.stringify({
  status: shouldWrite ? activation.status : "preview",
  targetDebates: ["88", "127"],
  projectedExistingPathMutations: 7,
  projectedRepairRecords: 2,
  repairExecuted: false,
  modelContexts: 0,
  directCostUsd: 0,
  nextAuthorizedAction: activation.nextAuthorizedAction
}, null, 2));
