#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { MODEL, PACKET_VERSION, PROTOCOL_ID, ROOT, makeSchema, sha256 } from "./lib/assessment-production-post-canary-batch-14-audio-attribution.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--prepared-at");
const preparedAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assert(preparedAt && !Number.isNaN(Date.parse(preparedAt)), "--prepared-at requires an ISO timestamp");

const base = "docs/assessment-production/post-canary-continuation-v1/batch-14";
const audioRoot = `${base}/audio-verification`;
const paths = {
  instruction: `${base}/standing-authorization-instruction.txt`,
  workflow: `${audioRoot}/audio-attribution-recovery-workflow.md`,
  manual: `${audioRoot}/audio-attribution-recovery-manual.md`,
  standing: `${base}/standing-authorization.json`,
  selection: `${base}/selection.json`,
  workItems: `${base}/disagreement-extraction/audio-work-items.json`,
  originalAudit: `${audioRoot}/audio-verification.json`,
  originalAnalysis: `${audioRoot}/analysis.json`,
  originalCost: `${audioRoot}/cost-control-analysis.json`,
  overlayPreparation: `${audioRoot}/validation-overlay-preparation.json`,
  overlayExecution: `${audioRoot}/validation-overlay-execution.json`,
  authorization: `${audioRoot}/audio-attribution-successor-authorization.json`,
  preparation: `${ROOT}/preparation-manifest.json`,
};
const exists = (file) => access(file).then(() => true, () => false);
if (shouldWrite) {
  for (const future of [paths.authorization, paths.preparation]) assert(!(await exists(future)), `${future} already exists`);
}
const readJson = (file) => readFile(file).then(JSON.parse);
const [instructionBytes, workflowBytes, manualBytes, standingBytes, selectionBytes, workItemsBytes, auditBytes, analysisBytes, costBytes, overlayPreparationBytes, overlayExecutionBytes] = await Promise.all([
  readFile(paths.instruction), readFile(paths.workflow), readFile(paths.manual), readFile(paths.standing), readFile(paths.selection), readFile(paths.workItems), readFile(paths.originalAudit), readFile(paths.originalAnalysis), readFile(paths.originalCost), readFile(paths.overlayPreparation), readFile(paths.overlayExecution),
]);
const [standing, selection, workItems, audit, analysis, cost] = [standingBytes, selectionBytes, workItemsBytes, auditBytes, analysisBytes, costBytes].map((bytes) => JSON.parse(bytes));
assert.equal(instructionBytes.toString("utf8").trim(), "Thank you. Let's proceed.");
assert.equal(standing.batchNumber, 14);
assert.equal(standing.recoveryControls.recoveryLevelsMaximum, 2);
assert.equal(standing.recoveryControls.boundedFirstRecoveryAuthorized, true);
assert.equal(analysis.gate.passed, false);
assert.equal(analysis.gate.verified, 11);
assert.equal(analysis.gate.unresolved, 1);
assert.equal(audit.totals.paidDiarizationCallsCompleted, 12);
assert.equal(audit.totals.retries, 0);
assert.equal(cost.costControl.approvedCapExceeded, false);
assert.equal(cost.costControl.usageDerivedEstimatedCostUsd, 0.422005);

const unresolved = audit.debates.flatMap((debate) => debate.moves).filter((move) => move.status === "unresolved");
assert.deepEqual(unresolved.map((move) => `${move.debateNumber}:${move.moveId}`), [
  "12:con-reality-identity-through-time",
]);
const selectedByNumber = new Map(selection.selected.map((item) => [item.debateNumber, item]));
const workByKey = new Map(workItems.moves.map((item) => [`${item.debateNumber}:${item.moveId}`, item]));
const contexts = [];
const sourceHashes = {
  [paths.instruction]: sha256(instructionBytes),
  [paths.workflow]: sha256(workflowBytes),
  [paths.manual]: sha256(manualBytes),
  [paths.standing]: sha256(standingBytes),
  [paths.selection]: sha256(selectionBytes),
  [paths.workItems]: sha256(workItemsBytes),
  [paths.originalAudit]: sha256(auditBytes),
  [paths.originalAnalysis]: sha256(analysisBytes),
  [paths.originalCost]: sha256(costBytes),
  [paths.overlayPreparation]: sha256(overlayPreparationBytes),
  [paths.overlayExecution]: sha256(overlayExecutionBytes),
};
for (const debateNumber of ["12"]) {
  const selected = selectedByNumber.get(debateNumber);
  assert(selected, `Debate ${debateNumber}: selection missing`);
  const debateMoves = unresolved.filter((move) => move.debateNumber === debateNumber).map((move) => {
    const work = workByKey.get(`${move.debateNumber}:${move.moveId}`);
    assert(work, `${move.moveId}: work item missing`);
    assert.equal(work.expectedSpeaker, move.expectedSpeaker);
    return {
      moveId: move.moveId,
      expectedSpeaker: move.expectedSpeaker,
      proposition: work.proposition,
      sourceSpan: work.sourceSpan,
      deterministicEvidence: move.deterministicEvidence,
      diarizedTranscriptPath: move.transcript.path,
      diarizedTranscriptSha256: move.transcript.sha256,
      validationOverlayApplied: move.transcript.validationOverlayApplied,
    };
  });
  const packet = {
    schemaVersion: PACKET_VERSION,
    protocolId: PROTOCOL_ID,
    debateNumber,
    debateId: selected.debateId,
    speakerRoster: {
      pro: selected.sides.pro.speakers[0],
      con: selected.sides.con.speakers[0],
      substantiveSpeakerCount: 2,
    },
    moves: debateMoves,
    evidenceBoundary: {
      rawAudioDerivedDiarizedTranscriptsRequired: true,
      lockedPropositionsAndSpansVisible: true,
      deterministicFailureVisible: true,
      ratingsUnavailable: true,
      scoresUnavailable: true,
      legacyUnavailable: true,
      otherDebatesUnavailable: true,
      publicationProseUnavailable: true,
    },
    decisionRule: {
      decideOnlyExpectedSpeakerAuthorshipOfCoreProposition: true,
      verifiedRequiresHighConfidence: true,
      verifiedRequiresNonemptyAudioDerivedSegmentEvidence: true,
      genericLabelsRequireDialogueAndRosterIdentityResolution: true,
      unresolvedBlocksDownstream: true,
      thresholdRelaxationAuthorized: false,
      rawSpeakerRelabelingAuthorized: false,
      transcriptMutationAuthorized: false,
      manualOverrideAuthorized: false,
    },
  };
  for (const move of packet.moves) {
    const bytes = await readFile(move.diarizedTranscriptPath);
    assert.equal(sha256(bytes), move.diarizedTranscriptSha256, `${move.moveId}: transcript changed`);
    sourceHashes[move.diarizedTranscriptPath] = sha256(bytes);
  }
  const packetPath = `${ROOT}/packets/debate-${debateNumber}.json`;
  const schemaPath = `${ROOT}/schemas/debate-${debateNumber}.schema.json`;
  const outputPath = `${ROOT}/outputs/debate-${debateNumber}.json`;
  const packetBytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  const schemaBytes = Buffer.from(`${JSON.stringify(makeSchema(packet), null, 2)}\n`);
  contexts.push({
    debateNumber,
    debateId: selected.debateId,
    moveIds: packet.moves.map((move) => move.moveId),
    packet: packetPath,
    packetSha256: sha256(packetBytes),
    schema: schemaPath,
    schemaSha256: sha256(schemaBytes),
    rawDiarizedTranscripts: packet.moves.map((move) => ({ moveId: move.moveId, path: move.diarizedTranscriptPath, sha256: move.diarizedTranscriptSha256 })),
    output: outputPath,
    packetBytes,
    schemaBytes,
  });
}
assert.equal(contexts.length, 1);
assert.equal(contexts.reduce((sum, item) => sum + item.moveIds.length, 0), 1);

const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const authorization = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-14-audio-attribution-successor-authorization",
  protocolId: PROTOCOL_ID,
  status: "frozen-active-batch-14-audio-attribution-recovery-level-2-successor-authorization",
  authorizedAt: preparedAt,
  checkpointCommit: head,
  productionCanary: false,
  batchNumber: 14,
  stagingOnly: true,
  userAuthorization: {
    instruction: instructionBytes.toString("utf8").trim(),
    instructionPath: paths.instruction,
    instructionSha256: sourceHashes[paths.instruction],
    scopeInterpretation: "Resume the blocked Batch 14 workflow using the smallest zero-cost, evidence-limited recovery that can resolve the one preserved audio-attribution decision, then continue automatically through the already authorized complete workflow.",
  },
  preservedPriorGate: {
    verified: 11,
    unresolved: 1,
    paidCallsCompleted: 12,
    paidRetries: 0,
    usageDerivedEstimatedCostUsd: 0.422005,
    originalEvidenceErasedOrReclassified: false,
  },
  recovery: {
    level: 2,
    contexts: 1,
    debates: ["12"],
    decisions: 1,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    paidTranscriptionCalls: 0,
    paidRetries: 0,
    directIncrementalCostUsdMaximum: 0,
    model: MODEL,
    transcriptMutationAllowed: false,
    thresholdChangeAllowed: false,
    rawSpeakerRelabelingAllowed: false,
    manualOverrideAllowed: false,
    unresolvedDecisionBlocks: true,
  },
  authorization: {
    packetPreparation: true,
    modelExecutionAfterSeparateActivation: true,
    deterministicValidation: true,
    combinedAudioGateAssembly: true,
    resumeStandingAuthorizationAfterPassingGate: true,
    paidTranscription: false,
    retry: false,
    scoreDerivationBeforeResolvedAudio: false,
    nextBatchSelection: false,
  },
  sourceHashes,
  nextAuthorizedAction: "prepare-validate-commit-and-push-one-frozen-batch-14-audio-attribution-recovery-context",
};
const publicContexts = contexts.map(({ packetBytes, schemaBytes, ...context }) => context);
const preparation = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-14-audio-attribution-preparation",
  protocolId: PROTOCOL_ID,
  status: "prepared-one-batch-14-audio-attribution-recovery-context-not-active",
  preparedAt,
  checkpointCommit: head,
  productionCanary: false,
  batchNumber: 14,
  stagingOnly: true,
  AIOnly: true,
  model: MODEL,
  authorization: { path: paths.authorization, sha256: sha256(`${JSON.stringify(authorization, null, 2)}\n`) },
  workflow: paths.workflow,
  manual: paths.manual,
  contexts: publicContexts,
  executionPolicy: { concurrency: 1, contexts: 1, attemptsPerContext: 1, retriesMaximum: 0, perInvocationTimeoutMs: 900000, APIKeysRemoved: true, paidTranscriptionCalls: 0, directIncrementalCostUsdMaximum: 0 },
  modelExecutionAuthorizedThisStage: false,
  futureArtifacts: { executionManifest: `${ROOT}/execution-manifest.json`, execution: `${ROOT}/model-execution.json`, analysis: `${ROOT}/analysis.json`, combinedAudioGate: `${ROOT}/combined-audio-verification.json` },
};
if (shouldWrite) {
  await mkdir(`${ROOT}/packets`, { recursive: true });
  await mkdir(`${ROOT}/schemas`, { recursive: true });
  await mkdir(`${ROOT}/outputs`, { recursive: true });
  await writeFile(paths.authorization, `${JSON.stringify(authorization, null, 2)}\n`);
  for (const context of contexts) {
    await writeFile(context.packet, context.packetBytes);
    await writeFile(context.schema, context.schemaBytes);
  }
  await writeFile(paths.preparation, `${JSON.stringify(preparation, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? preparation.status : "preview", contexts: 1, decisions: 1, model: `${MODEL.label}/low`, authentication: MODEL.authentication, attemptsMaximum: 1, retriesMaximum: 0, paidTranscriptionCalls: 0, directIncrementalCostUsdMaximum: 0, scoresDerived: 0 }, null, 2));
