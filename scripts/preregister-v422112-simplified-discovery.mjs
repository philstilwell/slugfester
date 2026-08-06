#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { makeV422112DiscoverySchema, V422112_MODEL, V422112_PROTOCOL_ID, V422112_ROOT } from "./lib/v422112-simplified-discovery.mjs";

const shouldWrite = process.argv.includes("--write");
const failurePath = "docs/calibration/v4.2.21.9/generalized-partition/discovery-failure-analysis.json";
const workflowPath = "docs/assessment-workflow-v4.2.21.12.md";
const manualPath = `${V422112_ROOT}/manual.md`;
const schemaPath = `${V422112_ROOT}/discovery-template.schema.json`;
const failure = JSON.parse(await readFile(failurePath, "utf8"));
assertV4(failure.status === "partition-discovery-gate-failed-successor-design-authorized" && failure.authorization.successorSchemaDesign && failure.successorRecommendation.removeLocalTargetIdsFromScoreBlindDiscovery, "v4.2.21.11 successor design authorization unavailable");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceFiles = [failurePath, workflowPath, manualPath, "scripts/lib/v422112-simplified-discovery.mjs", "scripts/test-v422112-simplified-discovery.mjs", "scripts/preregister-v422112-simplified-discovery.mjs"];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(file));
const manifest = { schemaVersion: "4.2.21.12-simplified-partition-discovery-design", protocolId: V422112_PROTOCOL_ID, status: shouldWrite ? "simplified-discovery-design-frozen-packet-preparation-authorized" : "preview", calibrationOnly: true, AIOnly: true, model: { ...V422112_MODEL, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 }, responseIntent: { fields: ["kind", "earlierTargetDescription"], kinds: ["constructive", "reply"], constructiveDescriptionMustBeEmpty: true, replyDescriptionMinimumCharacters: 30, candidateTargetIdsAbsent: true, moveKindRepositoryDerived: true, selectedTargetTopologyOwnedByPrimaryA: true }, retainedControls: { exactPartitionPlans: true, exactChunkReplay: true, candidateStartEventOwnership: true, lockedLookaheadExtension: true, candidatesPerChunkMaximum: 10, noRatingsOrScores: true, noSilentSemanticDeduplication: true }, predecessorBoundary: { acceptedOutputsReusedForAssessment: false, failureOutputRepaired: false, allTwelveMustRerun: true }, inputs: { predecessorFailureAnalysis: failurePath, workflow: workflowPath, manual: manualPath, discoverySchemaTemplate: schemaPath }, sourceHashes, totals: { modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, authorization: { successorPacketPreparation: true, successorExecutionManifest: false, modelExecution: false, primaryExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false } };
if (shouldWrite) { await mkdir(V422112_ROOT, { recursive: true }); await writeFile(schemaPath, `${JSON.stringify(makeV422112DiscoverySchema(), null, 2)}\n`); await writeFile(`${V422112_ROOT}/design-manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`); }
console.log(JSON.stringify({ status: manifest.status, responseIntent: manifest.responseIntent, allTwelveMustRerun: true, packetPreparationAuthorized: manifest.authorization.successorPacketPreparation, modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
