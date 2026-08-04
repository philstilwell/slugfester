#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V388_SECTION_DEBATES, V388_SECTION_ROOT, assert, validateSectionPlan } from "./lib/v388-section-weight.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const disagreements = await readJson(`${V388_SECTION_ROOT}/initial-disagreements.json`);
const maps = await readJson(`${V388_SECTION_ROOT}/adjudication-option-map.json`);
const reports = [];
for (const debateNumber of V388_SECTION_DEBATES) {
  const debate = disagreements.debates[debateNumber];
  const [planningPacket, planSchema, passA] = await Promise.all([readJson(`${V388_SECTION_ROOT}/packets/debate-${debateNumber}.json`), readJson(`${V388_SECTION_ROOT}/schemas/debate-${debateNumber}.schema.json`), readJson(debate.initialOutputs.passA)]);
  let selected = passA;
  if (!debate.semanticPlanAgreement) {
    const packet = await readJson(debate.packet);
    const map = maps.debates[debateNumber];
    const option = map.fields[0].options.find((item) => item.origin === "pass-a");
    assert(packet.disputedPlans[0].candidates.some((item) => item.optionId === option.optionId), `${debateNumber}: synthetic option absent`);
    selected = option.value;
  }
  const summary = validateSectionPlan(selected, planningPacket, planSchema);
  reports.push({ debateNumber, ...summary, wholePlanSelectionValid: true });
}
const fixture = { schemaVersion: "3.8.8-section-weight-adjudication-dry-fixture", status: "passed", modelContextsExecuted: 0, reports, semanticDisagreements: disagreements.counts.semanticDisagreements, resolvedPlans: 3, componentMixing: 0, scoreFields: 0, meteredApiCostUsd: 0 };
if (shouldWrite) { await mkdir(path.resolve(root, V388_SECTION_ROOT), { recursive: true }); await writeFile(path.resolve(root, `${V388_SECTION_ROOT}/adjudication-dry-fixture.json`), `${JSON.stringify(fixture, null, 2)}\n`); }
console.log(JSON.stringify(fixture, null, 2));
