#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { buildV422116JudgmentPacket, makeV422116JudgmentSchema, V422116_MODEL } from "./lib/v422116-decomposed-consensus.mjs";

export const V4221172_ROOT = "docs/calibration/v4.2.21.17.2/independent-judgment-schema-recovery";
export const V4221172_PROTOCOL_ID = "v4.2.21.17.2-independent-judgment-schema-recovery";
const shouldWrite = process.argv.includes("--write");
const predecessorRoot = "docs/calibration/v4.2.21.17/independent-judgment-three";
const [failure, predecessor] = await Promise.all([`${predecessorRoot}/schema-failure-analysis.json`, `${predecessorRoot}/preparation-manifest.json`].map((file) => readFile(file, "utf8").then(JSON.parse)));
assertV4(failure.status === "pre-generation-schema-transport-failure-successor-correction-authorized" && failure.authorization.schemaTransportCorrectionDesign, "schema transport recovery unauthorized");
assertV4(failure.correction.removeUniqueItemsFromModelOutputSchema && failure.correction.retainRuntimeUniquenessValidation && failure.diagnosis.modelGenerationBegan === false, "schema recovery scope changed");
const inputs = predecessor.inputs;
const sharedInputBytes = (await Promise.all(Object.values(inputs).map((file) => readFile(file)))).reduce((sum, bytes) => sum + bytes.length, 0);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const contexts = [];
for (const source of predecessor.contexts) {
  const [lockedInventoryBytes, sourcePacketBytes, eventsBytes, ledgerBytes] = await Promise.all([source.lockedInventory, source.sourcePacket, source.originalEvents, source.fullLedger].map((file) => readFile(file)));
  assertV4(sha256(lockedInventoryBytes) === source.lockedInventorySha256 && sha256(sourcePacketBytes) === source.sourcePacketSha256 && sha256(eventsBytes) === source.originalEventsSha256 && sha256(ledgerBytes) === source.fullLedgerSha256, `${source.debateNumber}/${source.reviewerPass}: successor source hash changed`);
  const lockedInventory = JSON.parse(lockedInventoryBytes);
  const packet = buildV422116JudgmentPacket(lockedInventory, source.reviewerPass);
  assertV4(packet.lockedInventorySha256 === source.lockedInventoryCanonicalSha256, `${source.debateNumber}/${source.reviewerPass}: canonical inventory hash changed`);
  const packetBytes = Buffer.from(JSON.stringify(packet));
  const packetPath = `${V4221172_ROOT}/judgment-packets/pass-${source.reviewerPass.toLowerCase()}/debate-${source.debateNumber}.json`;
  const schema = makeV422116JudgmentSchema({ packet });
  const serializedSchema = JSON.stringify(schema);
  assertV4(!serializedSchema.includes('"uniqueItems"'), `${source.debateNumber}/${source.reviewerPass}: unsupported uniqueItems remains`);
  const schemaBytes = Buffer.from(serializedSchema);
  const schemaPath = `${V4221172_ROOT}/schemas/pass-${source.reviewerPass.toLowerCase()}/debate-${source.debateNumber}.schema.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(packetPath), { recursive: true });
    await mkdir(path.dirname(schemaPath), { recursive: true });
    await writeFile(packetPath, packetBytes);
    await writeFile(schemaPath, schemaBytes);
  }
  contexts.push({ ...source, judgmentPacket: packetPath, judgmentPacketSha256: sha256(packetBytes), schema: schemaPath, schemaSha256: sha256(schemaBytes), copiedInputBytes: sharedInputBytes + sourcePacketBytes.length + packetBytes.length + schemaBytes.length, judgmentOutput: `${V4221172_ROOT}/judgments/pass-${source.reviewerPass.toLowerCase()}/debate-${source.debateNumber}.json`, rawOutput: `${V4221172_ROOT}/raw-outputs/pass-${source.reviewerPass.toLowerCase()}/debate-${source.debateNumber}.json`, validationOutput: `${V4221172_ROOT}/validations/pass-${source.reviewerPass.toLowerCase()}/debate-${source.debateNumber}.json`, provenanceOutput: `${V4221172_ROOT}/provenance/pass-${source.reviewerPass.toLowerCase()}/debate-${source.debateNumber}.json` });
}
assertV4(contexts.length === 6 && contexts.every((context) => context.copiedInputBytes <= 115000), "corrected judgment transport ceiling failed");
const preparation = {
  schemaVersion: "4.2.21.17.2-independent-judgment-schema-recovery-preparation",
  protocolId: V4221172_PROTOCOL_ID,
  status: shouldWrite ? "six-corrected-independent-judgment-contexts-prepared-schema-preflight-required" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  model: { ...V422116_MODEL, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  inputs,
  predecessor: { root: predecessorRoot, failureAnalysis: `${predecessorRoot}/schema-failure-analysis.json`, modelGenerationBegan: false, judgmentOutputsProduced: 0 },
  correction: { uniqueItemsRemovedFromModelSchemas: true, runtimeUniquenessValidationRetained: true, semanticContractChanged: false },
  contexts,
  totals: { debates: 3, contexts: 6, maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)), modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { deterministicFixtures: true, schemaDialectPreflight: true, executionManifest: false, modelExecution: false, disagreementExtraction: false, audioVerification: false, adjudication: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(`${V4221172_ROOT}/preparation-manifest.json`, `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, contexts: contexts.map((context) => ({ debateNumber: context.debateNumber, reviewerPass: context.reviewerPass, copiedInputKilobytes: Math.round(context.copiedInputBytes / 1000), unsupportedUniqueItemsPresent: false })), maximumCopiedInputKilobytes: Math.round(preparation.totals.maximumCopiedInputBytes / 1000), modelContextsExecuted: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
