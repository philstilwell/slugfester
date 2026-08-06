#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { makeV42219DiscoverySchema, V42219_LIMITS, V42219_MODEL, V42219_PROTOCOL_ID, V42219_ROOT } from "./lib/v42219-generalized-partition.mjs";

const shouldWrite = process.argv.includes("--write");
const screeningPath = "docs/calibration/v4.2.21.8/held-out-five/sample-screening.json";
const workflowPath = "docs/assessment-workflow-v4.2.21.9.md";
const manualPath = `${V42219_ROOT}/discovery-manual.md`;
const schemaPath = `${V42219_ROOT}/discovery-template.schema.json`;
const screening = JSON.parse(await readFile(screeningPath, "utf8"));
assertV4(screening.status === "held-out-five-screened-lane-preparation-authorized" && screening.authorization.partitionLaneDesign, "v4.2.21.8 partition design authorization unavailable");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceFiles = [screeningPath, workflowPath, manualPath, "scripts/lib/v42219-generalized-partition.mjs", "scripts/test-v42219-generalized-partition.mjs", "scripts/preregister-v42219-generalized-partition.mjs"];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(file));
const manifest = {
  schemaVersion: "4.2.21.9-generalized-partition-design",
  protocolId: V42219_PROTOCOL_ID,
  status: shouldWrite ? "generalized-partition-design-frozen-packet-preparation-authorized" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  model: { ...V42219_MODEL, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  partitionPolicy: {
    ...V42219_LIMITS,
    routingInputs: ["source-ledger-events", "compact-copied-input-bytes"],
    durationUsedForRouting: false,
    adaptiveGreedyContextPacking: true,
    twoSidedBoundaryContext: true,
    everyEventOwnedExactlyOnce: true,
    candidateOwnedBySourceSpanStartEvent: true,
    candidateMayExtendIntoLockedLookahead: true,
    candidateMayStartInLookbehind: false,
    scoreBlindDiscovery: true,
    modelAuthoredMoveKind: false,
    modelAuthoredEvidenceText: false,
    repositoryDerivedMoveKind: true,
    silentCandidateDeduplication: false,
    futureLocalTargetHardFailure: true,
    crossChunkTargetRequiresDescription: true
  },
  consensusCompatibility: {
    discoveryPrecedesPrimaryPassA: true,
    passASelectsAndJudgesCandidateGroundedInventory: true,
    passBReceivesOnlyLockedPassAInventoryAndSourceEvidence: true,
    deterministicDisagreementExtraction: true,
    isolatedDisputeOnlyAdjudication: true,
    mediumConfidenceAudioVerificationBeforeAdjudication: true,
    scoresOnlyAfterAdjudication: true,
    existingPassedConsensusBackendReused: true
  },
  structuralRiskControl: {
    priorHardcodedDebateAndChunkBoundariesRetired: true,
    redundantModelAuthoredMoveKindRetired: true,
    priorLeanIntegratedSectionShapeNotAuthorized: true,
    nextRequiredDesign: "candidate-grounded Pass A schema with structurally enforced one-to-two moves per side per section"
  },
  inputs: { screening: screeningPath, workflow: workflowPath, discoveryManual: manualPath, discoverySchemaTemplate: schemaPath },
  sourceHashes,
  totals: { modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { syntheticFixtures: true, partitionLanePacketPreparation: true, discoveryExecutionManifest: false, discoveryModelExecution: false, primaryModelExecution: false, passBModelExecution: false, audioExecution: false, adjudicationModelExecution: false, scoreDerivation: false, publicationFinalization: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) {
  await mkdir(path.resolve(V42219_ROOT), { recursive: true });
  await writeFile(path.resolve(schemaPath), `${JSON.stringify(makeV42219DiscoverySchema(), null, 2)}\n`);
  await writeFile(path.resolve(`${V42219_ROOT}/design-manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: manifest.status, adaptiveLimits: V42219_LIMITS, packetPreparationAuthorized: manifest.authorization.partitionLanePacketPreparation, nextRequiredDesign: manifest.structuralRiskControl.nextRequiredDesign, modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
