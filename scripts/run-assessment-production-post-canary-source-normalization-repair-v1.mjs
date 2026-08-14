#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeV418Events } from "./lib/v418-source-integrity.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/assessment-production/post-canary-continuation-v1/source-normalization-repair";
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/execution.json`;
const REPAIR_RECORDS = {
  "88": `${ROOT}/debate-088-repair-record.json`,
  "127": `${ROOT}/debate-127-repair-record.json`
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const serializedJson = (value) => `${JSON.stringify(value, null, 2)}\n`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const transcriptLines = (value) => value.endsWith("\n") ? value.slice(0, -1).split("\n") : value.split("\n");
const wordCount = (value) => value.split(/\s+/).filter(Boolean).length;
const run = (program, args) => execFileSync(program, args, {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

const activationBytes = await readFile(ACTIVATION);
const activation = JSON.parse(activationBytes);
assertV4(
  activation.status === "two-debate-source-normalization-repair-execution-activation-frozen-awaiting-separate-execution-authorization" &&
    activation.activationOnly === true &&
    activation.executionContract.executionMayNotStartFromThisArtifactAlone === true &&
    activation.executionContract.separateUserAuthorizationRequiredAfterActivation === true &&
    activation.executionContract.attemptsMaximumUnderThisActivation === 1 &&
    activation.executionContract.retriesWithinThisActivationMaximum === 0 &&
    activation.executionContract.allOrNothing === true &&
    activation.authorization.repairExecution === false &&
    activation.authorization.modelExecution === false &&
    activation.authorization.productionMutation === false,
  "source-normalization repair activation boundary drifted"
);
assertV4(
  activation.modelBoundary.preservedAssessmentModel === "5.6 Sol" &&
    activation.modelBoundary.preservedReasoningEffort === "low" &&
    activation.modelBoundary.preservedAuthentication === "ChatGPT subscription" &&
    activation.modelBoundary.participantJudgmentMustRemainScoreBlind === true &&
    activation.modelBoundary.roundedIntegerScoreTiesPermitted === true &&
    activation.modelBoundary.modelContexts === 0,
  "assessment model boundary drifted"
);

const status = run("git", ["status", "--porcelain=v1"]);
assertV4(status === "", "worktree must be clean before source-normalization repair execution");
assertV4(run("git", ["branch", "--show-current"]).trim() === "main", "repair execution requires branch main");
const committedActivation = Buffer.from(run("git", ["show", `HEAD:${ACTIVATION}`]));
assertV4(sha256(committedActivation) === sha256(activationBytes), "activation must be committed exactly at HEAD");
run("git", ["merge-base", "--is-ancestor", activation.checkpointCommit, "HEAD"]);
for (const [file, expected] of Object.entries(activation.sourceHashes)) {
  assertV4(sha256(await readFile(file)) === expected, `${file}: frozen activation source drifted`);
}
for (const future of activation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(!(await exists(future)), `${future}: future output already exists`);
}

const plan = JSON.parse(await readFile(activation.planLocks.repairPlan.path, "utf8"));
const auditBytes = await readFile(activation.corpusAuditProjection.path);
assertV4(sha256(auditBytes) === activation.corpusAuditProjection.beforeSha256, "corpus audit baseline drifted");
const audit = JSON.parse(auditBytes);
const repairedAudit = structuredClone(audit);
const originals = new Map([[activation.corpusAuditProjection.path, auditBytes]]);
const outputs = new Map();
const targetResults = [];

for (const target of plan.targets) {
  const eventBytes = await readFile(target.projected.events.path);
  const transcriptBytes = await readFile(target.projected.transcript.path);
  const manifestBytes = await readFile(target.projected.localManifest.path);
  const rawBytes = await readFile(target.projected.rawCaption.path);
  assertV4(sha256(eventBytes) === target.projected.events.beforeSha256, `Debate ${target.debateNumber}: event baseline drifted`);
  assertV4(sha256(transcriptBytes) === target.projected.transcript.beforeSha256, `Debate ${target.debateNumber}: transcript baseline drifted`);
  assertV4(sha256(manifestBytes) === target.projected.localManifest.beforeSha256, `Debate ${target.debateNumber}: manifest baseline drifted`);
  assertV4(sha256(rawBytes) === target.projected.rawCaption.beforeAndAfterSha256, `Debate ${target.debateNumber}: raw caption drifted`);
  originals.set(target.projected.events.path, eventBytes);
  originals.set(target.projected.transcript.path, transcriptBytes);
  originals.set(target.projected.localManifest.path, manifestBytes);

  const events = JSON.parse(eventBytes);
  const lines = transcriptLines(transcriptBytes.toString("utf8"));
  const localManifest = JSON.parse(manifestBytes);
  const removedEvent = events[target.diagnosis.normalizedEventIndex];
  assertV4(canonicalJson(removedEvent) === canonicalJson(target.diagnosis.removedDerivedEvent), `Debate ${target.debateNumber}: target event drifted`);
  assertV4(lines[target.diagnosis.normalizedEventIndex] === target.diagnosis.removedTranscriptLine, `Debate ${target.debateNumber}: target transcript row drifted`);

  const repairedEvents = events.filter((_, index) => index !== target.diagnosis.normalizedEventIndex);
  normalizeV418Events(repairedEvents);
  const repairedLines = lines.filter((_, index) => index !== target.diagnosis.normalizedEventIndex);
  assertV4(repairedEvents.length === repairedLines.length, `Debate ${target.debateNumber}: repaired row counts differ`);
  for (let index = 0; index < repairedEvents.length; index += 1) {
    const originalIndex = index < target.diagnosis.normalizedEventIndex ? index : index + 1;
    assertV4(canonicalJson(repairedEvents[index]) === canonicalJson(events[originalIndex]), `Debate ${target.debateNumber}: non-target event changed`);
    assertV4(repairedLines[index] === lines[originalIndex], `Debate ${target.debateNumber}: non-target transcript row changed`);
  }
  const repairedEventBytes = Buffer.from(serializedJson(repairedEvents));
  const repairedTranscriptBytes = Buffer.from(`${repairedLines.join("\n")}\n`);
  const repairedManifest = {
    ...structuredClone(localManifest),
    normalizedEventsSha256: sha256(repairedEventBytes),
    transcriptSha256: sha256(repairedTranscriptBytes),
    eventCount: repairedEvents.length,
    wordCount: wordCount(repairedTranscriptBytes.toString("utf8"))
  };
  const repairedManifestBytes = Buffer.from(serializedJson(repairedManifest));
  assertV4(sha256(repairedEventBytes) === target.projected.events.afterSha256, `Debate ${target.debateNumber}: projected event hash mismatch`);
  assertV4(sha256(repairedTranscriptBytes) === target.projected.transcript.afterSha256, `Debate ${target.debateNumber}: projected transcript hash mismatch`);
  assertV4(sha256(repairedManifestBytes) === target.projected.localManifest.afterSha256, `Debate ${target.debateNumber}: projected manifest hash mismatch`);
  outputs.set(target.projected.events.path, repairedEventBytes);
  outputs.set(target.projected.transcript.path, repairedTranscriptBytes);
  outputs.set(target.projected.localManifest.path, repairedManifestBytes);

  const auditEntry = repairedAudit.entries.find((entry) => entry.debateId === target.debateId);
  assertV4(
    auditEntry?.normalizedEventsSha256 === target.projected.events.beforeSha256 &&
      auditEntry.transcriptSha256 === target.projected.transcript.beforeSha256 &&
      auditEntry.eventCount === target.projected.events.beforeCount &&
      auditEntry.wordCount === target.projected.localManifest.beforeWordCount,
    `Debate ${target.debateNumber}: corpus audit entry baseline drifted`
  );
  auditEntry.normalizedEventsSha256 = target.projected.events.afterSha256;
  auditEntry.transcriptSha256 = target.projected.transcript.afterSha256;
  auditEntry.eventCount = target.projected.events.afterCount;
  auditEntry.wordCount = target.projected.localManifest.afterWordCount;
  targetResults.push({
    debateNumber: target.debateNumber,
    debateId: target.debateId,
    videoId: target.videoId,
    removedEventIndex: target.diagnosis.normalizedEventIndex,
    removedTranscriptLineNumber: target.diagnosis.transcriptLineNumber,
    before: {
      eventsSha256: target.projected.events.beforeSha256,
      transcriptSha256: target.projected.transcript.beforeSha256,
      manifestSha256: target.projected.localManifest.beforeSha256
    },
    after: {
      eventsSha256: target.projected.events.afterSha256,
      transcriptSha256: target.projected.transcript.afterSha256,
      manifestSha256: target.projected.localManifest.afterSha256
    }
  });
}

const repairedAuditBytes = Buffer.from(serializedJson(repairedAudit));
assertV4(sha256(repairedAuditBytes) === activation.corpusAuditProjection.afterSha256, "corpus audit projection hash mismatch");
outputs.set(activation.corpusAuditProjection.path, repairedAuditBytes);
assertV4(canonicalJson([...outputs.keys()]) === canonicalJson(activation.executionContract.exactExistingMutablePaths), "exact mutable path order drifted");

const startedAt = new Date().toISOString();
let writesStarted = false;
const writtenRepairRecords = [];
try {
  for (const [file, bytes] of outputs) {
    writesStarted = true;
    await writeFile(file, bytes);
  }
  for (const [file, bytes] of outputs) assertV4(sha256(await readFile(file)) === sha256(bytes), `${file}: postwrite hash mismatch`);
  for (const target of plan.targets) assertV4(sha256(await readFile(target.projected.rawCaption.path)) === target.projected.rawCaption.beforeAndAfterSha256, `Debate ${target.debateNumber}: raw caption mutated`);
  for (const [file, expected] of Object.entries(activation.postwriteImmutableHashes)) assertV4(sha256(await readFile(file)) === expected, `${file}: immutable control changed`);
  run("node", ["scripts/validate-corpus-transcripts.mjs"]);
  run("npm", ["run", "check"]);

  const completedAt = new Date().toISOString();
  const repairRecords = targetResults.map((result) => ({
    schemaVersion: "1.0-assessment-production-post-canary-source-normalization-repair-record",
    protocolId: activation.protocolId,
    status: "source-normalization-repair-passed",
    completedAt,
    activation: { path: ACTIVATION, sha256: sha256(activationBytes) },
    ...result,
    uniqueSemanticContentRemoved: false,
    rawCaptionMutated: false,
    modelContexts: 0,
    meteredApiCostUsd: 0
  }));
  for (const record of repairRecords) {
    const recordPath = REPAIR_RECORDS[record.debateNumber];
    await writeFile(recordPath, serializedJson(record));
    writtenRepairRecords.push(recordPath);
  }
  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-two-debate-source-normalization-repair-execution",
    protocolId: activation.protocolId,
    status: "two-debate-source-normalization-repair-execution-passed",
    startedAt,
    completedAt,
    activation: { path: ACTIVATION, sha256: sha256(activationBytes) },
    attempts: 1,
    retries: 0,
    atomicRollbackRequired: false,
    targets: targetResults,
    existingPathsMutated: activation.executionContract.exactExistingMutablePaths,
    repairRecords: Object.values(REPAIR_RECORDS),
    validation: {
      exactProjectedHashesPassed: true,
      everyNonTargetRowPreserved: true,
      rawCaptionHashesUnchanged: true,
      immutableControlHashesUnchanged: true,
      corpusTranscriptValidatorPassed: true,
      completeRepositoryCheckPassed: true
    },
    modelBoundary: activation.modelBoundary,
    nextAuthorizedAction: "prepare-post-repair-continuation-source-overlay-and-batch-selection-policy-plan-only"
  };
  await writeFile(EXECUTION, serializedJson(execution));
  console.log(JSON.stringify({ status: execution.status, repairedDebates: ["88", "127"], existingPathsMutated: 7, repairRecords: 2, retries: 0, modelContexts: 0, meteredApiCostUsd: 0 }, null, 2));
} catch (error) {
  for (const recordPath of writtenRepairRecords) await unlink(recordPath).catch(() => {});
  if (writesStarted) {
    for (const [file, bytes] of originals) await writeFile(file, bytes);
    for (const [file, bytes] of originals) assertV4(sha256(await readFile(file)) === sha256(bytes), `${file}: rollback failed`);
  }
  const failure = {
    schemaVersion: "1.0-assessment-production-post-canary-two-debate-source-normalization-repair-execution",
    protocolId: activation.protocolId,
    status: "two-debate-source-normalization-repair-execution-failed-closed-and-rolled-back",
    startedAt,
    completedAt: new Date().toISOString(),
    activation: { path: ACTIVATION, sha256: sha256(activationBytes) },
    attempts: 1,
    retries: 0,
    atomicRollbackRequired: writesStarted,
    atomicRollbackPassed: writesStarted,
    failureMessage: (error.stack ?? String(error)).slice(-12000),
    repairRecordsWritten: 0,
    modelContexts: 0,
    meteredApiCostUsd: 0,
    nextAuthorizedAction: "stop-and-diagnose-without-automatic-retry"
  };
  await writeFile(EXECUTION, serializedJson(failure));
  throw error;
}
