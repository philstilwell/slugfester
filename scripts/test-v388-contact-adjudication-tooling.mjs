#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { V388_CONTACT_DEBATES, V388_CONTACT_ROOT } from "./lib/v388-burden-contact.mjs";

const root = process.cwd(); const shouldWrite = process.argv.includes("--write"); const reports = [];
for (const debateNumber of V388_CONTACT_DEBATES) { const packetPath = `${V388_CONTACT_ROOT}/adjudication/packets/debate-${debateNumber}.json`, schemaPath = `${V388_CONTACT_ROOT}/adjudication/schemas/debate-${debateNumber}.schema.json`, outputPath = `${V388_CONTACT_ROOT}/adjudication/dry-output-${debateNumber}.json`; const packet = JSON.parse(await readFile(path.resolve(root, packetPath), "utf8")); const output = { schemaVersion: "3.8.8-burden-contact-adjudication-output", debateNumber, debateId: packet.debateId, reviewerRole: "burden-contact-adjudicator", bundles: packet.bundles.map((bundle) => ({ bundleId: bundle.bundleId, optionId: bundle.candidates[0].optionId, evidenceText: bundle.atomicExcerpt, rationale: "This deterministic dry fixture identifies the move's expressed proposition, selects one of exactly two supplied complete tuples, applies exact contact and compatibility, and excludes the anonymous alternative without introducing a third value, any participant score, or assessment prose." })) }; if (shouldWrite) await writeFile(path.resolve(root, outputPath), `${JSON.stringify(output, null, 2)}\n`); const result = spawnSync(process.execPath, ["scripts/validate-v388-contact-adjudication.mjs", outputPath, packetPath, schemaPath], { cwd: root, encoding: "utf8" }); if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`); reports.push(JSON.parse(result.stdout)); }
const fixture = { schemaVersion: "3.8.8-burden-contact-adjudication-dry-fixture", status: "passed", reports, totals: { contexts: 3, disputedBundles: reports.reduce((sum, item) => sum + item.disputedBundles, 0), thirdValues: 0, scoreFields: 0, modelContextsExecuted: 0, meteredApiCostUsd: 0 } };
if (shouldWrite) await writeFile(path.resolve(root, `${V388_CONTACT_ROOT}/adjudication/dry-fixture.json`), `${JSON.stringify(fixture, null, 2)}\n`);
console.log(JSON.stringify(fixture, null, 2));
