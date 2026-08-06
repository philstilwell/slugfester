#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { makeV422114PrimarySchema, V422114_ROOT } from "./lib/v422114-narrow-primary-successor.mjs";

const preparation = JSON.parse(await readFile(`${V422114_ROOT}/preparation-manifest.json`, "utf8")), sha256 = (value) => createHash("sha256").update(value).digest("hex");
assert.equal(preparation.status, "three-narrow-primary-successor-contexts-prepared-execution-manifest-authorized"); assert.equal(preparation.contexts.length, 3); assert.equal(preparation.sourceBoundary.predecessorModelOutputsAvailableToJudges, false);
for (const context of preparation.contexts) {
  const [packetBytes, bundleBytes, sparseBytes, eventsBytes, ledgerBytes, schemaBytes] = await Promise.all([context.packet, context.candidateBundle, context.sparseContext, context.originalEvents, context.fullLedger, context.schema].map((file) => readFile(file)));
  assert.equal(sha256(packetBytes), context.packetSha256); assert.equal(sha256(bundleBytes), context.candidateBundleSha256); assert.equal(sha256(sparseBytes), context.sparseContextSha256); assert.equal(sha256(eventsBytes), context.originalEventsSha256); assert.equal(sha256(ledgerBytes), context.fullLedgerSha256); assert.equal(sha256(schemaBytes), context.schemaSha256);
  const schema = JSON.parse(schemaBytes); assert.deepEqual(schema, makeV422114PrimarySchema({ packet: JSON.parse(packetBytes), candidateBundle: JSON.parse(bundleBytes) }));
  for (const key of ["proSelections", "conSelections"]) { const move = schema.properties.sectionJudgments.items.properties[key].items; assert.ok(move.required.includes("moveKind")); assert.equal(Object.hasOwn(move.properties.response.properties, "diagnosticConsequenceExplicit"), false); assert.equal(Object.hasOwn(move.properties.response.properties, "replacementDemandAnswered"), false); assert.deepEqual(move.properties.response.properties.specialResponseMode.enum, ["none", "diagnostic-defeat", "justified-reframe"]); }
}
console.log(JSON.stringify({ status: "passed", debates: 3, exactInputHashes: true, exactSchemaReplay: true, outerStructuralContractRetained: true, primaryAAuthorsMoveKind: true, conflictingResponseFlagsStructurallyImpossible: true, predecessorOutputsAvailableToJudges: false, modelExecutionAuthorized: false, modelContextsExecuted: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
