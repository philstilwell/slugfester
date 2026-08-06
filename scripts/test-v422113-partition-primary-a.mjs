#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { makeV422110PrimarySchema } from "./lib/v422110-structural-partition-primary.mjs";

const root = "docs/calibration/v4.2.21.13/partition-primary-a";
const preparation = JSON.parse(await readFile(`${root}/preparation-manifest.json`, "utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assert.equal(preparation.status, "three-structural-partition-primary-a-contexts-prepared-execution-manifest-authorized");
assert.equal(preparation.contexts.length, 3);
assert.equal(preparation.source.predecessorDiscoveryOutputsAvailableToPrimary, false);
for (const context of preparation.contexts) {
  const [packetBytes, bundleBytes, sparseBytes, eventsBytes, ledgerBytes, schemaBytes] = await Promise.all([context.packet, context.candidateBundle, context.sparseContext, context.originalEvents, context.fullLedger, context.schema].map((file) => readFile(file)));
  assert.equal(sha256(packetBytes), context.packetSha256);
  assert.equal(sha256(bundleBytes), context.candidateBundleSha256);
  assert.equal(sha256(sparseBytes), context.sparseContextSha256);
  assert.equal(sha256(eventsBytes), context.originalEventsSha256);
  assert.equal(sha256(ledgerBytes), context.fullLedgerSha256);
  assert.equal(sha256(schemaBytes), context.schemaSha256);
  const packet = JSON.parse(packetBytes), bundle = JSON.parse(bundleBytes), schema = JSON.parse(schemaBytes);
  assert.deepEqual(schema, makeV422110PrimarySchema({ packet, candidateBundle: bundle }));
  const section = schema.properties.sectionJudgments;
  assert.equal(section.minItems, 4); assert.equal(section.maxItems, 6);
  assert.equal(section.items.properties.proSelections.minItems, 1); assert.equal(section.items.properties.proSelections.maxItems, 2);
  assert.equal(section.items.properties.conSelections.minItems, 1); assert.equal(section.items.properties.conSelections.maxItems, 2);
  const proIds = new Set(section.items.properties.proSelections.items.properties.qualifiedCandidateId.enum);
  const conIds = new Set(section.items.properties.conSelections.items.properties.qualifiedCandidateId.enum);
  assert.equal([...proIds].every((id) => bundle.candidates.find((candidate) => candidate.qualifiedCandidateId === id).side === "pro"), true);
  assert.equal([...conIds].every((id) => bundle.candidates.find((candidate) => candidate.qualifiedCandidateId === id).side === "con"), true);
  assert.equal([...proIds].some((id) => conIds.has(id)), false);
}
console.log(JSON.stringify({ status: "passed", debates: preparation.contexts.length, exactInputHashes: true, exactSchemaReplay: true, structuralSideCounts: true, disjointSideCandidateEnums: true, repositoryOwnedCandidateFields: true, predecessorDiscoveryOutputsAvailable: false, modelExecutionAuthorized: false, modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
