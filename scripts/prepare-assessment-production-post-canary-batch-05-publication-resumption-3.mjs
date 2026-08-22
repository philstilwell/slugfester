#!/usr/bin/env node
import { createHash } from "node:crypto"; import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises"; import path from "node:path";
import { POST_CANARY_BATCH_05_PUBLICATION_MODEL, POST_CANARY_BATCH_05_PUBLICATION_ROOT } from
  "./lib/assessment-production-post-canary-batch-05-publication.mjs";
import { validatePostCanaryBatch05PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-05-publication-validation.mjs";
import { POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_3_PROTOCOL_ID,
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_3_ROOT } from
  "./lib/assessment-production-post-canary-batch-05-publication-resumption-3.mjs";
import { POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch05StandingAuthorization } from
  "./lib/assessment-production-post-canary-batch-05-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write"); const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");
const ROOT = POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_3_ROOT;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const ORIGINAL_PREPARATION = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/execution-preparation-manifest.json`;
const RESUMPTION_2_EXECUTION = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-2/model-execution.json`;
const REPAIR_ANALYSIS = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-2/repair-1/analysis.json`;
const acceptedDefinitions = [
  ["158", `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/outputs/debate-158.json`],
  ["46", `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/outputs/debate-46.json`],
  ["64", `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/repair-1/merged/debate-64.json`],
  ["132", `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/outputs/debate-132.json`],
  ["189", `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/recovery-1/correction-2/merged/debate-189.json`],
  ["109", `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/recovery-1/correction-2/merged/debate-109.json`],
  ["179", `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-2/outputs/debate-179.json`],
  ["05", `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-2/outputs/debate-05.json`],
  ["42", `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-2/repair-1/merged/debate-42.json`]
];
const CODEX_PATH = "/Applications/ChatGPT.app/Contents/Resources/codex";
const STATIC = [ORIGINAL_PREPARATION, RESUMPTION_2_EXECUTION,
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-2/analysis.json`, REPAIR_ANALYSIS,
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-2/repair-1/execution-preparation-manifest.json`,
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-2/repair-1/execution-activation.json`,
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-2/repair-1/model-execution.json`,
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/manual.md`,
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/reference-catalog.json`,
  "docs/assessment-production-workflow.md", "docs/assessment-workflow-v4.2.21.17.41.md",
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
  POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
  ...acceptedDefinitions.flatMap(([number, output]) => [output,
    `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/packets/debate-${number}.json`]),
  "scripts/lib/v4-lean-production.mjs", "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication-validation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-publication-resumption-3.mjs",
  "scripts/lib/assessment-production-post-canary-batch-05-standing-authorization.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-05-publication-resumption-3.mjs",
  "scripts/test-assessment-production-post-canary-batch-05-publication-resumption-3-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-05-publication-resumption-3.mjs",
  "scripts/run-assessment-production-post-canary-batch-05-publication-resumption-3.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-05-publication-resumption-3.mjs"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const standing = await loadAndValidatePostCanaryBatch05StandingAuthorization();
const originalBytes = await readFile(path.resolve(ORIGINAL_PREPARATION)); const original = JSON.parse(originalBytes);
const resumptionExecution = JSON.parse(await readFile(path.resolve(RESUMPTION_2_EXECUTION), "utf8"));
const repairAnalysis = JSON.parse(await readFile(path.resolve(REPAIR_ANALYSIS), "utf8"));
assertV4(original.contexts?.length === 10 && original.totals?.moves === 187 &&
  resumptionExecution.contextsPlanned === 4 && resumptionExecution.contextsAttempted === 3 &&
  resumptionExecution.contextsUnattempted === 1 && resumptionExecution.unattemptedContextIndexes?.[0] === 3 &&
  repairAnalysis.status === "batch-05-debate-42-two-packet-repair-and-complete-validation-passed" &&
  repairAnalysis.authorization?.debate59ResumptionManifestPreparation === true,
"the one-context Debate 59 resumption boundary changed");
const acceptedDebates = [];
for (const [number, outputPath] of acceptedDefinitions) { const packetPath = `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/packets/debate-${number}.json`;
  const [outputBytes, packetBytes] = await Promise.all([readFile(path.resolve(outputPath)), readFile(path.resolve(packetPath))]);
  const validation = validatePostCanaryBatch05PublicationOutput(JSON.parse(outputBytes), JSON.parse(packetBytes));
  acceptedDebates.push({ debateNumber: number, debateId: JSON.parse(packetBytes).debateId,
    output: outputPath, outputSha256: sha256(outputBytes), packet: packetPath,
    packetSha256: sha256(packetBytes), moves: validation.moves, critiques: validation.critiques,
    exactSourceQuotes: validation.quoteExactSourceMatches,
    overallCommentarySides: validation.overallCommentarySides,
    aiExtensionSides: validation.aiExtensionSides, lockedScoresUnchanged: true }); }
assertV4(acceptedDebates.reduce((sum, row) => sum + row.moves, 0) === 167,
  "the nine accepted debate move total changed");
const source = original.contexts.find((row) => row.debateNumber === "59");
assertV4(source?.contextIndex === 9 && source.moves === 20, "Debate 59 original context changed");
for (const file of [source.rawOutput, source.validation, source.provenance,
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-1/outputs/debate-59.json`,
  `${POST_CANARY_BATCH_05_PUBLICATION_ROOT}/resumption-2/outputs/debate-59.json`])
  assertV4(!(await exists(file)), `unattempted Debate 59 artifact exists: ${file}`);
for (const [file, digest] of [[source.packet, source.packetSha256], [source.schema, source.schemaSha256],
  [source.sourcePacket, source.sourcePacketSha256], [source.transcript, source.transcriptSha256],
  [source.events, source.eventsSha256], [source.localManifest, source.localManifestSha256]])
  assertV4(sha256(await readFile(path.resolve(file))) === digest, `Debate 59 source drifted: ${file}`);
const context = { ...structuredClone(source), contextIndex: 0, originalContextIndex: 9,
  originalUnattemptedOutput: source.rawOutput, originalUnattemptedValidation: source.validation,
  originalUnattemptedProvenance: source.provenance,
  rawOutput: `${ROOT}/outputs/debate-59.json`, output: `${ROOT}/outputs/debate-59.json`,
  validation: `${ROOT}/validations/debate-59.json`, provenance: `${ROOT}/provenance/debate-59.json` };
const futureOutputs = [context.output, context.validation, context.provenance,
  `${ROOT}/execution-activation.json`, `${ROOT}/model-execution.json`, `${ROOT}/analysis.json`,
  `${ROOT}/cohort-validation.json`];
for (const file of [MANIFEST, ...futureOutputs]) assertV4(!(await exists(file)), `${file} exists`);
const sourceHashes = structuredClone(original.sourceHashes);
for (const file of [...new Set(STATIC)].sort()) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
for (const [file, digest] of [[context.packet, context.packetSha256], [context.schema, context.schemaSha256],
  [context.sourcePacket, context.sourcePacketSha256], [context.transcript, context.transcriptSha256],
  [context.events, context.eventsSha256], [context.localManifest, context.localManifestSha256]]) sourceHashes[file] = digest;
const manifest = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-resumption-3-preparation",
  protocolId: POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_3_PROTOCOL_ID,
  status: "frozen-one-unattempted-batch-05-debate-59-publication-context-prepared-and-authorized",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 5, stagingOnly: true, AIOnly: true,
  userAuthorization: { instruction: standing.record.userAuthorization.instruction,
    standingAuthorization: POST_CANARY_BATCH_05_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standing.sha256, directIncrementalCostUsdMaximum: 0,
    contextsPrepared: 1, existingPacketsReused: 1, packetsGenerated: 0 },
  model: structuredClone(POST_CANARY_BATCH_05_PUBLICATION_MODEL),
  costEstimate: { authentication: "ChatGPT subscription", contexts: 1,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    expectedWallMinutes: [2, 10], absoluteGateTimeoutMinutes: 10 },
  executionEnvironment: { codexPath: CODEX_PATH,
    codexCliVersion: execFileSync(CODEX_PATH, ["--version"], { encoding: "utf8" }).trim(),
    authentication: "ChatGPT subscription", APIKeysRemoved: true },
  modelInputs: structuredClone(original.modelInputs), acceptedDebates, contexts: [context],
  isolation: { oneDebatePerContext: true, separateFreshModelContextRequired: true,
    originalPacketAndSchemaReusedByteForByte: true, participantJudgmentWasScoreBlind: true,
    ownDebateScoresImmutable: true, acceptedOutputsUnavailableToModel: true,
    otherDebatesUnavailable: true, legacyAssessmentsUnavailable: true },
  executionPolicy: { contexts: 1, attemptsPerContext: 1, retriesMaximum: 0,
    correctionContextsMaximum: 0, timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0, maximumParallelContexts: 1, schedulerRamp: [1],
    rampPhases: [{ phase: "single-debate-59", maximumParallelContexts: 1,
      contextIndexes: [0], expansionRequiresAllValid: true }],
    authentication: "ChatGPT subscription", APIKeysRemoved: true,
    removedEnvironmentVariables: original.executionPolicy.removedEnvironmentVariables,
    directIncrementalCostUsdMaximum: 0, meteredApiCostUsdMaximum: 0,
    separateActivationRequired: true },
  acceptanceContract: { validContextsRequired: 1, cohortValidDebatesRequired: 10,
    debate59MovesRequired: 20, cohortMovesRequired: 187,
    cohortCritiquesRequired: 187, cohortExactSourceQuotesRequired: 20,
    cohortOverallCommentarySidesRequired: 20, cohortAIExtensionSidesRequired: 20,
    retriesMaximum: 0, timeoutExtensionsMaximum: 0,
    correctionContextsMaximum: 0, modelAuthoredScoresMaximum: 0 },
  stopRules: { sourceHashMismatchBlocks: true, packetOrSchemaHashMismatchBlocks: true,
    preexistingFutureOutputBlocks: true, nonSubscriptionAuthenticationBlocks: true,
    apiKeyVisibilityBlocks: true, nonIsolatedContextBlocks: true,
    identityMoveOrScoreMutationBlocks: true, invalidOutputBlocks: true,
    timeoutBlocks: true, automaticRetryBlocks: true, timeoutExtensionBlocks: true,
    repairOrCorrectionBlocks: true, paidServiceBlocks: true,
    productionMutationBlocks: true, nextBatchSelectionBlocks: true },
  sourceHashes, futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  artifacts: { activation: futureOutputs[3], execution: futureOutputs[4],
    analysis: futureOutputs[5], cohortValidation: futureOutputs[6],
    output: context.output, validation: context.validation, provenance: context.provenance },
  authorization: { executionActivationPreparation: true, modelContext: false,
    publicationModelExecution: false, deterministicOutputValidation: false,
    deterministicCohortReplay: false, retry: false, timeoutExtension: false,
    repairPacketPreparation: false, paidServices: false,
    publicationCompilation: false, productionMutation: false, nextBatchSelection: false },
  totals: { acceptedDebates: 9, acceptedMoves: 167, resumptionContexts: 1,
    resumptionMoves: 20, cohortDebates: 10, cohortMoves: 187,
    modelContextsExecuted: 0, modelAuthoredScores: 0,
    directIncrementalCostUsd: 0 },
  nextAuthorizedAction: "activate-and-execute-exactly-one-unattempted-debate-59-publication-context" };
if (shouldWrite) { await mkdir(path.resolve(ROOT), { recursive: true });
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`); }
console.log(JSON.stringify({ status: manifest.status, debate: "59", contexts: 1,
  acceptedMoves: 167, cohortMoves: 187, existingPacketsReused: 1,
  model: manifest.model, attemptsPerContext: 1, retriesMaximum: 0,
  directIncrementalCostUsd: 0, nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));
