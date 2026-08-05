#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { parseLedger } from "./lib/v429-long-context-partition.mjs";

const root = "docs/calibration/v4.2.10/integrated-long-context-primary";
const preparation = JSON.parse(await readFile(`${root}/preparation-manifest.json`, "utf8"));
assertV4(preparation.status === "prepared-one-integrated-long-context-primary" && preparation.sparseContext.allCandidateSpansIncluded, "v4.2.10 preparation invalid");
const [bundle, sparseBytes, fullBytes] = await Promise.all([readFile(preparation.inputs.candidateBundle, "utf8").then(JSON.parse), readFile(preparation.inputs.candidateContextLedger), readFile(preparation.source.fullLedger)]);
const sparse = parseLedger(sparseBytes), full = parseLedger(fullBytes);
for (const row of sparse) assertV4(JSON.stringify(row) === JSON.stringify(full[row[0]]), `sparse event ${row[0]} differs from full ledger`);
assertV4(bundle.candidateCount === 36 && new Set(bundle.candidates.map((candidate) => candidate.qualifiedCandidateId)).size === 36, "candidate bundle identity failure");
for (const future of [preparation.output, preparation.compiledOutput]) await access(future).then(() => { throw new Error(`${future} already exists`); }, () => true);
console.log(JSON.stringify({ status: "passed", candidates: bundle.candidateCount, uniqueQualifiedCandidates: 36, sparseEventsReplayedExactly: sparse.length, allCandidateSpansIncluded: true, futureOutputsAbsent: 2, scoresAuthorized: false }, null, 2));
