#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { assertV4, canonicalJson } from "./lib/v41-lean-production.mjs";
import { validateV429Proposal } from "./lib/v429-long-context-partition.mjs";
import { deriveMoveKindFromResponseIntent } from "./lib/v4292-adaptive-partition.mjs";

const root = "docs/calibration/v4.2.9.3/partition-compiler-recovery";
const analysis = JSON.parse(await readFile(`${root}/analysis.json`, "utf8"));
assertV4(analysis.status === "partition-compiler-recovery-passed-integrated-primary-preparation-authorized" && analysis.outputs.length === 3, "v4.2.9.3 analysis invalid");
const prep = JSON.parse(await readFile("docs/calibration/v4.2.9.2/adaptive-long-context-continuation/preparation-manifest.json", "utf8"));
const [packet, eventsBytes, fullLedgerBytes] = await Promise.all([readFile(prep.source.packet, "utf8").then(JSON.parse), readFile(prep.source.originalEvents), readFile(prep.source.fullLedger)]);
for (const output of analysis.outputs) {
  const [raw, derived, chunkBytes] = await Promise.all([readFile(output.rawOutput, "utf8").then(JSON.parse), readFile(output.derivedOutput, "utf8").then(JSON.parse), readFile(output.chunk.chunkPath)]);
  const replay = deriveMoveKindFromResponseIntent(raw);
  assertV4(canonicalJson(replay.derived) === canonicalJson(derived) && canonicalJson(replay.changedCandidateIds) === canonicalJson(output.changedCandidateIds), `${output.chunk.chunkId}: derivation replay failed`);
  validateV429Proposal(derived, packet, output.chunk, JSON.parse(eventsBytes), eventsBytes, chunkBytes, fullLedgerBytes);
}
console.log(JSON.stringify({ status: "passed", derivedOutputsReplayed: 3, candidatesValidated: analysis.candidates.total, completeCoverage: analysis.sourceCoverage.complete, modelCalls: 0, scoresDerived: 0 }, null, 2));
