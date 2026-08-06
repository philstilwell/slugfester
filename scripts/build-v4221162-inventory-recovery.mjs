#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { makeV422116InventorySchema, V422116_MODEL, V422116_ROOT } from "./lib/v422116-decomposed-consensus.mjs";
import { buildV4221162InventoryCandidateTransport, V4221162_PROTOCOL_ID, validateV4221162InventoryCandidateTransport } from "./lib/v4221162-inventory-transport.mjs";

const shouldWrite = process.argv.includes("--write");
const priorPreparationPath = `${V422116_ROOT}/inventory-preparation-manifest.json`;
const priorAnalysisPath = `${V422116_ROOT}/inventory-gate-analysis.json`;
const recoveryPath = `${V422116_ROOT}/inventory-recovery-preparation.json`;
const manualPath = `${V422116_ROOT}/inventory-manual.md`;
const [priorPreparation, priorAnalysis, manualBytes] = await Promise.all([readFile(priorPreparationPath, "utf8").then(JSON.parse), readFile(priorAnalysisPath, "utf8").then(JSON.parse), readFile(manualPath)]);
assertV4(priorAnalysis.status === "retired-partition-three-inventory-gate-failed-analysis-only" && priorAnalysis.authorization.inventoryTransportRecoveryDesign, "inventory recovery design unauthorized");
assertV4(priorAnalysis.recoveryRecommendation.executeDebates.join("|") === "182" && priorAnalysis.recoveryRecommendation.reuseAcceptedLockedInventories.join("|") === "133|178", "inventory recovery scope changed");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const accepted = [];
for (const debateNumber of ["133", "178"]) {
  const context = priorPreparation.contexts.find((item) => item.debateNumber === debateNumber);
  const files = { proposal: context.proposalOutput, lockedInventory: context.lockedInventoryOutput, validation: context.validationOutput, provenance: context.provenanceOutput };
  accepted.push({ debateNumber, debateId: context.debateId, files, hashes: Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, file]) => [key, sha256(await readFile(file))]))) });
}
const source = priorPreparation.contexts.find((item) => item.debateNumber === "182");
const [fullEvidenceBytes, packetBytes, eventsBytes, ledgerBytes] = await Promise.all([source.candidateEvidenceBundle, source.packet, source.originalEvents, source.fullLedger].map((file) => readFile(file)));
assertV4(sha256(fullEvidenceBytes) === source.candidateEvidenceBundleSha256 && sha256(packetBytes) === source.packetSha256 && sha256(eventsBytes) === source.originalEventsSha256 && sha256(ledgerBytes) === source.fullLedgerSha256, "Debate 182 recovery source hash changed");
const fullEvidence = JSON.parse(fullEvidenceBytes);
const projected = buildV4221162InventoryCandidateTransport(fullEvidence);
validateV4221162InventoryCandidateTransport(projected, fullEvidence);
const projectedBytes = Buffer.from(`${JSON.stringify(projected, null, 2)}\n`);
const projectedPath = `${V422116_ROOT}/inventory-candidate-transport/debate-182.json`;
const schema = makeV422116InventorySchema({ evidenceBundle: projected });
const schemaBytes = Buffer.from(`${JSON.stringify(schema, null, 2)}\n`);
const schemaPath = `${V422116_ROOT}/inventory-recovery-schemas/debate-182.schema.json`;
if (shouldWrite) {
  await mkdir(path.dirname(projectedPath), { recursive: true });
  await mkdir(path.dirname(schemaPath), { recursive: true });
  await writeFile(projectedPath, projectedBytes);
  await writeFile(schemaPath, schemaBytes);
}
const context = {
  debateNumber: "182",
  debateId: source.debateId,
  packet: source.packet,
  packetSha256: source.packetSha256,
  modelCandidateTransport: projectedPath,
  modelCandidateTransportSha256: sha256(projectedBytes),
  validatorCandidateEvidenceBundle: source.candidateEvidenceBundle,
  validatorCandidateEvidenceBundleSha256: source.candidateEvidenceBundleSha256,
  originalEvents: source.originalEvents,
  originalEventsSha256: source.originalEventsSha256,
  fullLedger: source.fullLedger,
  fullLedgerSha256: source.fullLedgerSha256,
  schema: schemaPath,
  schemaSha256: sha256(schemaBytes),
  candidates: projected.candidateCount,
  copiedInputBytes: manualBytes.length + packetBytes.length + projectedBytes.length + schemaBytes.length,
  proposalOutput: `${V422116_ROOT}/inventory-recovery-proposals/debate-182.json`,
  lockedInventoryOutput: `${V422116_ROOT}/locked-inventories/debate-182.json`,
  validationOutput: `${V422116_ROOT}/inventory-validation/debate-182.json`,
  provenanceOutput: `${V422116_ROOT}/inventory-provenance/debate-182.json`
};
const preparation = {
  schemaVersion: "4.2.21.16.2-inventory-transport-recovery-preparation",
  protocolId: V4221162_PROTOCOL_ID,
  status: shouldWrite ? "debate-182-inventory-transport-recovery-prepared" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  model: { ...V422116_MODEL, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  inputs: { manual: manualPath },
  acceptedLockedInventoriesReused: accepted,
  context,
  transport: { everyCandidateRetained: true, semanticCandidateDownselectionPerformed: false, fullEvidenceBytes: fullEvidenceBytes.length, modelCandidateTransportBytes: projectedBytes.length, reductionPercent: Number(((fullEvidenceBytes.length - projectedBytes.length) / fullEvidenceBytes.length * 100).toFixed(1)), priorCopiedInputBytes: source.copiedInputBytes, recoveryCopiedInputBytes: context.copiedInputBytes },
  totals: { modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { executionManifest: true, modelExecution: false, retry: false, independentJudgmentPreparation: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(recoveryPath, `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, debateNumber: context.debateNumber, candidates: context.candidates, fullEvidenceKilobytes: Math.round(fullEvidenceBytes.length / 1000), modelTransportKilobytes: Math.round(projectedBytes.length / 1000), copiedInputKilobytes: Math.round(context.copiedInputBytes / 1000), reductionPercent: preparation.transport.reductionPercent, acceptedLockedInventoriesReused: accepted.map((item) => item.debateNumber), modelContextsExecuted: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
