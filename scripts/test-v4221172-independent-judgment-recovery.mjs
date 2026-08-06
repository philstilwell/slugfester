#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const ROOT = "docs/calibration/v4.2.21.17.2/independent-judgment-schema-recovery";
const preparation = JSON.parse(await readFile(`${ROOT}/preparation-manifest.json`, "utf8"));
assert.equal(preparation.status, "six-corrected-independent-judgment-contexts-prepared-schema-preflight-required");
assert.equal(preparation.contexts.length, 6);
assert.equal(preparation.correction.uniqueItemsRemovedFromModelSchemas, true);
assert.equal(preparation.correction.runtimeUniquenessValidationRetained, true);
for (const context of preparation.contexts) {
  const schemaText = await readFile(context.schema, "utf8");
  const schema = JSON.parse(schemaText);
  assert.equal(schemaText.includes('"uniqueItems"'), false);
  assert(schema.$defs && schema.$defs.withinRating && schema.$defs.charityAssessment.anyOf.length === 2);
  assert.deepEqual(Object.keys(schema.properties.moveJudgments.properties), schema.properties.moveJudgments.required);
  for (const future of [context.judgmentOutput, context.rawOutput, context.validationOutput, context.provenanceOutput]) assert.equal(await access(future).then(() => true, () => false), false, `future successor output exists: ${future}`);
}
console.log(JSON.stringify({ status: "passed", contexts: 6, unsupportedUniqueItemsPresent: false, runtimeUniquenessValidationRetained: true, sharedDefsAndRefsRetained: true, charityAnyOfRetained: true, exactMovePropertyCoverageRetained: true, futureOutputsAbsent: true, modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
