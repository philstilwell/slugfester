#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import {
  makeV422116InventorySchema,
  V422116_MODEL,
  V422116_PROTOCOL_ID,
  V422116_ROOT
} from "./lib/v422116-decomposed-consensus.mjs";

const shouldWrite = process.argv.includes("--write");
const designPath = `${V422116_ROOT}/design-manifest.json`;
const predecessorPreparationPath = "docs/calibration/v4.2.21.15/candidate-evidence-transport/preparation-manifest.json";
const manualPath = `${V422116_ROOT}/inventory-manual.md`;
const preparationPath = `${V422116_ROOT}/inventory-preparation-manifest.json`;
const [design, predecessor] = await Promise.all([designPath, predecessorPreparationPath].map((file) => readFile(file, "utf8").then(JSON.parse)));
assertV4(design.status === "decomposed-consensus-contract-frozen" && design.authorization.scoreBlindInventoryPreparation, "decomposed inventory preparation is not authorized");
assertV4(predecessor.status === "three-candidate-evidence-primary-a-contexts-prepared-execution-manifest-authorized", "candidate-evidence source preparation unavailable");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const manualBytes = await readFile(manualPath);
const contexts = [];
for (const source of predecessor.contexts) {
  const [packetBytes, evidenceBytes, eventsBytes, ledgerBytes] = await Promise.all([source.packet, source.candidateEvidenceBundle, source.originalEvents, source.fullLedger].map((file) => readFile(file)));
  assertV4(sha256(packetBytes) === source.packetSha256 && sha256(evidenceBytes) === source.candidateEvidenceBundleSha256 && sha256(eventsBytes) === source.originalEventsSha256 && sha256(ledgerBytes) === source.fullLedgerSha256, `${source.debateNumber}: inventory source hash changed`);
  const evidenceBundle = JSON.parse(evidenceBytes);
  const schema = makeV422116InventorySchema({ evidenceBundle });
  const schemaBytes = Buffer.from(`${JSON.stringify(schema, null, 2)}\n`);
  const schemaPath = `${V422116_ROOT}/inventory-schemas/debate-${source.debateNumber}.schema.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(schemaPath), { recursive: true });
    await writeFile(schemaPath, schemaBytes);
  }
  contexts.push({
    debateNumber: source.debateNumber,
    debateId: source.debateId,
    packet: source.packet,
    packetSha256: source.packetSha256,
    candidateEvidenceBundle: source.candidateEvidenceBundle,
    candidateEvidenceBundleSha256: source.candidateEvidenceBundleSha256,
    originalEvents: source.originalEvents,
    originalEventsSha256: source.originalEventsSha256,
    fullLedger: source.fullLedger,
    fullLedgerSha256: source.fullLedgerSha256,
    schema: schemaPath,
    schemaSha256: sha256(schemaBytes),
    schemaBytes: schemaBytes.length,
    packetBytes: packetBytes.length,
    candidateEvidenceBundleBytes: evidenceBytes.length,
    candidates: evidenceBundle.candidateCount,
    copiedInputBytes: manualBytes.length + packetBytes.length + evidenceBytes.length + schemaBytes.length,
    proposalOutput: `${V422116_ROOT}/inventory-proposals/debate-${source.debateNumber}.json`,
    lockedInventoryOutput: `${V422116_ROOT}/locked-inventories/debate-${source.debateNumber}.json`,
    validationOutput: `${V422116_ROOT}/inventory-validation/debate-${source.debateNumber}.json`,
    provenanceOutput: `${V422116_ROOT}/inventory-provenance/debate-${source.debateNumber}.json`
  });
}
assertV4(contexts.length === 3 && contexts.map((context) => context.debateNumber).join("|") === "133|178|182", "retired partition-three sample changed");
const preparation = {
  schemaVersion: "4.2.21.16-score-blind-inventory-preparation",
  protocolId: V422116_PROTOCOL_ID,
  status: shouldWrite ? "retired-partition-three-inventory-contexts-prepared" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  model: { ...V422116_MODEL, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  inputs: { manual: manualPath },
  sourceBoundary: {
    completeCandidateEvidenceBundle: true,
    everyCandidateRetained: true,
    originalEventsAvailableToValidatorOnly: true,
    broadSparseLedgerUnavailableToModel: true,
    originalCandidateBundleUnavailableToModel: true,
    predecessorPrimaryProposalsUnavailableToModel: true,
    ratingsAndScoresUnavailable: true,
    semanticCandidateDownselection: false
  },
  contexts,
  transport: {
    copiedInputIncludes: ["manual", "source packet", "complete candidate-evidence bundle", "inventory schema"],
    scoringRubricsDelivered: false,
    maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes))
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
    transcriptionCostUsd: 0
  },
  nextGateAcceptance: {
    validInventoriesRequired: 3,
    deterministicLockedInventoryCompilationsRequired: 3,
    attemptsPerDebate: 1,
    retries: 0,
    semanticRepairs: 0,
    ratings: 0,
    scores: 0
  },
  authorization: {
    deterministicValidation: true,
    executionManifest: true,
    modelExecution: false,
    independentJudgmentPreparation: false,
    scoreDerivation: false,
    productionMutation: false,
    all195Debates: false
  }
};
if (shouldWrite) await writeFile(preparationPath, `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, contexts: contexts.map((context) => ({ debateNumber: context.debateNumber, candidates: context.candidates, copiedInputKilobytes: Math.round(context.copiedInputBytes / 1000), schemaKilobytes: Math.round(context.schemaBytes / 1000) })), maximumCopiedInputKilobytes: Math.round(preparation.totals.maximumCopiedInputBytes / 1000), scoringRubricsDelivered: false, modelContextsExecuted: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
