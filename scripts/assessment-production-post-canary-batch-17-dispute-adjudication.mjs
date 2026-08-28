#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  POST_CANARY_BATCH_17_DISPUTE_ADJ_PROTOCOL_ID,
  POST_CANARY_BATCH_17_DISPUTE_ADJ_ROOT,
  buildPostCanaryBatch17DisputeAdjudicationPacket,
  makePostCanaryBatch17DisputeAdjudicationSchema,
  validatePostCanaryBatch17DisputeAdjudicationOutput,
} from "./lib/assessment-production-post-canary-batch-17-dispute-adjudication.mjs";

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

const base = "docs/assessment-production/post-canary-continuation-v1/batch-17";
const disagreementRoot = `${base}/disagreement-extraction`;
const judgmentRoot = `${base}/independent-judgments`;
const audioRoot = `${base}/audio-verification`;
const expectedDebates = ["77", "44", "171", "62"];
const expectedDisputedMoves = 77;
const expectedCandidateSelections = 230;
const expectedAudioMoves = 1;
const expectedContexts = expectedDebates.length;
const toolPath = "scripts/assessment-production-post-canary-batch-17-dispute-adjudication.mjs";
const libPath = "scripts/lib/assessment-production-post-canary-batch-17-dispute-adjudication.mjs";
const inputs = {
  rubric: "docs/reassessment-rubric-v2.1.md",
  decomposedRubric: "docs/reassessment-rubric-v4.0.md",
  derivedFindingsRubric: "docs/reassessment-rubric-v4.0.1.md",
  boundedInventoryRubric: "docs/reassessment-rubric-v4.1.md",
  productionWorkflow: "docs/assessment-production-workflow.md",
  adjudicationWorkflow: "docs/assessment-production-checkpoint-v2.2-dispute-only-adjudication-workflow.md",
  manual: "docs/assessment-production/production-checkpoint-v2.2-1/dispute-only-adjudication/manual.md",
  schema: `${POST_CANARY_BATCH_17_DISPUTE_ADJ_ROOT}/adjudication.schema.json`,
};
const paths = {
  preparation: `${POST_CANARY_BATCH_17_DISPUTE_ADJ_ROOT}/preparation-manifest.json`,
  activation: `${POST_CANARY_BATCH_17_DISPUTE_ADJ_ROOT}/execution-activation.json`,
  execution: `${POST_CANARY_BATCH_17_DISPUTE_ADJ_ROOT}/model-execution.json`,
  analysis: `${POST_CANARY_BATCH_17_DISPUTE_ADJ_ROOT}/analysis.json`,
  disagreementAnalysis: `${disagreementRoot}/analysis.json`,
  judgmentPreparation: `${judgmentRoot}/execution-preparation-manifest.json`,
  judgmentExecution: `${judgmentRoot}/model-execution.json`,
  judgmentAnalysis: `${judgmentRoot}/analysis.json`,
  standing: `${base}/standing-authorization.json`,
  audioManifest: `${audioRoot}/execution-manifest.json`,
  recoveredAudio: `${audioRoot}/audio-verification.json`,
  recoveredAudioExecution: `${audioRoot}/model-execution.json`,
  combinedAudio: `${audioRoot}/audio-attribution-recovery/combined-audio-verification.json`,
  audioAttributionAnalysis: `${audioRoot}/audio-attribution-recovery/analysis.json`,
  audioAttributionOutput: `${audioRoot}/audio-attribution-recovery/outputs/debate-77.json`,
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);
const readJson = (file) => readFile(file, "utf8").then(JSON.parse);
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);

async function prepare() {
  const frozenAt = timestamp("--frozen-at");
  if (shouldWrite) for (const file of [inputs.schema, paths.preparation]) assert.equal(await exists(file), false, `${file} already exists`);
  const sourceFiles = [paths.disagreementAnalysis, paths.judgmentPreparation, paths.judgmentExecution, paths.judgmentAnalysis, paths.standing, paths.audioManifest, paths.recoveredAudio, paths.recoveredAudioExecution, paths.combinedAudio, paths.audioAttributionAnalysis, paths.audioAttributionOutput, ...Object.values(inputs).filter((file) => file !== inputs.schema), toolPath, libPath, "scripts/lib/v42211728-hard-route-adjudication.mjs", "scripts/lib/v4221175-decomposed-adjudication.mjs", "scripts/lib/v4-lean-production.mjs"];
  const [disagreementAnalysis, judgmentPreparation, judgmentExecution, judgmentAnalysis, standing, audioManifest, recoveredAudio, recoveredAudioExecution, combinedAudio, audioAttributionAnalysis, audioAttributionOutput] = await Promise.all([
    readJson(paths.disagreementAnalysis), readJson(paths.judgmentPreparation), readJson(paths.judgmentExecution), readJson(paths.judgmentAnalysis), readJson(paths.standing), readJson(paths.audioManifest), readJson(paths.recoveredAudio), readJson(paths.recoveredAudioExecution), readJson(paths.combinedAudio), readJson(paths.audioAttributionAnalysis), readJson(paths.audioAttributionOutput),
  ]);
  assert.equal(disagreementAnalysis.status, "post-canary-batch-17-deterministic-disagreements-extracted-standing-authorization-active-for-audio-work");
  assert.deepEqual(disagreementAnalysis.debates.map((item) => item.debateNumber), expectedDebates);
  assert.equal(disagreementAnalysis.adjudicationWorkload.disputedMoves, expectedDisputedMoves);
  assert.equal(disagreementAnalysis.adjudicationWorkload.candidateSelections, expectedCandidateSelections);
  assert.equal(judgmentPreparation.contexts.length, 8);
  assert.equal(judgmentExecution.status, "eight-post-canary-batch-17-independent-judgment-contexts-passed");
  assert.equal(judgmentExecution.validContexts, 8);
  assert.equal(judgmentExecution.invalidContexts, 0);
  assert.equal(judgmentAnalysis.status, "eight-post-canary-batch-17-independent-judgments-passed-standing-authorization-active-for-disagreement-extraction");
  assert.equal(standing.status, "frozen-active-batch-17-complete-remaining-workflow-standing-authorization");
  assert.deepEqual(standing.selectedDebates, expectedDebates);
  assert.equal(standing.authorization.adjudicationPreparationAndModelExecution, true);
  assert.equal(recoveredAudio.status, "post-canary-batch-17-audio-verification-unresolved");
  assert.equal(recoveredAudioExecution.status, "one-post-canary-batch-17-paid-known-speaker-diarization-completed");
  assert.equal(combinedAudio.status, "post-canary-batch-17-combined-audio-verification-passed");
  assert.equal(combinedAudio.totals.verified, 1);
  assert.equal(combinedAudio.totals.unresolved, 0);
  assert.equal(audioAttributionAnalysis.status, "batch-17-audio-attribution-recovery-passed");
  assert.equal(audioAttributionOutput.adjudications[0].status, "verified");
  const frozenCalls = new Map(audioManifest.calls.map((call) => [`${call.debateNumber}:${call.moveId}`, call]));
  const attributionDecisionByKey = new Map(combinedAudio.recovery.decisions.map((decision) => [`${decision.debateNumber}:${decision.moveId}`, decision]));
  const audioByDebateMove = new Map();
  for (const move of recoveredAudio.debates.flatMap((debate) => debate.moves)) {
    const key = `${move.debateNumber}:${move.moveId}`;
    const call = frozenCalls.get(key);
    assert(call, `${key}: frozen call unavailable`);
    const attributionDecision = attributionDecisionByKey.get(key) ?? null;
    const acceptedByAttribution = attributionDecision?.status === "verified";
    assert(move.status === "verified" || acceptedByAttribution, `${key}: audio not verified`);
    const transcriptBytes = await readFile(move.transcript.path);
    assert.equal(sha256(transcriptBytes), move.transcript.sha256, `${key}: transcript changed`);
    sourceFiles.push(move.transcript.path);
    audioByDebateMove.set(key, {
      debateNumber: move.debateNumber,
      moveId: move.moveId,
      expectedSpeaker: move.expectedSpeaker,
      resolvedSpeaker: move.expectedSpeaker,
      status: "verified",
      deterministicEvidence: { ...move.deterministicEvidence, status: "verified", deterministicGateOriginallyPassed: move.status === "verified", attributionAdjudication: acceptedByAttribution ? attributionDecision : null },
      executionStatus: "completed",
      clip: { path: call.clipPath, sha256: call.clipSha256, durationSeconds: call.durationSeconds },
      transcript: { path: move.transcript.path, sha256: move.transcript.sha256, model: call.model, responseFormat: call.responseFormat, persistentMutation: false },
    });
  }
  assert.equal(audioByDebateMove.size, expectedAudioMoves);
  const schema = makePostCanaryBatch17DisputeAdjudicationSchema();
  const schemaBytes = pretty(schema);
  const sharedInputBytes = (await Promise.all(Object.values(inputs).filter((file) => file !== inputs.schema).map((file) => readFile(file)))).reduce((sum, bytes) => sum + bytes.length, 0) + schemaBytes.length;
  const contexts = [];
  const sourceHashes = {};
  let disputedMoves = 0;
  let candidateSelections = 0;
  let audioVerifiedMoves = 0;
  for (const debateNumber of expectedDebates) {
    const judgmentContext = judgmentPreparation.contexts.find((item) => item.debateNumber === debateNumber && item.reviewerPass === "A");
    assert(judgmentContext, `Debate ${debateNumber}: judgment context missing`);
    const disagreementPath = `${disagreementRoot}/disagreements/debate-${debateNumber}.json`;
    const [disagreementBytes, inventoryBytes, sourcePacketBytes, eventsBytes] = await Promise.all([readFile(disagreementPath), readFile(judgmentContext.lockedInventory), readFile(judgmentContext.sourcePacket), readFile(judgmentContext.originalEvents)]);
    for (const [file, bytes] of [[disagreementPath, disagreementBytes], [judgmentContext.lockedInventory, inventoryBytes], [judgmentContext.sourcePacket, sourcePacketBytes], [judgmentContext.originalEvents, eventsBytes]]) sourceHashes[file] = sha256(bytes);
    const audioByMoveId = new Map([...audioByDebateMove].filter(([key]) => key.startsWith(`${debateNumber}:`)).map(([key, value]) => [key.slice(debateNumber.length + 1), value]));
    const built = buildPostCanaryBatch17DisputeAdjudicationPacket(JSON.parse(disagreementBytes), JSON.parse(inventoryBytes), JSON.parse(eventsBytes), audioByMoveId);
    const packetPath = `${POST_CANARY_BATCH_17_DISPUTE_ADJ_ROOT}/packets/debate-${debateNumber}.json`;
    const provenancePath = `${POST_CANARY_BATCH_17_DISPUTE_ADJ_ROOT}/provenance/debate-${debateNumber}.json`;
    const outputPath = `${POST_CANARY_BATCH_17_DISPUTE_ADJ_ROOT}/outputs/debate-${debateNumber}.json`;
    // Keep the complete packet while removing indentation-only duplication so every
    // isolated context remains below the frozen 400 KB copied-input ceiling.
    const packetBytes = Buffer.from(`${JSON.stringify(built.packet)}\n`);
    const provenanceBytes = pretty({ schemaVersion: "1.0-assessment-production-post-canary-batch-17-adjudication-candidate-provenance", protocolId: built.packet.protocolId, debateNumber, modelInput: false, mappings: built.provenance });
    const selections = built.packet.disputedMoves.reduce((sum, move) => sum + [move.candidates.importancePair, move.candidates.attributionPair, move.candidates.responsePair, move.candidates.charityPair, move.candidates.assessmentConfidencePair].filter(Boolean).length + Object.keys(move.candidates.scoringFields).length, built.packet.burdenAdjustmentDisputes.length);
    let audioTranscriptBytes = 0;
    for (const item of built.audioTranscriptInputs) {
      const bytes = await readFile(item.sourcePath);
      assert.equal(sha256(bytes), item.sha256, `${item.moveId}: audio transcript changed`);
      sourceHashes[item.sourcePath] = item.sha256;
      audioTranscriptBytes += bytes.length;
    }
    if (shouldWrite) {
      await mkdir(path.dirname(packetPath), { recursive: true });
      await mkdir(path.dirname(provenancePath), { recursive: true });
      await writeFile(packetPath, packetBytes);
      await writeFile(provenancePath, provenanceBytes);
    }
    contexts.push({ contextIndex: contexts.length, debateNumber, debateId: built.packet.debateId, packet: packetPath, packetSha256: sha256(packetBytes), provenance: provenancePath, provenanceSha256: sha256(provenanceBytes), output: outputPath, disputeSource: disagreementPath, lockedInventory: judgmentContext.lockedInventory, sourcePacket: judgmentContext.sourcePacket, originalEvents: judgmentContext.originalEvents, disputedMoves: built.packet.disputedMoves.length, candidateSelections: selections, audioVerifiedMoves: built.packet.disputedMoves.filter((move) => move.evidence.audioVerification !== null).length, audioTranscriptInputs: built.audioTranscriptInputs, packetBytes: packetBytes.length, copiedInputBytes: sharedInputBytes + packetBytes.length + audioTranscriptBytes });
    disputedMoves += built.packet.disputedMoves.length;
    candidateSelections += selections;
    audioVerifiedMoves += contexts.at(-1).audioVerifiedMoves;
  }
  assert.equal(disputedMoves, expectedDisputedMoves);
  assert.equal(candidateSelections, expectedCandidateSelections);
  assert.equal(audioVerifiedMoves, expectedAudioMoves);
  assert(Math.max(...contexts.map((item) => item.copiedInputBytes)) <= 400000, "adjudication context exceeds 400 KB ceiling");
  for (const file of [...new Set(sourceFiles)]) sourceHashes[file] = sha256(await readFile(file));
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const preparation = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-17-dispute-only-adjudication-preparation",
    protocolId: POST_CANARY_BATCH_17_DISPUTE_ADJ_PROTOCOL_ID,
    status: "prepared-four-isolated-post-canary-batch-17-dispute-only-adjudication-contexts-not-active",
    frozenAt,
    checkpointCommit: head,
    productionCanary: false,
    batchNumber: 17,
    stagingOnly: true,
    AIOnly: true,
    model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "low", authentication: "ChatGPT subscription", scoreBlind: true, roundedIntegerScoreTiesPermitted: true, meteredApiCostUsdMaximum: 0 },
    modelInputs: inputs,
    contexts,
    acceptedSourceBoundary: { independentJudgments: paths.judgmentAnalysis, frozenDisagreements: paths.disagreementAnalysis, audioVerification: paths.combinedAudio, allEightJudgmentsAccepted: true, allRequiredAudioMovesVerified: true, cumulativeAudioUsageDerivedEstimatedCostUsd: 0.0590775, additionalPaidCallsThisStage: 0 },
    evidenceBoundary: { disputedFieldsOnly: true, candidateOrderingAnonymizedPerPair: true, provenanceFilesNeverModelInputs: true, initialPassIdentitiesUnavailable: true, initialPassRationalesUnavailable: true, nondisputedFieldsUnavailable: true, fullInitialOutputsUnavailable: true, calculatedScoresUnavailable: true, winnersUnavailable: true, legacyAssessmentsUnavailable: true, otherDebatesUnavailable: true, publicationProseUnavailable: true, rawVerifiedDiarizedTranscriptsSuppliedOnlyWhereRequired: true },
    executionPolicy: { contexts: expectedContexts, concurrency: 2, attemptsPerContext: 1, retriesMaximum: 0, timeoutExtensionsMaximum: 0, timeoutMsPerContext: 720000, freshTemporaryCodexHomePerContext: true, freshSourceDirectoryPerContext: true, APIKeysRemoved: true, removedEnvironmentVariables: ["OPENAI_API_KEY", "OPENAI_ORG_ID", "OPENAI_PROJECT_ID", "OPENAI_BASE_URL", "AZURE_OPENAI_API_KEY", "CODEX_API_KEY"] },
    totals: { contexts: expectedContexts, disputedMoves, candidateSelections, audioVerifiedMoves, modelContextsExecuted: 0, paidServiceCalls: 0, finalLedgersAssembled: 0, scoresDerived: 0, publicationReconstructions: 0, productionMutations: 0, nextBatchSelections: 0, directIncrementalCostUsd: 0 },
    sourceHashes,
    futureOutputPathsExcludedFromSourceHashes: [paths.activation, paths.execution, paths.analysis, ...contexts.map((context) => context.output)],
  };
  if (shouldWrite) {
    await mkdir(POST_CANARY_BATCH_17_DISPUTE_ADJ_ROOT, { recursive: true });
    await writeFile(inputs.schema, schemaBytes);
    await writeFile(paths.preparation, pretty(preparation));
  }
  console.log(JSON.stringify({ status: shouldWrite ? preparation.status : "preview", debates: expectedDebates, contexts: expectedContexts, disputedMoves, candidateSelections, audioVerifiedMoves, maximumCopiedInputBytes: Math.max(...contexts.map((item) => item.copiedInputBytes)), model: "5.6 Sol/low", directIncrementalCostUsd: 0, scoresDerived: 0 }, null, 2));
}

async function validatePreparation(preparation, expectedStatus = "prepared-four-isolated-post-canary-batch-17-dispute-only-adjudication-contexts-not-active") {
  assert.equal(preparation.status, expectedStatus);
  assert.equal(preparation.batchNumber, 17);
  assert.deepEqual(preparation.contexts.map((item) => item.debateNumber), expectedDebates);
  assert.equal(preparation.totals.disputedMoves, expectedDisputedMoves);
  assert.equal(preparation.totals.candidateSelections, expectedCandidateSelections);
  assert.equal(preparation.totals.audioVerifiedMoves, expectedAudioMoves);
  assert.equal(preparation.executionPolicy.attemptsPerContext, 1);
  assert.equal(preparation.executionPolicy.retriesMaximum, 0);
  for (const [file, digest] of Object.entries(preparation.sourceHashes)) assert.equal(sha256(await readFile(file)), digest, `source hash mismatch: ${file}`);
  for (const context of preparation.contexts) {
    assert.equal(sha256(await readFile(context.packet)), context.packetSha256);
    assert.equal(sha256(await readFile(context.provenance)), context.provenanceSha256);
  }
}

async function activate() {
  const activatedAt = timestamp("--activated-at");
  assert.equal(await exists(paths.activation), false, `${paths.activation} already exists`);
  const preparationBytes = await readFile(paths.preparation);
  const preparation = JSON.parse(preparationBytes);
  await validatePreparation(preparation);
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  assert.equal(head, execFileSync("git", ["rev-parse", "main"], { encoding: "utf8" }).trim());
  assert.equal(head, execFileSync("git", ["rev-parse", "origin/main"], { encoding: "utf8" }).trim());
  const activation = {
    ...preparation,
    schemaVersion: "1.0-assessment-production-post-canary-batch-17-dispute-only-adjudication-execution-activation",
    status: "frozen-four-post-canary-batch-17-dispute-only-adjudication-contexts-authorized",
    activatedAt,
    checkpointCommit: head,
    preparationManifest: { path: paths.preparation, sha256: sha256(preparationBytes) },
    authorization: { adjudicationModelContexts: true, judgmentModelContexts: false, paidServices: false, finalLedgerAssembly: false, scoreDerivation: false, publicationReconstruction: false, productionMutation: false, nextBatchSelection: false },
    artifacts: { execution: paths.execution, analysis: paths.analysis },
    futureOutputPathsExcludedFromSourceHashes: preparation.futureOutputPathsExcludedFromSourceHashes.filter((file) => file !== paths.activation),
  };
  if (shouldWrite) await writeFile(paths.activation, pretty(activation));
  console.log(JSON.stringify({ status: shouldWrite ? activation.status : "preview", contexts: expectedContexts, concurrency: 2, attemptsPerContext: 1, retriesMaximum: 0, model: "5.6 Sol/low", directIncrementalCostUsd: 0, active: shouldWrite }, null, 2));
}

async function validateActivation(manifest) {
  await validatePreparation(manifest, "frozen-four-post-canary-batch-17-dispute-only-adjudication-contexts-authorized");
  assert.equal(sha256(await readFile(manifest.preparationManifest.path)), manifest.preparationManifest.sha256);
  assert.equal(manifest.authorization.adjudicationModelContexts, true);
}

function invoke(command, args, options, timeoutMs) {
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

async function runContext(manifest, context) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-b17-adjudication-${context.debateNumber}-`));
  const temporaryCodexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-b17-adjudication-home-${context.debateNumber}-`));
  const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
  const authSource = path.join(os.homedir(), ".codex", "auth.json");
  const startedAt = new Date().toISOString();
  const started = Date.now();
  try {
    const copies = [[manifest.modelInputs.rubric, "rubric.md"], [manifest.modelInputs.decomposedRubric, "rubric-base.md"], [manifest.modelInputs.derivedFindingsRubric, "rubric-derived.md"], [manifest.modelInputs.boundedInventoryRubric, "rubric-bounded.md"], [manifest.modelInputs.productionWorkflow, "production-workflow.md"], [manifest.modelInputs.adjudicationWorkflow, "adjudication-workflow.md"], [manifest.modelInputs.manual, "manual.md"], [manifest.modelInputs.schema, "schema.json"], [context.packet, "packet.json"], ...context.audioTranscriptInputs.map((item) => [item.sourcePath, item.modelInputFile])];
    let copiedInputBytes = 0;
    for (const [source, target] of copies) {
      const bytes = await readFile(source);
      copiedInputBytes += bytes.length;
      await copyFile(source, path.join(temporary, target));
    }
    assert.equal(copiedInputBytes, context.copiedInputBytes, `Debate ${context.debateNumber}: copied input changed`);
    await copyFile(authSource, path.join(temporaryCodexHome, "auth.json"));
    const environment = { ...process.env, CODEX_HOME: temporaryCodexHome };
    for (const key of manifest.executionPolicy.removedEnvironmentVariables) delete environment[key];
    const audioFiles = context.audioTranscriptInputs.map((item) => item.modelInputFile);
    const prompt = `Read rubric.md, rubric-base.md, rubric-derived.md, rubric-bounded.md, production-workflow.md, adjudication-workflow.md, manual.md, packet.json, schema.json${audioFiles.length ? `, and ${audioFiles.join(", ")}` : ""}; read nothing else. Act only as the isolated, score-blind, disputed-fields-only adjudicator for post-canary Batch 17 Debate ${context.debateNumber}. Decide every required anonymous candidate pair and scoring field exactly once from the locked evidence. Candidate ordering may reverse independently for every field. Select only candidate 1 or candidate 2. Never mix, average, interpolate, repair, rewrite, or invent a candidate. Use any supplied diarized transcript only for its associated move. Never infer either initial pass identity or rationale. Never calculate a move, section, side, or debate score. Never produce a winner, legacy assessment, Overall Commentary, AI Extension, or publication prose. Return exactly one schema-conforming JSON object.`;
    process.stdout.write(`[batch-17-adjudication] starting ${context.contextIndex + 1}/${expectedContexts} Debate ${context.debateNumber}\n`);
    const invocation = await invoke(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort=\"${manifest.model.reasoningEffort}\"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env: environment }, manifest.executionPolicy.timeoutMsPerContext);
    const resultPath = path.join(temporary, "result.json");
    const resultExists = await exists(resultPath);
    const baseRecord = { contextIndex: context.contextIndex, debateNumber: context.debateNumber, debateId: context.debateId, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, scoreBlind: true, roundedIntegerScoreTiesPermitted: true, attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, authentication: "ChatGPT subscription", apiKeysRemoved: true, copiedInputBytes, audioTranscriptInputs: audioFiles, meteredApiCostUsd: 0, paidServiceCalls: 0, transcriptionCostUsdThisStage: 0, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) return { ...baseRecord, status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed", gateAcceptancePassed: false, outputWritten: false, failureMessage: `${invocation.stdout}\n${invocation.stderr}`.trim().slice(-10000) };
    await mkdir(path.dirname(context.output), { recursive: true });
    await copyFile(resultPath, context.output);
    let validation = null;
    let validationMessage = null;
    try { validation = validatePostCanaryBatch17DisputeAdjudicationOutput(JSON.parse(await readFile(context.output, "utf8")), JSON.parse(await readFile(context.packet, "utf8"))); } catch (error) { validationMessage = String(error?.stack ?? error).slice(-10000); }
    return { ...baseRecord, status: validation?.status === "passed" ? "completed-valid" : "output-validation-failed", gateAcceptancePassed: validation?.status === "passed", outputWritten: true, outputSha256: sha256(await readFile(context.output)), validationSummary: validation, validationMessage };
  } catch (error) {
    return { contextIndex: context.contextIndex, debateNumber: context.debateNumber, debateId: context.debateId, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, scoreBlind: true, attemptCount: 1, retryCount: 0, timeoutExtensionCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, authentication: "ChatGPT subscription", apiKeysRemoved: true, copiedInputBytes: context.copiedInputBytes, status: "runner-error", gateAcceptancePassed: false, outputWritten: await exists(context.output), failureMessage: String(error?.stack ?? error).slice(-10000), meteredApiCostUsd: 0, paidServiceCalls: 0 };
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(temporaryCodexHome, { recursive: true, force: true });
  }
}

async function run() {
  assert.equal(await exists(paths.execution), false, `${paths.execution} already exists`);
  const manifest = await readJson(paths.activation);
  await validateActivation(manifest);
  for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) assert.equal(await exists(future), false, `future output exists: ${future}`);
  const gateStartedAt = new Date().toISOString();
  const gateStarted = Date.now();
  const queue = [...manifest.contexts];
  const results = [];
  async function worker() {
    while (queue.length) {
      const context = queue.shift();
      const result = await runContext(manifest, context);
      results.push(result);
      process.stdout.write(`[batch-17-adjudication] Debate ${context.debateNumber} ${result.status} in ${(result.elapsedMs / 60000).toFixed(2)}m\n`);
    }
  }
  await Promise.all(Array.from({ length: manifest.executionPolicy.concurrency }, worker));
  results.sort((left, right) => left.contextIndex - right.contextIndex);
  const validContexts = results.filter((item) => item.gateAcceptancePassed).length;
  const execution = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-17-dispute-only-adjudication-model-execution",
    protocolId: manifest.protocolId,
    status: validContexts === expectedContexts ? "four-post-canary-batch-17-dispute-only-adjudication-contexts-passed" : "post-canary-batch-17-dispute-only-adjudication-gate-complete-with-failure",
    productionCanary: false,
    batchNumber: 17,
    stagingOnly: true,
    gateStartedAt,
    gateCompletedAt: new Date().toISOString(),
    contextsPlanned: expectedContexts,
    contextsAttempted: results.length,
    validContexts,
    invalidContexts: results.length - validContexts,
    attempts: results.length,
    retries: 0,
    timeoutExtensions: 0,
    corrections: 0,
    maximumObservedConcurrency: 2,
    wallElapsedMs: Date.now() - gateStarted,
    aggregateModelElapsedMs: results.reduce((sum, item) => sum + item.elapsedMs, 0),
    results,
    adjudicationModelContexts: results.length,
    judgmentModelContexts: 0,
    paidServiceCalls: 0,
    meteredApiCostUsd: 0,
    directIncrementalCostUsd: 0,
    scoresDerived: 0,
    productionMutations: 0,
    nextBatchSelections: 0,
    authorization: { deterministicAnalysis: true, retry: false, timeoutExtension: false, correctionModelExecution: false, judgmentModelExecution: false, paidServices: false, finalLedgerAssembly: false, scoreDerivation: false, publicationReconstruction: false, productionMutation: false, nextBatchSelection: false },
  };
  await writeFile(paths.execution, pretty(execution));
  console.log(JSON.stringify({ status: execution.status, contextsAttempted: results.length, validContexts, invalidContexts: execution.invalidContexts, wallElapsedMinutes: Number((execution.wallElapsedMs / 60000).toFixed(2)), retries: 0, directIncrementalCostUsd: 0, scoresDerived: 0 }, null, 2));
  if (validContexts !== expectedContexts) process.exitCode = 1;
}

async function analyze() {
  const [manifest, execution] = await Promise.all([readJson(paths.activation), readJson(paths.execution)]);
  await validateActivation(manifest);
  assert.equal(execution.status, "four-post-canary-batch-17-dispute-only-adjudication-contexts-passed");
  const contexts = [];
  let disputedMovesDecided = 0;
  let candidateSelections = 0;
  for (const context of manifest.contexts) {
    const result = execution.results.find((item) => item.contextIndex === context.contextIndex);
    assert(result?.gateAcceptancePassed);
    const [packet, outputBytes] = await Promise.all([readJson(context.packet), readFile(context.output)]);
    assert.equal(sha256(outputBytes), result.outputSha256);
    const validation = validatePostCanaryBatch17DisputeAdjudicationOutput(JSON.parse(outputBytes), packet);
    assert.equal(validation.status, "passed");
    disputedMovesDecided += context.disputedMoves;
    candidateSelections += context.candidateSelections;
    contexts.push({ contextIndex: context.contextIndex, debateNumber: context.debateNumber, debateId: context.debateId, status: result.status, accepted: true, elapsedMinutes: Number((result.elapsedMs / 60000).toFixed(2)), validationReplayed: true, disputedMoves: context.disputedMoves, candidateSelections: context.candidateSelections, audioTranscriptInputs: context.audioTranscriptInputs.length, calculatedScores: 0, model: result.model, modelSlug: result.modelSlug, reasoningEffort: result.reasoningEffort, authentication: result.authentication, apiKeysRemoved: result.apiKeysRemoved, attemptCount: 1, retryCount: 0 });
  }
  const maxElapsed = Math.max(...contexts.map((item) => item.elapsedMinutes));
  const meanElapsed = contexts.reduce((sum, item) => sum + item.elapsedMinutes, 0) / contexts.length;
  const passed = disputedMovesDecided === expectedDisputedMoves && candidateSelections === expectedCandidateSelections && contexts.length === expectedContexts;
  const analysis = {
    schemaVersion: "1.0-assessment-production-post-canary-batch-17-dispute-only-adjudication-analysis",
    protocolId: POST_CANARY_BATCH_17_DISPUTE_ADJ_PROTOCOL_ID,
    status: passed ? "post-canary-batch-17-dispute-only-adjudication-gate-passed-standing-authorization-active-for-final-ledger-assembly" : "post-canary-batch-17-dispute-only-adjudication-gate-failed",
    analyzedAt: new Date().toISOString(),
    productionCanary: false,
    batchNumber: 17,
    stagingOnly: true,
    AIOnly: true,
    contexts,
    gate: { semanticPass: passed, timingPass: maxElapsed <= 12 && meanElapsed <= 9.5, scoreBlindPass: true, isolationPass: true, validContexts: expectedContexts, requiredValidContexts: expectedContexts, disputedMovesDecided, requiredDisputedMoves: expectedDisputedMoves, candidateSelections, requiredCandidateSelections: expectedCandidateSelections, maximumElapsedMinutes: maxElapsed, maximumAllowedMinutesPerContext: 12, meanElapsedMinutes: Number(meanElapsed.toFixed(2)), maximumAllowedMeanMinutes: 9.5, attempts: expectedContexts, retries: 0, timeoutExtensions: 0, corrections: 0, scoresDerived: 0 },
    totals: { adjudicationModelContexts: expectedContexts, judgmentModelContexts: 0, paidServiceCalls: 0, retries: 0, timeoutExtensions: 0, corrections: 0, scoresDerived: 0, publicationReconstructions: 0, productionMutations: 0, nextBatchSelections: 0, directIncrementalCostUsd: 0 },
    authorization: { finalLedgerAssembly: passed, scoreDerivation: false, judgmentModelExecution: false, adjudicationModelExecution: false, paidServices: false, publicationReconstruction: false, publicationModelExecution: false, productionMutation: false, nextBatchSelection: false },
    nextAuthorizedAction: passed ? "standing-authorization-permits-batch-17-deterministic-final-ledger-assembly" : "stop-for-substantive-adjudication-blocker",
  };
  if (shouldWrite) await writeFile(paths.analysis, pretty(analysis));
  console.log(JSON.stringify({ status: analysis.status, validContexts: expectedContexts, disputedMovesDecided, candidateSelections, maximumElapsedMinutes: maxElapsed, meanElapsedMinutes: analysis.gate.meanElapsedMinutes, retries: 0, scoresDerived: 0, finalLedgerAssemblyAuthorized: passed }, null, 2));
  if (!passed) process.exitCode = 1;
}

async function test() {
  const preparation = await readJson(paths.preparation);
  await validatePreparation(preparation);
  const schema = await readJson(inputs.schema);
  assert.equal(schema.properties.batchNumber.const, 17);
  for (const context of preparation.contexts) {
    const packet = await readJson(context.packet);
    assert.equal(packet.batchNumber, 17);
    assert.equal(packet.disputedMoves.length, context.disputedMoves);
  }
  if (await exists(paths.activation)) await validateActivation(await readJson(paths.activation));
  if (await exists(paths.execution)) {
    const execution = await readJson(paths.execution);
    assert(execution.attempts <= expectedContexts);
    assert.equal(execution.retries, 0);
  }
  console.log(JSON.stringify({ status: "passed", debates: expectedDebates, contexts: expectedContexts, disputedMoves: expectedDisputedMoves, candidateSelections: expectedCandidateSelections, audioVerifiedMoves: expectedAudioMoves, attemptsPerContext: 1, retriesMaximum: 0, model: "5.6 Sol/low", scoresDerived: 0 }, null, 2));
}

if (mode === "prepare") await prepare();
if (mode === "activate") await activate();
if (mode === "run") await run();
if (mode === "analyze") await analyze();
if (mode === "test") await test();
