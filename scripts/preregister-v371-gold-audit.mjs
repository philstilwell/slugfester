#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert, sha256 } from "./lib/v36-decision-cards.mjs";
import { V371_AUDIT_SOURCE, V371_DEBATES, V371_INITIAL_PASSES, V371_MODEL, V371_ROOT } from "./lib/v371-gold-audit.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), outputPath = `${V371_ROOT}/gate-manifest.json`;
const frozenAtIndex = process.argv.indexOf("--frozen-at"), frozenAt = frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : new Date().toISOString();
assert(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO timestamp");
const read = (file) => readFile(path.resolve(root, file), "utf8");
if (shouldWrite) {
  try { await access(path.resolve(root, outputPath)); throw new Error(`${outputPath} already exists; preregistration is immutable`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const dryPath = `${V371_ROOT}/dry-fixture.json`, dryText = await read(dryPath), dry = JSON.parse(dryText);
assert(dry.passed && dry.contextCount === 6 && dry.distinctDisputedFieldCount === 14, "dry fixture invalid");
const initialContexts = {}, outputs = { initial: {} };
for (const reviewerPass of V371_INITIAL_PASSES) {
  initialContexts[reviewerPass] = {}; outputs.initial[reviewerPass] = {};
  for (const debateNumber of V371_DEBATES) {
    const packet = `${V371_ROOT}/packets/${reviewerPass}/debate-${debateNumber}.json`, schema = `${V371_ROOT}/schemas/${reviewerPass}/debate-${debateNumber}.schema.json`;
    const packetText = await read(packet), schemaText = await read(schema), parsed = JSON.parse(packetText);
    initialContexts[reviewerPass][debateNumber] = { debateNumber, reviewerPass, packet, packetSha256: sha256(packetText), schema, schemaSha256: sha256(schemaText), output: `${V371_ROOT}/outputs/${reviewerPass}/debate-${debateNumber}.json`, decisionCount: parsed.decisions.length };
    outputs.initial[reviewerPass][debateNumber] = initialContexts[reviewerPass][debateNumber].output;
  }
}
const v37ManifestPath = "docs/calibration/v3.7/retired-semantic-card-test/gate-manifest.json", v37AnalysisPath = "docs/calibration/v3.7/retired-semantic-card-test/semantic-analysis.json";
const v37ManifestText = await read(v37ManifestPath), v37AnalysisText = await read(v37AnalysisPath), v37Analysis = JSON.parse(v37AnalysisText);
assert(!v37Analysis.passed && v37Analysis.decision.workflowCorrectionRequired, "v3.7 failure does not authorize benchmark audit");
const sealedMapPath = `${V371_ROOT}/sealed-option-map.json`, sealedMapText = await read(sealedMapPath);
const sourceFiles = [
  "docs/assessment-workflow-v3.7.1.md", "docs/reassessment-rubric-v3.7.1.md", `${V371_ROOT}/audit-manual.md`, V371_AUDIT_SOURCE, sealedMapPath,
  ...V371_INITIAL_PASSES.flatMap((reviewerPass) => V371_DEBATES.flatMap((debateNumber) => [initialContexts[reviewerPass][debateNumber].packet, initialContexts[reviewerPass][debateNumber].schema])),
  "scripts/lib/v36-decision-cards.mjs", "scripts/lib/v37-retired-semantic.mjs", "scripts/lib/v371-gold-audit.mjs", "scripts/build-v371-gold-audit-packets.mjs",
  "scripts/test-v371-gold-audit-packets.mjs", "scripts/validate-v371-audit-output.mjs", "scripts/extract-v371-audit-disagreements.mjs",
  "scripts/run-v371-gold-audit.mjs", "scripts/analyze-v371-gold-audit.mjs", "scripts/preregister-v371-gold-audit.mjs", "scripts/validate-v371-gold-audit.mjs"
];
const sourceHashes = Object.fromEntries(await Promise.all(sourceFiles.map(async (file) => [file, sha256(await read(file))])));
const manifest = {
  schemaVersion: "3.7.1-gold-blind-audit-manifest", gateId: "v3.7.1-gold-blind-benchmark-audit", status: "frozen-before-model-execution", frozenAt,
  workflowVersion: "Slugfester Gold-Blind Benchmark Audit Workflow v3.7.1", rubricVersion: "Slugfester Reassessment Rubric v3.7.1",
  calibrationOnly: true, AIOnlyAudit: true, retiredGoldProvisional: true, candidateOriginsModelBlind: true, candidatePositionsCounterbalanced: true,
  model: V371_MODEL, debateNumbers: V371_DEBATES, initialReviewerPasses: V371_INITIAL_PASSES,
  sample: { debateCount: 3, disputedFieldCount: 14, consensusAgainstRetiredGoldFields: 8, crossModelDisagreementFields: 6, allSpeakerAttributionConfidenceHigh: true },
  isolation: { twoIndependentContextsPerDebate: true, thirdContextOnlyForInitialDisagreements: true, otherPassOutputsUnavailable: true, candidateOriginMapUnavailable: true, priorRationalesUnavailable: true, independentClaim: "isolated-context judgments; not statistical independence" },
  consensusPolicy: { finalValueRequiresMatchingVotes: 2, thirdPassCannotInventCandidates: true, thirdPassValueSelectedByNeitherInitialPassRemainsUnresolved: true, scoresDerivedOnlyAfterAdjudication: true },
  executionPolicy: { initialContexts: 6, adjudicationContextsMaximum: 3, attemptsPerContext: 1, modelOutputRetriesMaximum: 0, preInferenceSchemaRejectionsMaximum: 0, sameRequestStreamRecoveriesMaximum: 0, APIKeysRemoved: true, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0, transcriptionCostUsdMaximum: 0 },
  thresholds: { initialContexts: 6, disputedFields: 14, initialAgreementMinimum: 12, finalTwoVoteConsensusRequired: 14, unresolvedFieldsMaximum: 0, scoringFieldsMaximum: 0 },
  prohibitions: { modelBatchAfterAudit: true, heldOutAccess: true, numericalParticipantScoring: true, assessmentProse: true, productionMutation: true },
  v37: { manifestPath: v37ManifestPath, manifestSha256: sha256(v37ManifestText), analysisPath: v37AnalysisPath, analysisSha256: sha256(v37AnalysisText), outcome: "failed-benchmark-audit-required" },
  auditSource: { path: V371_AUDIT_SOURCE, sha256: sha256(await read(V371_AUDIT_SOURCE)) }, sealedOptionMap: { path: sealedMapPath, sha256: sha256(sealedMapText) },
  sourceHashes, dryFixture: { path: dryPath, sha256: sha256(dryText) }, initialContexts, outputs,
  initialExecutionPath: `${V371_ROOT}/initial-model-execution.json`, initialDisagreementPath: `${V371_ROOT}/initial-disagreements.json`,
  adjudicationOptionMapPath: `${V371_ROOT}/adjudication-option-map.json`, adjudicationExecutionPath: `${V371_ROOT}/adjudication-model-execution.json`, analysisPath: `${V371_ROOT}/audit-analysis.json`
};
const outputText = `${JSON.stringify(manifest, null, 2)}\n`;
if (shouldWrite) { await mkdir(path.dirname(path.resolve(root, outputPath)), { recursive: true }); await writeFile(path.resolve(root, outputPath), outputText); }
console.log(outputText);
