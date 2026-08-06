#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { buildV422115EvidenceBundle, validateV422115EvidenceBundle } from "./lib/v422115-candidate-evidence-transport.mjs";
import { makeV422116InventorySchema, V422116_MODEL } from "./lib/v422116-decomposed-consensus.mjs";
import { buildV4221162InventoryCandidateTransport, validateV4221162InventoryCandidateTransport } from "./lib/v4221162-inventory-transport.mjs";

const RECOVERY = "docs/calibration/v4.2.21.17.23/mechanical-discovery-recovery/recovery-analysis.json";
const SOURCE_PREPARATION = "docs/calibration/v4.2.21.17.19/hard-route-held-out-source-preparation/preparation-manifest.json";
const ROOT = "docs/calibration/v4.2.21.17.24/hard-route-score-blind-inventory";
const MANUAL = "docs/calibration/v4.2.21.16/decomposed-consensus-contract/inventory-manual.md";
const PREPARATION = `${ROOT}/preparation-manifest.json`;
const shouldWrite = process.argv.includes("--write");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const recoveryBytes = await readFile(RECOVERY);
const sourcePreparationBytes = await readFile(SOURCE_PREPARATION);
const recovery = JSON.parse(recoveryBytes);
const sourcePreparation = JSON.parse(sourcePreparationBytes);
const manualBytes = await readFile(MANUAL);
assertV4(recovery.status === "hard-route-discovery-mechanically-recovered-independent-judgment-packet-preparation-authorized" && recovery.authorization.independentJudgmentPacketPreparation, "discovery recovery does not authorize inventory preparation");
assertV4(recovery.totals.debates === 5 && recovery.audit.recoveryValid === 20 && recovery.audit.orderingCanonicalizations === 1, "recovered discovery coverage drifted");

const contexts = [];
for (const recovered of recovery.debates) {
  const source = sourcePreparation.contexts.find((item) => item.debateNumber === recovered.debateNumber);
  assertV4(source, `${recovered.debateNumber}: source preparation missing`);
  const [candidateBundleBytes, packetBytes, eventsBytes, ledgerBytes] = await Promise.all([
    readFile(recovered.bundlePath),
    readFile(source.packet),
    readFile(source.originalEvents),
    readFile(source.fullLedger),
  ]);
  assertV4(sha256(candidateBundleBytes) === recovered.bundleSha256, `${recovered.debateNumber}: recovered bundle hash drifted`);
  const candidateBundle = JSON.parse(candidateBundleBytes);
  const eventsDocument = JSON.parse(eventsBytes);
  const fullEvidence = buildV422115EvidenceBundle(candidateBundle, eventsDocument);
  validateV422115EvidenceBundle(fullEvidence, candidateBundle, eventsDocument);
  const fullEvidenceBytes = Buffer.from(`${JSON.stringify(fullEvidence, null, 2)}\n`);
  const fullEvidencePath = `${ROOT}/candidate-evidence/debate-${recovered.debateNumber}.json`;
  const modelTransport = buildV4221162InventoryCandidateTransport(fullEvidence);
  validateV4221162InventoryCandidateTransport(modelTransport, fullEvidence);
  const modelTransportBytes = Buffer.from(`${JSON.stringify(modelTransport, null, 2)}\n`);
  const modelTransportPath = `${ROOT}/candidate-transport/debate-${recovered.debateNumber}.json`;
  const schema = makeV422116InventorySchema({ evidenceBundle: modelTransport });
  const schemaBytes = Buffer.from(`${JSON.stringify(schema, null, 2)}\n`);
  const schemaPath = `${ROOT}/schemas/debate-${recovered.debateNumber}.schema.json`;
  if (shouldWrite) {
    for (const output of [fullEvidencePath, modelTransportPath, schemaPath]) await mkdir(path.dirname(output), { recursive: true });
    await writeFile(fullEvidencePath, fullEvidenceBytes);
    await writeFile(modelTransportPath, modelTransportBytes);
    await writeFile(schemaPath, schemaBytes);
  }
  contexts.push({
    debateNumber: recovered.debateNumber,
    debateId: recovered.debateId,
    packet: source.packet,
    packetSha256: sha256(packetBytes),
    validatorCandidateEvidenceBundle: fullEvidencePath,
    validatorCandidateEvidenceBundleSha256: sha256(fullEvidenceBytes),
    modelCandidateTransport: modelTransportPath,
    modelCandidateTransportSha256: sha256(modelTransportBytes),
    originalEvents: source.originalEvents,
    originalEventsSha256: sha256(eventsBytes),
    fullLedger: source.fullLedger,
    fullLedgerSha256: sha256(ledgerBytes),
    schema: schemaPath,
    schemaSha256: sha256(schemaBytes),
    candidates: modelTransport.candidateCount,
    fullEvidenceBytes: fullEvidenceBytes.length,
    modelTransportBytes: modelTransportBytes.length,
    schemaBytes: schemaBytes.length,
    copiedInputBytes: manualBytes.length + packetBytes.length + modelTransportBytes.length + schemaBytes.length,
    proposalOutput: `${ROOT}/inventory-proposals/debate-${recovered.debateNumber}.json`,
    lockedInventoryOutput: `${ROOT}/locked-inventories/debate-${recovered.debateNumber}.json`,
    validationOutput: `${ROOT}/validations/debate-${recovered.debateNumber}.json`,
    provenanceOutput: `${ROOT}/provenance/debate-${recovered.debateNumber}.json`,
  });
}
assertV4(contexts.length === 5 && contexts.every((context) => context.copiedInputBytes <= 115000), "inventory context exceeds the proven 115 KB transport ceiling");

const preparation = {
  schemaVersion: "4.2.21.17.24-hard-route-score-blind-inventory-preparation",
  protocolId: "v4.2.21.17.24-hard-route-score-blind-inventory",
  status: shouldWrite ? "five-hard-route-score-blind-inventory-contexts-prepared" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  model: { ...V422116_MODEL, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  inputs: {
    recovery: RECOVERY,
    recoverySha256: sha256(recoveryBytes),
    sourcePreparation: SOURCE_PREPARATION,
    sourcePreparationSha256: sha256(sourcePreparationBytes),
    manual: MANUAL,
    manualSha256: sha256(manualBytes),
  },
  contexts,
  isolation: {
    oneDebatePerContext: true,
    scoreBlindCurator: true,
    allDiscoveredCandidatesAvailable: true,
    scoringRubricsUnavailable: true,
    performanceJudgmentsUnavailable: true,
    ratingsScoresWinnersAndPublicationProseUnavailable: true,
  },
  transport: {
    everyCandidateRetained: true,
    semanticCandidateDownselectionPerformed: false,
    sourceExactExcerptRetained: true,
    validatorOwnedFieldsRestoredFromFullEvidenceBundle: true,
    maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)),
    provenCeilingBytes: 115000,
  },
  deterministicCompilation: {
    chronologyRepositoryOwned: true,
    sourceEvidenceRepositoryRerendered: true,
    replyRequiresEarlierSelectedOpponent: true,
    responseTopologyAbsent: true,
    ratingsAbsent: true,
    semanticRepair: false,
  },
  totals: {
    debates: contexts.length,
    candidates: contexts.reduce((sum, context) => sum + context.candidates, 0),
    copiedInputBytes: contexts.reduce((sum, context) => sum + context.copiedInputBytes, 0),
    maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)),
    modelContextsExecuted: 0,
    audioCalls: 0,
    scoresDerived: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
  },
  authorization: {
    executionManifest: true,
    modelExecution: false,
    independentJudgmentPacketPreparation: false,
    independentJudgmentModelExecution: false,
    scoreDerivation: false,
    productionMutation: false,
    all195Debates: false,
  },
};
if (shouldWrite) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(PREPARATION, `${JSON.stringify(preparation, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: preparation.status,
  contexts: contexts.map((context) => ({
    debateNumber: context.debateNumber,
    candidates: context.candidates,
    fullEvidenceKilobytes: Math.round(context.fullEvidenceBytes / 1000),
    modelTransportKilobytes: Math.round(context.modelTransportBytes / 1000),
    copiedInputKilobytes: Math.round(context.copiedInputBytes / 1000),
  })),
  maximumCopiedInputKilobytes: Math.round(preparation.totals.maximumCopiedInputBytes / 1000),
  modelContextsExecuted: 0,
  scoresDerived: 0,
}, null, 2));
