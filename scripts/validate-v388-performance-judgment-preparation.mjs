#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  V388_PERFORMANCE_DEBATES,
  V388_PERFORMANCE_ROOT,
  assertV388,
  canonicalJson,
  makeV388PerformanceSchema,
  readJson
} from "./lib/v388-performance-judgment.mjs";

const root = process.cwd();
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = await readJson(`${V388_PERFORMANCE_ROOT}/preparation-manifest.json`);
const fixture = await readJson(`${V388_PERFORMANCE_ROOT}/dry-fixture.json`);
const schema = await readJson(`${V388_PERFORMANCE_ROOT}/performance-judgment-schema.json`);
const contactAnalysis = await readJson(manifest.inputs.contactAnalysisPath);

assertV388(manifest.schemaVersion === "3.8.8-performance-judgment-preparation", "preparation manifest schema mismatch");
assertV388(manifest.status === "prepared-score-blind-no-model-execution" && manifest.calibrationOnly && manifest.AIOnly && manifest.dyadicOnly, "preparation boundary mismatch");
assertV388(manifest.model.label === "5.6 Sol" && manifest.model.authentication === "ChatGPT subscription" && manifest.model.APIKeysRemoved === true, "model/authentication lock mismatch");
assertV388(contactAnalysis.passed === true && contactAnalysis.decision.performanceJudgmentPreregistrationAuthorized === true && contactAnalysis.decision.performanceJudgmentModelExecutionAuthorized === false, "parent authorization boundary mismatch");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) assertV388(sha256(await bytes(relativePath)) === digest, `${relativePath}: source hash mismatch`);
assertV388(canonicalJson(schema) === canonicalJson(makeV388PerformanceSchema()), "shared schema differs from generator");
assertV388(schema.properties.pass.enum.length === 2 && canonicalJson(schema.properties.pass.enum) === canonicalJson(["A", "B"]), "one schema must serve both passes");
assertV388(manifest.packets.length === 3 && canonicalJson(manifest.packets.map((item) => item.debateNumber)) === canonicalJson(V388_PERFORMANCE_DEBATES), "packet set mismatch");
let moves = 0;
for (const item of manifest.packets) {
  const packet = await readJson(item.path);
  assertV388(packet.debateNumber === item.debateNumber && packet.debateId === item.debateId, `${item.debateNumber}: packet identity mismatch`);
  assertV388(packet.modelInputBoundary.identicalPacketForPassAAndB === true && packet.modelInputBoundary.sharedSchemaPath === `${V388_PERFORMANCE_ROOT}/performance-judgment-schema.json`, `${item.debateNumber}: shared input contract mismatch`);
  assertV388(packet.moves.length === item.moveCount && packet.moves.every((move) => move.attributionConfidence === "high"), `${item.debateNumber}: move/audio boundary mismatch`);
  assertV388(packet.sections.reduce((sum, section) => sum + section.weight, 0) === 100, `${item.debateNumber}: section weights do not total 100`);
  assertV388(new Set(packet.moves.map((move) => move.moveId)).size === packet.moves.length, `${item.debateNumber}: duplicate move ID`);
  assertV388(packet.moves.every((move) => move.allowedResponseTargetIds.length === move.responseTargets.length), `${item.debateNumber}: response target material incomplete`);
  for (const sourceItem of [[packet.sourceChain.transcriptPath, packet.sourceChain.transcriptSha256], [packet.sourceChain.eventsPath, packet.sourceChain.eventsSha256], [packet.sourceChain.localManifestPath, packet.sourceChain.localManifestSha256]]) assertV388(sha256(await bytes(sourceItem[0])) === sourceItem[1], `${item.debateNumber}: local source hash mismatch`);
  moves += packet.moves.length;
}
assertV388(moves === 81 && manifest.totals.moves === 81 && manifest.totals.pendingAudioVerifications === 0, "prepared move totals mismatch");
assertV388(manifest.consensus.initialContexts === 6 && manifest.consensus.sharedClosedSchemaAcrossAllSixContexts === true && manifest.consensus.thirdPassDisputedFieldsOnly === true, "consensus architecture mismatch");
assertV388(manifest.consensus.responseTupleIsCompoundField === true && manifest.consensus.charityTestedMismatchAlwaysDisputed === true, "tightened response/charity policy missing");
assertV388(manifest.safeguards.duplicateBurdenAdjustmentCaptureForcesZero === true && manifest.safeguards.scoresDerivedOnlyAfterAdjudication === true, "burden exclusion or score boundary missing");
assertV388(fixture.status === "passed" && Object.values(fixture.mutationTests).every(Boolean), "dry fixture did not pass");
assertV388(fixture.totals.contexts === 6 && fixture.totals.judgments === 162 && fixture.totals.sharedSchemas === 1 && fixture.totals.calculatedTotals === 0, "dry fixture totals mismatch");
for (const key of ["initialModelExecution", "adjudicationModelExecution", "scoreDerivation", "assessmentProse", "productionMutation", "tenDebateGate", "all195Debates"]) assertV388(manifest.authorization[key] === false, `${key} must remain unauthorized`);

console.log(JSON.stringify({ status: "passed", debates: 3, moves: 81, initialContexts: 6, sharedScoringPassSchemas: 1, highConfidenceAttributions: 81, pendingAudioVerifications: 0, calculatedTotals: 0, scoreFields: 0, liveModelExecutionAuthorized: false, scoreDerivationAuthorized: false, assessmentProseAuthorized: false, meteredApiCostUsd: 0 }, null, 2));
