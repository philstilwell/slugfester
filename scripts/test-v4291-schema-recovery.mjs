#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V4291_ROOT, makeV4291ProposalSchema } from "./lib/v4291-schema-recovery.mjs";
import { validateV429ChunkLedger } from "./lib/v429-long-context-partition.mjs";

const preparation = JSON.parse(await readFile(`${V4291_ROOT}/preparation-manifest.json`, "utf8"));
assertV4(preparation.status === "prepared-two-schema-recovery-chunks" && preparation.diagnosis.structuredOutputProbeRejectedBeforeInference, "v4.2.9.1 preparation invalid");
const schema = JSON.parse(await readFile(preparation.modelInputs.schema, "utf8"));
assertV4(JSON.stringify(schema) === JSON.stringify(makeV4291ProposalSchema()), "v4.2.9.1 schema drift");
for (const property of Object.values(schema.properties)) assertV4(typeof property.type === "string", "v4.2.9.1 top-level property missing explicit type");
const fullLedgerBytes = await readFile(preparation.source.fullLedger);
for (const chunk of preparation.chunks) {
  validateV429ChunkLedger(await readFile(chunk.chunkPath), fullLedgerBytes, chunk);
  await access(chunk.rawOutput).then(() => { throw new Error(`${chunk.rawOutput} already exists`); }, () => true);
}
console.log(JSON.stringify({ status: "passed", correctedConstantTypes: 8, exactSourceSlices: 2, completeCoverage: true, priorModelOutputs: 0, futureOutputsAbsent: 2, scoresAuthorized: false }, null, 2));
