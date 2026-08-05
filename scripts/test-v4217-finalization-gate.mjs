#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { access, readFile, rm, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { validateV4217Prose, V4217_ROOT } from "./lib/v4217-finalization-gate.mjs";

const preparation = JSON.parse(await readFile(`${V4217_ROOT}/preparation-manifest.json`, "utf8"));
assertV4(preparation.status === "prepared-three-retired-no-truncation-contexts" && preparation.contexts.length === 3 && preparation.policy.correctionContexts === 0 && !preparation.policy.deterministicProseMutation, "v4.2.17 preparation invalid");
for (const context of preparation.contexts) {
  const [schema, gold] = await Promise.all([readFile(context.inputs.schema, "utf8").then(JSON.parse), readFile(context.validationGold, "utf8").then(JSON.parse)]);
  for (const side of ["pro", "con"]) {
    const quote = schema.properties.scorecard.properties.quotes.properties[side].properties.context;
    const newArgument = schema.properties.aiExtension.properties[side].properties.newArguments.items.properties.text;
    const move = schema.properties.scorecard.properties.sections.items.properties.exchanges.items.properties[side].anyOf[1].properties;
    assertV4(!("maxLength" in quote) && !("maxLength" in newArgument) && !("maxLength" in move.critique), `${context.debateNumber}: generated prose maxLength remains`);
    assertV4(move.tags.maxItems === 0 && schema.properties.scorecard.properties.overall.properties[side].properties.blunders.items.properties.tags.maxItems === 0, `${context.debateNumber}: tags not closed empty`);
  }
  assertV4(schema.properties.debateNumber.const === context.debateNumber, `${context.debateNumber}: schema identity mismatch`);
  const temp = `${V4217_ROOT}/.fixture-${context.debateNumber}.tmp.json`;
  await writeFile(temp, `${JSON.stringify(gold)}\n`);
  try { execFileSync(process.execPath, ["scripts/validate-v388-reconstruction-output.mjs", temp, context.inputs.packet], { stdio: "pipe" }); } finally { await rm(temp, { force: true }); }
  for (const future of [context.rawOutput, context.validatedOutput]) await access(future).then(() => { throw new Error(`${future} already exists`); }, () => true);
}
for (const future of [`${V4217_ROOT}/execution-manifest.json`, `${V4217_ROOT}/model-execution.json`, `${V4217_ROOT}/analysis.json`]) await access(future).then(() => { throw new Error(`${future} already exists`); }, () => true);
console.log(JSON.stringify({ status: "passed", contexts: 3, schemasWithoutProseMaxLength: 3, closedTagSides: 6, goldFixturesValidated: 3, futureOutputsAbsent: 9, correctionContexts: 0, proseMutations: 0, scoresDerived: 0 }, null, 2));
