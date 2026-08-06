#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { makeV422110PrimarySchema, V422110_MODEL } from "./lib/v422110-structural-partition-primary.mjs";
import { V422112_ROOT } from "./lib/v422112-simplified-discovery.mjs";

const shouldWrite = process.argv.includes("--write");
const root = "docs/calibration/v4.2.21.13/partition-primary-a";
const discoveryAnalysisPath = `${V422112_ROOT}/analysis.json`;
const discoveryPreparationPath = `${V422112_ROOT}/preparation-manifest.json`;
const manualPath = "docs/calibration/v4.2.21.10/structural-partition-primary/manual.md";
const inputs = { rubricBase: "docs/reassessment-rubric-v4.0.md", rubricDerived: "docs/reassessment-rubric-v4.0.1.md", rubricBounded: "docs/reassessment-rubric-v4.1.md", manual: manualPath };
const [analysis, discoveryPreparation] = await Promise.all([discoveryAnalysisPath, discoveryPreparationPath].map((file) => readFile(file, "utf8").then(JSON.parse)));
assertV4(analysis.status === "simplified-partition-discovery-passed-primary-a-preparation-authorized" && analysis.authorization.primaryAPacketPreparation && analysis.audit.candidateBundlesInventoryFeasible && !analysis.predecessorOutputsReused, "simplified discovery authorization unavailable");
const sharedInputBytes = (await Promise.all(Object.values(inputs).map((file) => readFile(file)))).reduce((sum, bytes) => sum + bytes.length, 0);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const contexts = [];
for (const discovered of analysis.debates) {
  const source = discoveryPreparation.contexts.find((context) => context.debateNumber === discovered.debateNumber);
  const [packetBytes, bundleBytes, sparseBytes, eventsBytes, fullLedgerBytes] = await Promise.all([source.packet, discovered.bundlePath, discovered.sparsePath, source.originalEvents, source.fullLedger].map((file) => readFile(file)));
  assertV4(sha256(bundleBytes) === discovered.bundleSha256 && sha256(sparseBytes) === discovered.sparseSha256 && sha256(eventsBytes) === source.originalEventsSha256 && sha256(fullLedgerBytes) === source.fullLedgerSha256, `${discovered.debateNumber}: frozen Primary A source hash changed`);
  const packet = JSON.parse(packetBytes), candidateBundle = JSON.parse(bundleBytes);
  const schemaPath = `${root}/schemas/debate-${discovered.debateNumber}.schema.json`;
  const schemaBytes = Buffer.from(`${JSON.stringify(makeV422110PrimarySchema({ packet, candidateBundle }), null, 2)}\n`);
  if (shouldWrite) { await mkdir(path.dirname(schemaPath), { recursive: true }); await writeFile(schemaPath, schemaBytes); }
  contexts.push({ debateNumber: discovered.debateNumber, debateId: discovered.debateId, packet: source.packet, packetSha256: sha256(packetBytes), candidateBundle: discovered.bundlePath, candidateBundleSha256: discovered.bundleSha256, sparseContext: discovered.sparsePath, sparseContextSha256: discovered.sparseSha256, originalEvents: source.originalEvents, originalEventsSha256: source.originalEventsSha256, fullLedger: source.fullLedger, fullLedgerSha256: source.fullLedgerSha256, schema: schemaPath, schemaSha256: sha256(schemaBytes), candidates: discovered.candidates, proCandidates: discovered.pro, conCandidates: discovered.con, sparseEvents: discovered.sparseEvents, copiedInputBytes: sharedInputBytes + packetBytes.length + bundleBytes.length + sparseBytes.length + schemaBytes.length, proposalOutput: `${root}/primary-proposals/debate-${discovered.debateNumber}.json`, rawOutput: `${root}/primary-outputs/debate-${discovered.debateNumber}.json`, compiledOutput: `${root}/primary-compiled/debate-${discovered.debateNumber}.json`, provenanceOutput: `${root}/provenance/debate-${discovered.debateNumber}.json` });
}
const preparation = { schemaVersion: "4.2.21.13-partition-primary-a-preparation", protocolId: "v4.2.21.13-partition-primary-a", status: shouldWrite ? "three-structural-partition-primary-a-contexts-prepared-execution-manifest-authorized" : "preview", calibrationOnly: true, AIOnly: true, model: { label: V422110_MODEL.label, slug: V422110_MODEL.slug, reasoningEffort: V422110_MODEL.primaryReasoningEffort, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 }, source: { discoveryAnalysis: discoveryAnalysisPath, discoveryPreparation: discoveryPreparationPath, predecessorDiscoveryOutputsAvailableToPrimary: false, legacyAssessmentsAvailable: false, scoresAvailable: false }, inputs, sharedInputBytes, contexts, structuralPolicy: { sectionsRange: [4, 6], movesPerSidePerSectionRange: [1, 2], totalMovesRange: [8, 24], sideSpecificCandidateEnums: true, duplicateCandidateSelectionHardFailure: true, modelAuthoredRepositoryFields: false, unchangedV4220Validator: true, futureTargetHardFailure: true, sameSideTargetHardFailure: true, automaticTargetRepair: false, repositoryOwnedEvidenceRendering: true, completeTranscriptReviewIsDistributedProcessClaim: true }, audioPolicy: { selectedMediumConfidenceMoveRequiresLaterAudioVerification: true, audioOccursBeforeAdjudicationAndScoring: true }, totals: { debates: contexts.length, candidates: contexts.reduce((sum, context) => sum + context.candidates, 0), copiedInputBytes: contexts.reduce((sum, context) => sum + context.copiedInputBytes, 0), maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)), modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, authorization: { deterministicValidation: true, executionManifest: true, modelExecution: false, passBPreparation: false, passBExecution: false, audioExecution: false, adjudicationExecution: false, scoreDerivation: false, publicationFinalization: false, productionMutation: false, all195Debates: false } };
if (shouldWrite) { await mkdir(root, { recursive: true }); await writeFile(`${root}/preparation-manifest.json`, `${JSON.stringify(preparation, null, 2)}\n`); }
console.log(JSON.stringify({ status: preparation.status, contexts: contexts.map((context) => ({ debateNumber: context.debateNumber, candidates: context.candidates, copiedInputKilobytes: Math.round(context.copiedInputBytes / 1000) })), totalCopiedInputMegabytes: Number((preparation.totals.copiedInputBytes / 1000000).toFixed(2)), maximumCopiedInputKilobytes: Math.round(preparation.totals.maximumCopiedInputBytes / 1000), modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
