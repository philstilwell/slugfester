#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { compileAndValidateV4212, V4212_ROOT } from "./lib/v4212-lean-integrated-primary.mjs";

const preparation = JSON.parse(await readFile(`${V4212_ROOT}/preparation-manifest.json`, "utf8"));
assertV4(preparation.status === "prepared-one-lean-integrated-primary" && preparation.sparseContext.allCandidateSpansIncluded && preparation.totals.inputReductionFraction > 0, "v4.2.12 preparation invalid");
const [gold, bundle, packet, eventsBytes, ledgerBytes] = await Promise.all([readFile(preparation.validationInputs.goldFixture, "utf8").then(JSON.parse), readFile(preparation.inputs.candidateBundle, "utf8").then(JSON.parse), readFile(preparation.inputs.packet, "utf8").then(JSON.parse), readFile(preparation.source.originalEvents), readFile(preparation.source.fullLedger)]);
const replay = compileAndValidateV4212(gold, bundle, packet, JSON.parse(eventsBytes), eventsBytes, ledgerBytes);
assertV4(replay.output.moves.length === 16 && replay.provenance.every((item) => item.immutableCandidateFieldsPreserved), "v4.2.12 gold replay failed");
for (const future of Object.values(preparation.outputs)) await access(future).then(() => { throw new Error(`${future} already exists`); }, () => true);
console.log(JSON.stringify({ status: "passed", selectedMoves: replay.output.moves.length, sparseEvents: preparation.sparseContext.deliveredEvents, inputBytes: preparation.totals.copiedInputBytes, inputReductionFraction: preparation.totals.inputReductionFraction, immutableCandidateFieldsRepositoryOwned: true, futureOutputsAbsent: 3, scoresAuthorized: false }, null, 2));
