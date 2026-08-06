#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { makeV422116InventorySchema } from "./lib/v422116-decomposed-consensus.mjs";
import { buildV4221162InventoryCandidateTransport, validateV4221162InventoryCandidateTransport } from "./lib/v4221162-inventory-transport.mjs";

const preparation = JSON.parse(await readFile("docs/calibration/v4.2.21.16/decomposed-consensus-contract/inventory-preparation-manifest.json", "utf8"));
const results = [];
for (const context of preparation.contexts) {
  const evidence = JSON.parse(await readFile(context.candidateEvidenceBundle, "utf8"));
  const first = buildV4221162InventoryCandidateTransport(evidence);
  const second = buildV4221162InventoryCandidateTransport(evidence);
  assert.deepEqual(first, second);
  assert.equal(validateV4221162InventoryCandidateTransport(first, evidence).status, "passed");
  const fullSchema = makeV422116InventorySchema({ evidenceBundle: evidence });
  const compactSchema = makeV422116InventorySchema({ evidenceBundle: first });
  assert.deepEqual(compactSchema, fullSchema);
  const fullBytes = Buffer.byteLength(`${JSON.stringify(evidence, null, 2)}\n`);
  const compactBytes = Buffer.byteLength(`${JSON.stringify(first, null, 2)}\n`);
  assert(compactBytes < fullBytes);
  results.push({ debateNumber: context.debateNumber, candidates: first.candidateCount, fullEvidenceBytes: fullBytes, inventoryTransportBytes: compactBytes, reductionPercent: Number(((fullBytes - compactBytes) / fullBytes * 100).toFixed(1)) });
}
console.log(JSON.stringify({ status: "passed", debates: results, everyCandidateRetained: true, semanticCandidateDownselectionPerformed: false, sourceExactExcerptRetained: true, inventorySchemaUnchanged: true, modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
