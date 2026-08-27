#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_14_PUBLICATION_COMPILATION_ROOT } from
  "./lib/assessment-production-post-canary-batch-14-publication-compilation.mjs";
import { POST_CANARY_BATCH_14_PUBLICATION_FINALIZATION_ORDER,
  POST_CANARY_BATCH_14_PUBLICATION_FINALIZATION_PROTOCOL_ID,
  POST_CANARY_BATCH_14_PUBLICATION_FINALIZATION_ROOT,
  buildPostCanaryBatch14PublicationFinalization,
  buildPostCanaryBatch14PublicationStagingPreviewHtml,
  validatePostCanaryBatch14PublicationFinalCandidate } from
  "./lib/assessment-production-post-canary-batch-14-publication-finalization.mjs";
import { POST_CANARY_BATCH_14_STANDING_AUTHORIZATION,
  loadAndValidatePostCanaryBatch14StandingAuthorization } from
  "./lib/assessment-production-post-canary-batch-14-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--frozen-at");
const frozenAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires ISO");
const ROOT = POST_CANARY_BATCH_14_PUBLICATION_FINALIZATION_ROOT;
const COMPILATION_ANALYSIS = `${POST_CANARY_BATCH_14_PUBLICATION_COMPILATION_ROOT}/analysis.json`;
const COMPILATION_MANIFEST = `${POST_CANARY_BATCH_14_PUBLICATION_COMPILATION_ROOT}/preparation-manifest.json`;
const COMPILATION_AUDIT = `${POST_CANARY_BATCH_14_PUBLICATION_COMPILATION_ROOT}/compilation-audit.json`;
const IDENTITY = `${POST_CANARY_BATCH_14_PUBLICATION_COMPILATION_ROOT}/production-identity-snapshot.json`;
const MANIFEST = `${ROOT}/preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const EXECUTION = `${ROOT}/execution.json`;
const ANALYSIS = `${ROOT}/analysis.json`;
const AUDIT = `${ROOT}/finalization-audit.json`;
const PREVIEW = `${ROOT}/output-bundle/previews/index.html`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const standing = await loadAndValidatePostCanaryBatch14StandingAuthorization();
if (shouldWrite) assertV4(!(await exists(MANIFEST)), `${MANIFEST} exists`);
const [analysisBytes, compilationBytes, auditBytes, identityBytes] = await Promise.all([
  readFile(path.resolve(COMPILATION_ANALYSIS)), readFile(path.resolve(COMPILATION_MANIFEST)),
  readFile(path.resolve(COMPILATION_AUDIT)), readFile(path.resolve(IDENTITY))]);
const analysis = JSON.parse(analysisBytes); const compilation = JSON.parse(compilationBytes);
const compilationAudit = JSON.parse(auditBytes); const identity = JSON.parse(identityBytes);
assertV4(analysis.status === "ten-debate-batch-14-deterministic-publication-compilation-passed" &&
  analysis.gate?.compiledRecordsPassed === 10 && analysis.gate?.moves === 190 &&
  compilationAudit.status === "passed" && compilationAudit.totals?.moves === 190 &&
  canonicalJson(compilation.explicitOrder) === canonicalJson(POST_CANARY_BATCH_14_PUBLICATION_FINALIZATION_ORDER),
"the accepted Batch 14 compilation changed");
const contexts = [];
for (const debateNumber of POST_CANARY_BATCH_14_PUBLICATION_FINALIZATION_ORDER) {
  const source = compilation.contexts.find((row) => row.debateNumber === debateNumber);
  const identityRow = identity.rows.find((row) => row.number === debateNumber);
  const [compiledBytes, outputBytes, packetBytes] = await Promise.all([
    readFile(path.resolve(source.plannedCompiledOutput)), readFile(path.resolve(source.publicationOutput)),
    readFile(path.resolve(source.publicationPacket))]);
  const compiled = JSON.parse(compiledBytes); const output = JSON.parse(outputBytes); const packet = JSON.parse(packetBytes);
  const built = buildPostCanaryBatch14PublicationFinalization({ compiled,
    compiledPath: source.plannedCompiledOutput, compiledSha256: sha256(compiledBytes),
    output, packet, identity: identityRow });
  const validation = validatePostCanaryBatch14PublicationFinalCandidate({
    candidate: built.candidate, provenance: built.provenance, compiled, output, packet, identity: identityRow });
  contexts.push({ debateNumber, debateId: source.debateId,
    compiledInput: source.plannedCompiledOutput, compiledInputSha256: sha256(compiledBytes),
    publicationOutput: source.publicationOutput, publicationOutputSha256: sha256(outputBytes),
    publicationPacket: source.publicationPacket, publicationPacketSha256: sha256(packetBytes),
    finalCandidate: `${ROOT}/output-bundle/final-candidates/debate-${debateNumber}.json`,
    provenance: `${ROOT}/output-bundle/provenance/debate-${debateNumber}.json`,
    expectedCandidateSha256: sha256(Buffer.from(`${JSON.stringify(built.candidate, null, 2)}\n`)),
    expectedProvenanceSha256: sha256(Buffer.from(`${JSON.stringify(built.provenance, null, 2)}\n`)),
    expectedScores: source.expectedOverallScores, expectedWinner: source.expectedWinner,
    expectedWinningMargin: source.expectedWinningMargin, syntheticValidation: validation });
}
assertV4(contexts.length === 10 && contexts.reduce((sum, row) => sum + row.syntheticValidation.moves, 0) === 190,
"the Batch 14 finalization cohort changed");
const previewBytes = Buffer.from(buildPostCanaryBatch14PublicationStagingPreviewHtml());
const sources = [COMPILATION_ANALYSIS, COMPILATION_MANIFEST, COMPILATION_AUDIT, IDENTITY,
  POST_CANARY_BATCH_14_STANDING_AUTHORIZATION, "src/app.js", "src/styles.css",
  "scripts/lib/assessment-production-post-canary-batch-14-publication-finalization.mjs",
  "scripts/lib/assessment-production-post-canary-batch-14-publication-compilation.mjs",
  "scripts/lib/assessment-production-post-canary-batch-14-publication.mjs",
  "scripts/lib/assessment-production-post-canary-batch-14-publication-validation.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-14-publication-finalization.mjs",
  "scripts/test-assessment-production-post-canary-batch-14-publication-finalization-preparation.mjs",
  "scripts/activate-assessment-production-post-canary-batch-14-publication-finalization.mjs",
  "scripts/run-assessment-production-post-canary-batch-14-publication-finalization.mjs",
  ...contexts.flatMap((row) => [row.compiledInput, row.publicationOutput, row.publicationPacket])];
const sourceHashes = {};
for (const file of [...new Set(sources)].sort()) sourceHashes[file] = sha256(await readFile(path.resolve(file)));
const futureOutputPathsExcludedFromSourceHashes = [ACTIVATION, EXECUTION, ANALYSIS, AUDIT, PREVIEW,
  ...contexts.flatMap((row) => [row.finalCandidate, row.provenance])];
for (const file of futureOutputPathsExcludedFromSourceHashes) assertV4(!(await exists(file)), `${file} exists`);
const manifest = { schemaVersion: "1.0-assessment-production-post-canary-batch-14-publication-finalization-preparation",
  protocolId: POST_CANARY_BATCH_14_PUBLICATION_FINALIZATION_PROTOCOL_ID,
  status: "frozen-post-canary-batch-14-publication-finalization-prepared",
  frozenAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 14, stagingOnly: true,
  userAuthorization: { standingAuthorization: POST_CANARY_BATCH_14_STANDING_AUTHORIZATION,
    standingAuthorizationSha256: standing.sha256, directIncrementalCostUsdMaximum: 0 },
  explicitOrder: POST_CANARY_BATCH_14_PUBLICATION_FINALIZATION_ORDER, contexts,
  preview: { path: PREVIEW, expectedSha256: sha256(previewBytes), html: previewBytes.toString("utf8") },
  executionPolicy: { deterministicFinalizationPassesMaximum: 1, rerunsMaximum: 0,
    modelContexts: 0, paidServiceCalls: 0, separateActivationRequired: true },
  finalizationPolicy: { onlyTransformationRemoveStagingAudit: true,
    displayFieldsChangedMaximum: 0, participantScoresChangedMaximum: 0,
    allTenCandidatesBuiltAndValidatedBeforeWrite: true, renderingVerificationPerformed: false,
    productionMutationPerformed: false },
  stopRules: { sourceHashMismatchBlocks: true, preexistingFutureOutputBlocks: true,
    partialOutputWriteProhibited: true, separateActivationRequired: true,
    rerunBlocks: true, modelExecutionBlocks: true, scoreChangeBlocks: true,
    renderingBlocks: true, productionMutationBlocks: true, nextBatchSelectionBlocks: true },
  sourceHashes, futureOutputPathsExcludedFromSourceHashes,
  artifacts: { execution: EXECUTION, analysis: ANALYSIS, audit: AUDIT, preview: PREVIEW },
  authorization: { finalizationActivation: true, finalizationExecution: false,
    renderingVerification: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "activate-one-batch-14-deterministic-publication-finalization-pass" };
if (shouldWrite) { await mkdir(path.dirname(path.resolve(MANIFEST)), { recursive: true });
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`); }
console.log(JSON.stringify({ status: manifest.status, debates: 10, moves: 190,
  deterministicFinalizationPassesMaximum: 1, rerunsMaximum: 0, modelContexts: 0,
  directIncrementalCostUsd: 0, nextAuthorizedAction: manifest.nextAuthorizedAction }, null, 2));

