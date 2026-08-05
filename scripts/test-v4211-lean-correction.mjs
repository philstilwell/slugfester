#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { applyAndValidateV4211, buildV4211LeanCandidate, makeV4211Schema, V4211_ROOT } from "./lib/v4211-lean-correction.mjs";
const preparation = JSON.parse(await readFile(`${V4211_ROOT}/preparation-manifest.json`, "utf8")); assertV4(preparation.status === "prepared-one-lean-structural-correction" && preparation.totals.inputReductionFraction > 0.8, "v4.2.11 preparation invalid");
const [original, packet, eventsBytes, ledgerBytes, lean, schema, fixture] = await Promise.all([readFile(preparation.validationInputs.original, "utf8").then(JSON.parse), readFile(preparation.validationInputs.packet, "utf8").then(JSON.parse), readFile(preparation.validationInputs.originalEvents), readFile(preparation.validationInputs.sourceLedger), readFile(preparation.inputs.leanCandidate, "utf8").then(JSON.parse), readFile(preparation.inputs.schema, "utf8").then(JSON.parse), readFile(preparation.validationInputs.goldFixture, "utf8").then(JSON.parse)]);
assertV4(JSON.stringify(lean) === JSON.stringify(buildV4211LeanCandidate(original)) && JSON.stringify(schema) === JSON.stringify(makeV4211Schema()), "v4.2.11 derived input drift"); applyAndValidateV4211(fixture, original, packet, JSON.parse(eventsBytes), eventsBytes, ledgerBytes);
for (const future of Object.values(preparation.outputs)) await access(future).then(() => { throw new Error(`${future} already exists`); }, () => true);
console.log(JSON.stringify({ status: "passed", moves: lean.moves.length, goldFixtureValidated: true, mutableOutputFields: ["sections", "placements"], inputReductionFraction: preparation.totals.inputReductionFraction, futureOutputsAbsent: 3, scoresAuthorized: false }, null, 2));
