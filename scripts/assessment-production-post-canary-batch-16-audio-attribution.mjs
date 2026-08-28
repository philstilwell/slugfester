#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { AUDIT, ISOLATION, MODEL, OUTPUT_VERSION, PACKET_VERSION, PROTOCOL_ID, ROOT, makeSchema, sha256, validateOutput } from "./lib/assessment-production-post-canary-batch-16-audio-attribution.mjs";

const modeIndex = process.argv.indexOf("--mode");
const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : null;
const shouldWrite = process.argv.includes("--write");
const timestamp = (flag) => {
  const index = process.argv.indexOf(flag);
  const value = index >= 0 ? process.argv[index + 1] : null;
  assert(value && !Number.isNaN(Date.parse(value)), `${flag} requires an ISO timestamp`);
  return value;
};
assert(["prepare", "activate", "run", "analyze", "test"].includes(mode), "--mode is required");

const base = "docs/assessment-production/post-canary-continuation-v1/batch-16";
const audioRoot = `${base}/audio-verification`;
const toolPath = "scripts/assessment-production-post-canary-batch-16-audio-attribution.mjs";
const libPath = "scripts/lib/assessment-production-post-canary-batch-16-audio-attribution.mjs";
const paths = {
  workflow: `${audioRoot}/audio-attribution-recovery-workflow.md`,
  manual: `${audioRoot}/audio-attribution-recovery-manual.md`,
  standing: `${base}/standing-authorization.json`,
  selection: `${base}/selection.json`,
  workItems: `${base}/disagreement-extraction/audio-work-items.json`,
  recoveredAudit: `${audioRoot}/exceptional-paid-recovery/recovered-audio-verification.json`,
  recoveredAnalysis: `${audioRoot}/exceptional-paid-recovery/analysis.json`,
  recoveredCost: `${audioRoot}/exceptional-paid-recovery/cost-control-analysis.json`,
  authorization: `${audioRoot}/audio-attribution-recovery-authorization.json`,
  packet: `${ROOT}/packet.json`,
  schema: `${ROOT}/schema.json`,
  preparation: `${ROOT}/preparation-manifest.json`,
  activation: `${ROOT}/execution-manifest.json`,
  attempt1: `${ROOT}/outputs/attempt-1.json`,
  attempt2: `${ROOT}/outputs/attempt-2.json`,
  execution: `${ROOT}/model-execution.json`,
  analysis: `${ROOT}/analysis.json`,
  combined: `${ROOT}/combined-audio-verification.json`,
};
const exists = (file) => access(file).then(() => true, () => false);
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);

async function prepare() {
  const preparedAt = timestamp("--prepared-at");
  if (shouldWrite) for (const file of [paths.authorization, paths.packet, paths.schema, paths.preparation]) assert.equal(await exists(file), false, `${file} already exists`);
  const sourceFiles = [paths.workflow, paths.manual, paths.standing, paths.selection, paths.workItems, paths.recoveredAudit, paths.recoveredAnalysis, paths.recoveredCost, toolPath, libPath, "scripts/lib/v385-transport.mjs"];
  const [selection, workItems, recoveredAudit, recoveredAnalysis, recoveredCost] = await Promise.all([
    readJson(paths.selection), readJson(paths.workItems), readJson(paths.recoveredAudit), readJson(paths.recoveredAnalysis), readJson(paths.recoveredCost),
  ]);
  assert.equal(recoveredAudit.status, "batch-16-paid-audio-recovery-passed-one-preserved-attribution-decision-pending");
  assert.equal(recoveredAnalysis.gate.recoveredMovesVerified, 4);
  assert.equal(recoveredAnalysis.gate.preservedDebate144Pending, true);
  assert.equal(recoveredCost.actual.cumulativeUsageDerivedEstimatedCostUsd, 0.45347);
  const debate = selection.selected.find((item) => item.debateNumber === "144");
  assert(debate && debate.speakerCount === 2);
  const unresolved = recoveredAudit.debates.flatMap((item) => item.moves).filter((move) => move.status !== "verified");
  assert.deepEqual(unresolved.map((move) => `${move.debateNumber}:${move.moveId}`), ["144:pro-guidance-no-added-ontological-cost"]);
  const originalMove = unresolved[0];
  const work = workItems.moves.find((item) => item.debateNumber === "144" && item.moveId === originalMove.moveId);
  assert(work);
  assert.equal(work.expectedSpeaker, "Alvin Plantinga");
  const transcriptBytes = await readFile(originalMove.transcript.path);
  assert.equal(sha256(transcriptBytes), originalMove.transcript.sha256);
  sourceFiles.push(originalMove.transcript.path);
  const packet = {
    schemaVersion: PACKET_VERSION,
    protocolId: PROTOCOL_ID,
    debateNumber: "144",
    debateId: debate.debateId,
    speakerRoster: { pro: debate.sides.pro.speakers[0], con: debate.sides.con.speakers[0], substantiveSpeakerCount: 2 },
    move: {
      moveId: originalMove.moveId,
      expectedSpeaker: originalMove.expectedSpeaker,
      proposition: work.proposition,
      sourceSpan: work.sourceSpan,
      deterministicEvidence: originalMove.deterministicEvidence,
      diarizedTranscriptPath: originalMove.transcript.path,
      diarizedTranscriptSha256: originalMove.transcript.sha256,
    },
    evidenceBoundary: { soleUnavailableField: true, rawAudioDerivedDiarizedTranscriptRequired: true, lockedPropositionAndSpanVisible: true, deterministicFailureVisible: true, ratingsUnavailable: true, scoresUnavailable: true, legacyUnavailable: true, otherDebatesUnavailable: true, publicationProseUnavailable: true },
    decisionRule: { decideOnlyExpectedSpeakerAuthorshipOfCoreProposition: true, verifiedRequiresHighConfidence: true, verifiedRequiresNonemptyAudioDerivedSegmentEvidence: true, unresolvedBlocksDownstream: true, thresholdRelaxationAuthorized: false, rawSpeakerRelabelingAuthorized: false, transcriptMutationAuthorized: false, manualOverrideAuthorized: false },
  };
  const schema = makeSchema(packet);
  const packetBytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  const schemaBytes = Buffer.from(`${JSON.stringify(schema, null, 2)}\n`);
  const sourceHashes = {};
  for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const authorization = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-16-audio-attribution-recovery-authorization",
    protocolId: PROTOCOL_ID,
    status: "frozen-active-batch-16-debate-144-audio-attribution-recovery-authorization",
    authorizedAt: preparedAt,
    checkpointCommit: head,
    batchNumber: 16,
    preservedGate: { verified: 9, unresolved: 1, paidCostUsd: 0.45347, originalOrRecoveredEvidenceChanged: false },
    recovery: { field: "144:pro-guidance-no-added-ontological-cost", contextsInitiallyAuthorized: 1, secondFreshContextOnlyIfFirstInvalidOrUnresolved: true, contextsMaximum: 2, attemptsPerContext: 1, retries: 0, fieldDisjoint: true, acceptedFieldsMutable: false, model: MODEL, paidTranscriptionCalls: 0, directIncrementalCostUsdMaximum: 0 },
    authorization: { packetPreparation: true, modelExecutionAfterSeparateActivation: true, deterministicValidation: true, combinedAudioGateAssembly: true, resumeStandingAuthorizationAfterPassingGate: true, scoreDerivation: false, productionMutation: false, nextBatchSelection: false },
  };
  const authorizationBytes = Buffer.from(`${JSON.stringify(authorization, null, 2)}\n`);
  const preparation = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-16-audio-attribution-recovery-preparation",
    protocolId: PROTOCOL_ID,
    status: "prepared-one-batch-16-debate-144-audio-attribution-context-with-one-conditional-successor-not-active",
    preparedAt,
    checkpointCommit: head,
    batchNumber: 16,
    stagingOnly: true,
    AIOnly: true,
    model: MODEL,
    authorization: { path: paths.authorization, sha256: sha256(authorizationBytes) },
    workflow: paths.workflow,
    manual: paths.manual,
    context: { debateNumber: "144", debateId: debate.debateId, moveId: packet.move.moveId, packet: paths.packet, packetSha256: sha256(packetBytes), schema: paths.schema, schemaSha256: sha256(schemaBytes), rawDiarizedTranscript: { path: packet.move.diarizedTranscriptPath, sha256: packet.move.diarizedTranscriptSha256 } },
    executionPolicy: { concurrency: 1, initialContexts: 1, conditionalSecondFreshContext: true, contextsMaximum: 2, attemptsPerContext: 1, retries: 0, perInvocationTimeoutMs: 900000, APIKeysRemoved: true, paidTranscriptionCalls: 0, directIncrementalCostUsdMaximum: 0 },
    sourceHashes,
    futureOutputPathsExcludedFromSourceHashes: [paths.activation, paths.attempt1, paths.attempt2, paths.execution, paths.analysis, paths.combined],
  };
  if (shouldWrite) {
    await mkdir(`${ROOT}/outputs`, { recursive: true });
    await writeFile(paths.authorization, authorizationBytes);
    await writeFile(paths.packet, packetBytes);
    await writeFile(paths.schema, schemaBytes);
    await writeFile(paths.preparation, `${JSON.stringify(preparation, null, 2)}\n`);
  }
  console.log(JSON.stringify({ status: shouldWrite ? preparation.status : "preview", debateNumber: "144", fields: 1, initialContexts: 1, conditionalSecondContext: true, contextsMaximum: 2, model: "5.6 Sol/low", directIncrementalCostUsdMaximum: 0, scoresDerived: 0 }, null, 2));
}

async function validatePreparation(preparation, expectedStatus = "prepared-one-batch-16-debate-144-audio-attribution-context-with-one-conditional-successor-not-active") {
  assert.equal(preparation.status, expectedStatus);
  assert.equal(preparation.context.debateNumber, "144");
  assert.equal(preparation.context.moveId, "pro-guidance-no-added-ontological-cost");
  assert.equal(preparation.model.label, MODEL.label);
  assert.equal(preparation.model.reasoningEffort, "low");
  assert.equal(preparation.executionPolicy.contextsMaximum, 2);
  assert.equal(preparation.executionPolicy.retries, 0);
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
  assert.equal(sha256(await readFile(preparation.context.packet)), preparation.context.packetSha256);
  assert.equal(sha256(await readFile(preparation.context.schema)), preparation.context.schemaSha256);
  assert.equal(sha256(await readFile(preparation.context.rawDiarizedTranscript.path)), preparation.context.rawDiarizedTranscript.sha256);
}

async function activate() {
  const activatedAt = timestamp("--activated-at");
  assert.equal(await exists(paths.activation), false, `${paths.activation} already exists`);
  const [preparationBytes, authorizationBytes] = await Promise.all([readFile(paths.preparation), readFile(paths.authorization)]);
  const preparation = JSON.parse(preparationBytes);
  await validatePreparation(preparation);
  assert.equal(preparation.authorization.sha256, sha256(authorizationBytes));
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const main = execFileSync("git", ["rev-parse", "main"], { encoding: "utf8" }).trim();
  const origin = execFileSync("git", ["rev-parse", "origin/main"], { encoding: "utf8" }).trim();
  assert.equal(head, main);
  assert.equal(head, origin);
  const sourceFiles = [paths.authorization, paths.preparation, preparation.workflow, preparation.manual, preparation.context.packet, preparation.context.schema, preparation.context.rawDiarizedTranscript.path, toolPath, libPath, "scripts/lib/v385-transport.mjs"];
  const activationHashes = {};
  for (const file of sourceFiles) activationHashes[file] = sha256(await readFile(file));
  const copiedInputBytes = (await readFile(preparation.workflow)).length + (await readFile(preparation.manual)).length + (await readFile(preparation.context.packet)).length + (await readFile(preparation.context.schema)).length + (await readFile(preparation.context.rawDiarizedTranscript.path)).length;
  assert(copiedInputBytes <= 180000, "isolated context input exceeds frozen ceiling");
  const activation = {
    ...preparation,
    schemaVersion: "1.0-assessment-production-post-canary-batch-16-audio-attribution-recovery-execution-manifest",
    status: "frozen-one-batch-16-debate-144-audio-attribution-context-with-one-conditional-successor-active",
    activatedAt,
    checkpointCommit: head,
    copiedInputBytes,
    preparationManifest: { path: paths.preparation, sha256: sha256(preparationBytes) },
    authorization: { path: paths.authorization, sha256: sha256(authorizationBytes) },
    activationHashes,
    futureOutputPathsExcludedFromSourceHashes: preparation.futureOutputPathsExcludedFromSourceHashes.filter((file) => file !== paths.activation),
  };
  if (shouldWrite) await writeFile(paths.activation, `${JSON.stringify(activation, null, 2)}\n`);
  console.log(JSON.stringify({ status: shouldWrite ? activation.status : "preview", copiedInputBytes, initialContexts: 1, conditionalSecondContext: true, contextsMaximum: 2, model: "5.6 Sol/low", directIncrementalCostUsdMaximum: 0, active: shouldWrite }, null, 2));
}

async function validateActivation(manifest) {
  await validatePreparation(manifest, "frozen-one-batch-16-debate-144-audio-attribution-context-with-one-conditional-successor-active");
  assert.equal(sha256(await readFile(manifest.preparationManifest.path)), manifest.preparationManifest.sha256);
  assert.equal(sha256(await readFile(manifest.authorization.path)), manifest.authorization.sha256);
  for (const [file, digest] of Object.entries(manifest.activationHashes)) assert.equal(sha256(await readFile(file)), digest, `activation hash mismatch: ${file}`);
}

function runCommand(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); });
  });
}

async function executeAttempt(manifest, attemptNumber) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-b16-audio-adj-144-a${attemptNumber}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-b16-audio-home-144-a${attemptNumber}-`));
  const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  const outputPath = attemptNumber === 1 ? paths.attempt1 : paths.attempt2;
  const startedAt = new Date().toISOString();
  const started = Date.now();
  try {
    await copyFile(manifest.workflow, path.join(temporary, "workflow.md"));
    await copyFile(manifest.manual, path.join(temporary, "manual.md"));
    await copyFile(manifest.context.packet, path.join(temporary, "packet.json"));
    await copyFile(manifest.context.schema, path.join(temporary, "schema.json"));
    await copyFile(manifest.context.rawDiarizedTranscript.path, path.join(temporary, "audio-transcript.json"));
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    for (const key of ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"]) delete environment[key];
    const prompt = "Read workflow.md, manual.md, schema.json, packet.json, and audio-transcript.json completely and no other files. Act only as the isolated 5.6 Sol/low audio-attribution adjudicator for Debate 144's single locked move. Cite segment indexes and decide only expected-speaker authorship. Ratings, scores, legacy data, other debates, winners, and publication prose are unavailable. Return exactly one schema-conforming JSON object and no commentary.";
    const invocation = await runCommand(codex, [
      "exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules",
      "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`,
      "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies",
      "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt,
    ], { cwd: temporary, env: environment }, manifest.executionPolicy.perInvocationTimeoutMs);
    const events = extractTransportEvents(invocation.stderr);
    const transportClassification = classifyTransportEventCount(events.length, 2, 8);
    const base = { attemptNumber, freshIsolatedContext: true, model: MODEL.label, reasoningEffort: MODEL.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, terminationSignal: invocation.signal, commandExitCode: invocation.code, authentication: MODEL.authentication, apiKeysRemoved: true, directIncrementalCostUsd: 0, paidTranscriptionCalls: 0, recoverableStreamEvents: events.length, transportClassification, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr), stderrTail: invocation.stderr.trim().slice(-6000) || null };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null) return { ...base, status: invocation.timedOut ? "timed-out" : "transport-failed", outputWritten: false, deterministicValidationPassed: false, verified: false, gateAcceptancePassed: false };
    const resultBytes = await readFile(path.join(temporary, "result.json"));
    await writeFile(outputPath, resultBytes);
    let validation = null;
    let validationMessage = null;
    try { validation = await validateOutput(JSON.parse(resultBytes), JSON.parse(await readFile(manifest.context.packet))); } catch (error) { validationMessage = String(error?.stack ?? error).slice(-6000); }
    const verified = validation?.verified === 1;
    const validTransport = transportClassification !== "invalid";
    const accepted = validation !== null && verified && validTransport;
    return { ...base, status: accepted ? `completed-verified-${transportClassification}` : validation ? verified ? "transport-event-limit-exceeded" : "completed-valid-unresolved" : "output-validation-failed", outputWritten: true, outputPath, outputSha256: sha256(resultBytes), deterministicValidationPassed: validation !== null, verified, gateAcceptancePassed: accepted, validationSummary: validation, validationMessage };
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
}

async function run() {
  assert.equal(await exists(paths.execution), false, `${paths.execution} already exists`);
  const manifest = await readJson(paths.activation);
  await validateActivation(manifest);
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert.equal(await exists(future), false, `future output already exists: ${future}`);
  const startedAt = new Date().toISOString();
  const started = Date.now();
  const attempts = [];
  attempts.push(await executeAttempt(manifest, 1));
  if (!attempts[0].gateAcceptancePassed) attempts.push(await executeAttempt(manifest, 2));
  const accepted = attempts.find((item) => item.gateAcceptancePassed) ?? null;
  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-16-audio-attribution-recovery-model-execution",
    protocolId: PROTOCOL_ID,
    status: accepted ? "batch-16-debate-144-audio-attribution-recovery-execution-passed" : "batch-16-debate-144-audio-attribution-recovery-execution-failed",
    startedAt,
    completedAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    initialContexts: 1,
    conditionalSecondContextUsed: attempts.length === 2,
    contextsMaximum: 2,
    attempts: attempts.length,
    retries: 0,
    directIncrementalCostUsd: 0,
    paidTranscriptionCalls: 0,
    acceptedAttemptNumber: accepted?.attemptNumber ?? null,
    results: attempts,
    authorization: { analysis: Boolean(accepted), furtherRecovery: false, disputeAdjudicationPreparation: false, scoreDerivation: false, productionMutation: false, nextBatchSelection: false },
  };
  await writeFile(paths.execution, `${JSON.stringify(execution, null, 2)}\n`);
  console.log(JSON.stringify({ status: execution.status, attempts: attempts.length, conditionalSecondContextUsed: execution.conditionalSecondContextUsed, acceptedAttemptNumber: execution.acceptedAttemptNumber, directIncrementalCostUsd: 0, paidTranscriptionCalls: 0, scoresDerived: 0 }, null, 2));
  if (!accepted) process.exitCode = 1;
}

async function analyze() {
  const [manifest, execution, recoveredAudit] = await Promise.all([readJson(paths.activation), readJson(paths.execution), readJson(paths.recoveredAudit)]);
  await validateActivation(manifest);
  assert.equal(execution.status, "batch-16-debate-144-audio-attribution-recovery-execution-passed");
  const acceptedResult = execution.results.find((item) => item.attemptNumber === execution.acceptedAttemptNumber);
  assert(acceptedResult?.outputPath);
  const [packet, outputBytes] = await Promise.all([readJson(manifest.context.packet), readFile(acceptedResult.outputPath)]);
  assert.equal(sha256(outputBytes), acceptedResult.outputSha256);
  const output = JSON.parse(outputBytes);
  const validation = await validateOutput(output, packet);
  assert.equal(validation.verified, 1);
  const preservedVerified = recoveredAudit.debates.flatMap((debate) => debate.moves).filter((move) => move.status === "verified");
  assert.equal(preservedVerified.length, 9);
  const decision = { debateNumber: "144", debateId: packet.debateId, ...output.adjudication };
  const combined = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-16-combined-audio-verification",
    protocolId: PROTOCOL_ID,
    status: "post-canary-batch-16-combined-audio-verification-passed",
    productionCanary: false,
    batchNumber: 16,
    stagingOnly: true,
    preservedPaidAndDeterministicGate: { path: paths.recoveredAudit, status: recoveredAudit.status, verified: 9, unresolved: 1, erasedOrReclassified: false, verifiedFieldsAltered: false },
    recovery: { field: "144:pro-guidance-no-added-ontological-cost", attempts: execution.attempts, acceptedAttemptNumber: execution.acceptedAttemptNumber, decision, verified: 1, unresolved: 0, rawTranscriptChanged: false, thresholdsChanged: false, rawSpeakerLabelsChanged: false },
    totals: { requiredMoves: 10, preservedVerified: 9, attributionAdjudicatedVerified: 1, verified: 10, unresolved: 0, verificationRate: 1, paidDiarizationCallsCompleted: 10, paidDiarizationReplacementAttempts: 1, paidDiarizationFallbackAttempts: 0, additionalPaidTranscriptionCallsThisStage: 0, cumulativeUsageDerivedEstimatedPaidDiarizationCostUsd: 0.45347, directIncrementalCostUsdThisStage: 0, scoresDerived: 0 },
    authorization: { disputeAdjudicationPreparation: true, disputeAdjudicationModelExecution: false, finalLedgerAssembly: false, scoreDerivation: false, productionMutation: false, nextBatchSelection: false },
  };
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-16-audio-attribution-recovery-analysis",
    protocolId: PROTOCOL_ID,
    status: "batch-16-debate-144-audio-attribution-recovery-passed",
    productionCanary: false,
    batchNumber: 16,
    stagingOnly: true,
    preservedGate: { status: recoveredAudit.status, verified: 9, unresolved: 1, erasedOrReclassified: false },
    validation,
    combinedAudioResult: combined.totals,
    costs: { cumulativeUsageDerivedEstimatedPaidDiarizationCostUsd: 0.45347, additionalPaidTranscriptionCalls: 0, directIncrementalCostUsd: 0, modelAuthentication: MODEL.authentication },
    scoreBlindness: { ratingsAccessed: false, scoresAccessed: false, legacyAssessmentsAccessed: false, otherDebatesAccessed: false, publicationProseAccessed: false, scoreArtifactCreated: false },
    authorization: combined.authorization,
  };
  if (shouldWrite) {
    await writeFile(paths.combined, `${JSON.stringify(combined, null, 2)}\n`);
    await writeFile(paths.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
  }
  console.log(JSON.stringify({ status: analysis.status, combinedVerified: 10, combinedRequired: 10, unresolved: 0, attempts: execution.attempts, acceptedAttemptNumber: execution.acceptedAttemptNumber, cumulativePaidCostUsd: 0.45347, directIncrementalCostUsd: 0, disputeAdjudicationPreparationAuthorized: true, scoresDerived: 0 }, null, 2));
}

async function test() {
  const preparation = await readJson(paths.preparation);
  await validatePreparation(preparation);
  const packet = await readJson(paths.packet);
  const transcript = await readJson(packet.move.diarizedTranscriptPath);
  const segmentIndex = transcript.segments.findIndex((segment) => String(segment.text ?? "").trim());
  assert(segmentIndex >= 0);
  const fixture = {
    schemaVersion: OUTPUT_VERSION,
    protocolId: PROTOCOL_ID,
    debateNumber: packet.debateNumber,
    debateId: packet.debateId,
    reviewerRole: "isolated-audio-attribution-adjudicator",
    assessmentModel: MODEL.label,
    productionCanary: false,
    stagingOnly: true,
    isolation: structuredClone(ISOLATION),
    adjudication: { moveId: packet.move.moveId, expectedSpeaker: packet.move.expectedSpeaker, status: "unresolved", authoringSpeaker: null, corePropositionAuthoredByExpectedSpeaker: false, mixedSpeakerSpan: true, identityResolution: "unresolved", evidenceSegmentIndexes: [segmentIndex], confidence: "low", rationale: "Synthetic unresolved fixture validates the closed score-blind recovery output shape." },
    audit: structuredClone(AUDIT),
  };
  assert.equal((await validateOutput(fixture, packet)).unresolved, 1);
  if (await exists(paths.activation)) await validateActivation(await readJson(paths.activation));
  if (await exists(paths.execution)) {
    const execution = await readJson(paths.execution);
    assert(execution.attempts <= 2);
    assert.equal(execution.retries, 0);
  }
  console.log(JSON.stringify({ status: "passed", debateNumber: "144", fields: 1, contextsMaximum: 2, attemptsPerContext: 1, retries: 0, model: "5.6 Sol/low", directIncrementalCostUsd: 0, scoresDerived: 0 }, null, 2));
}

if (mode === "prepare") await prepare();
if (mode === "activate") await activate();
if (mode === "run") await run();
if (mode === "analyze") await analyze();
if (mode === "test") await test();
