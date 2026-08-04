#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  V389_PERFORMANCE_DEBATES,
  V389_PERFORMANCE_ROOT,
  assertV389,
  canonicalJson,
  makeV389PerformanceSchema,
  readJson
} from "./lib/v389-performance-judgment.mjs";

const root = process.cwd();
const bytes = (relativePath) => readFile(path.resolve(root, relativePath));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manifest = await readJson(`${V389_PERFORMANCE_ROOT}/preparation-manifest.json`);
const fixture = await readJson(`${V389_PERFORMANCE_ROOT}/dry-fixture.json`);
const schema = await readJson(`${V389_PERFORMANCE_ROOT}/performance-judgment-schema.json`);
const contactAnalysis = await readJson(manifest.inputs.contactAnalysisPath);

assertV389(manifest.schemaVersion === "3.8.9-performance-judgment-preparation", "preparation manifest schema mismatch");
assertV389(manifest.status === "prepared-score-blind-no-model-execution" && manifest.calibrationOnly && manifest.AIOnly && manifest.dyadicOnly, "preparation boundary mismatch");
assertV389(manifest.model.label === "5.6 Sol" && manifest.model.authentication === "ChatGPT subscription" && manifest.model.APIKeysRemoved === true, "model/authentication lock mismatch");
assertV389(contactAnalysis.passed === true && contactAnalysis.decision.performanceJudgmentPreregistrationAuthorized === true && contactAnalysis.decision.performanceJudgmentModelExecutionAuthorized === false, "parent authorization boundary mismatch");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) assertV389(sha256(await bytes(relativePath)) === digest, `${relativePath}: source hash mismatch`);
assertV389(canonicalJson(schema) === canonicalJson(makeV389PerformanceSchema()), "shared schema differs from generator");
assertV389(schema.properties.pass.enum.length === 2 && canonicalJson(schema.properties.pass.enum) === canonicalJson(["A", "B"]), "one schema must serve both passes");
assertV389(manifest.packets.length === 3 && canonicalJson(manifest.packets.map((item) => item.debateNumber)) === canonicalJson(V389_PERFORMANCE_DEBATES), "packet set mismatch");
let moves = 0;
for (const item of manifest.packets) {
  const packet = await readJson(item.path);
  assertV389(packet.debateNumber === item.debateNumber && packet.debateId === item.debateId, `${item.debateNumber}: packet identity mismatch`);
  assertV389(packet.modelInputBoundary.identicalPacketForPassAAndB === true && packet.modelInputBoundary.sharedSchemaPath === `${V389_PERFORMANCE_ROOT}/performance-judgment-schema.json`, `${item.debateNumber}: shared input contract mismatch`);
  assertV389(packet.moves.length === item.moveCount && packet.moves.every((move) => move.attributionConfidence === "high"), `${item.debateNumber}: move/audio boundary mismatch`);
  assertV389(packet.sections.reduce((sum, section) => sum + section.weight, 0) === 100, `${item.debateNumber}: section weights do not total 100`);
  assertV389(new Set(packet.moves.map((move) => move.moveId)).size === packet.moves.length, `${item.debateNumber}: duplicate move ID`);
  assertV389(packet.moves.every((move) => move.allowedResponseTargetIds.length === move.responseTargets.length), `${item.debateNumber}: response target material incomplete`);
  for (const sourceItem of [[packet.sourceChain.transcriptPath, packet.sourceChain.transcriptSha256], [packet.sourceChain.eventsPath, packet.sourceChain.eventsSha256], [packet.sourceChain.localManifestPath, packet.sourceChain.localManifestSha256]]) assertV389(sha256(await bytes(sourceItem[0])) === sourceItem[1], `${item.debateNumber}: local source hash mismatch`);
  moves += packet.moves.length;
}
assertV389(moves === 81 && manifest.totals.moves === 81 && manifest.totals.pendingAudioVerifications === 0, "prepared move totals mismatch");
assertV389(manifest.consensus.initialContexts === 6 && manifest.consensus.sharedClosedSchemaAcrossAllSixContexts === true && manifest.consensus.thirdPassDisputedFieldsOnly === true, "consensus architecture mismatch");
assertV389(manifest.consensus.responseTupleIsCompoundField === true && manifest.consensus.charityTestedMismatchAlwaysDisputed === true, "tightened response/charity policy missing");
assertV389(manifest.safeguards.duplicateBurdenAdjustmentCaptureForcesZero === true && manifest.safeguards.scoresDerivedOnlyAfterAdjudication === true, "burden exclusion or score boundary missing");
assertV389(fixture.status === "passed" && Object.values(fixture.mutationTests).every(Boolean), "dry fixture did not pass");
assertV389(fixture.totals.contexts === 6 && fixture.totals.judgments === 162 && fixture.totals.sharedSchemas === 1 && fixture.totals.calculatedTotals === 0, "dry fixture totals mismatch");
for (const key of ["initialModelExecution", "adjudicationModelExecution", "scoreDerivation", "assessmentProse", "productionMutation", "tenDebateGate", "all195Debates"]) assertV389(manifest.authorization[key] === false, `${key} must remain unauthorized`);

console.log(JSON.stringify({ status: "passed", debates: 3, moves: 81, initialContexts: 6, sharedScoringPassSchemas: 1, highConfidenceAttributions: 81, pendingAudioVerifications: 0, calculatedTotals: 0, scoreFields: 0, liveModelExecutionAuthorized: false, scoreDerivationAuthorized: false, assessmentProseAuthorized: false, meteredApiCostUsd: 0 }, null, 2));
