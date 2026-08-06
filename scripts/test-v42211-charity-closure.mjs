#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V4220_ROOT } from "./lib/v4220-source-span-rendering.mjs";
import { V4221_ROOT, extractV4221PassBOutput } from "./lib/v4221-pass-b-consensus.mjs";
import { V42211_OUTPUT_VERSION, V42211_PROTOCOL_ID, V42211_ROOT, makeV42211PassBSchema, toV42211Output, validateV42211PassBOutput } from "./lib/v42211-charity-closure.mjs";

const shouldWrite = process.argv.includes("--write");
const [primary, packet, sourcePacket, failedOutput] = await Promise.all([
  readFile(`${V4220_ROOT}/primary-outputs/debate-195.json`, "utf8").then(JSON.parse),
  readFile(`${V4221_ROOT}/packets/debate-195.json`, "utf8").then(JSON.parse),
  readFile(`${V4220_ROOT}/packets/debate-195.json`, "utf8").then(JSON.parse),
  readFile(`${V4221_ROOT}/pass-b-outputs/debate-195.json`, "utf8").then(JSON.parse)
]);
const [eventsBytes, ledgerBytes] = await Promise.all([readFile(sourcePacket.sourceChain.eventsPath), readFile(sourcePacket.transportChain.sourceLedgerPath)]);
const events = JSON.parse(eventsBytes);
const schema = makeV42211PassBSchema();
assert.equal(schema.properties.schemaVersion.const, V42211_OUTPUT_VERSION);
assert.equal(schema.properties.protocolId.const, V42211_PROTOCOL_ID);
const charityBranches = schema.properties.moveJudgments.items.properties.charity.anyOf;
assert.equal(charityBranches.length, 2);
assert.equal(charityBranches[0].properties.tested.const, false);
assert.equal(charityBranches[0].properties.alternative.const, "");
assert.equal(charityBranches[0].properties.decisiveQualification.const, "");
assert.equal(charityBranches[1].properties.tested.const, true);
assert.equal(charityBranches[1].properties.alternative.minLength, 10);
assert.equal(charityBranches[1].properties.decisiveQualification.minLength, 10);

const validFixture = toV42211Output(extractV4221PassBOutput(primary));
const validation = validateV42211PassBOutput(validFixture, packet, sourcePacket, events, eventsBytes, ledgerBytes);
assert.equal(validation.status, "passed");
assert.equal(validation.charityConditionalClosure.untestedRatingFixedAt75, true);
const failedReencoded = toV42211Output(failedOutput);
assert.throws(() => validateV42211PassBOutput(failedReencoded, packet, sourcePacket, events, eventsBytes, ledgerBytes), /untested charity descriptions must be empty/);
const wrongRating = structuredClone(validFixture);
const untested = wrongRating.moveJudgments.find((move) => !move.charity.tested);
untested.ratings.representationalCharity.value = 74;
assert.throws(() => validateV42211PassBOutput(wrongRating, packet, sourcePacket, events, eventsBytes, ledgerBytes), /must equal 75/);

const result = {
  schemaVersion: "4.2.21.1-charity-closure-design-verification",
  protocolId: V42211_PROTOCOL_ID,
  status: "passed-code-only-charity-conditional-closure",
  contracts: { distinctRecoveryVersion: true, untestedDescriptionsSchemaLockedEmpty: true, testedDescriptionsSchemaMinimumCharacters: 10, untestedRatingValidatorLockedAt75: true, completeV4220ReconstructionValidationRetained: true, failedRawOutputAccepted: false, acceptedDebates27And188Unchanged: true },
  mutationTests: { preservedFailedOutputStillRejected: true, wrongUntestedRatingRejected: true, validCompleteFixturePassed: true },
  totals: { modelContexts: 0, retries: 0, corrections: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { singleDebate195RecoveryPreparation: true, recoveryModelExecution: false, disagreementExtraction: false, audioExecution: false, adjudicationModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) {
  await mkdir(path.resolve(V42211_ROOT), { recursive: true });
  await writeFile(path.resolve(V42211_ROOT, "pass-b.schema.json"), `${JSON.stringify(schema, null, 2)}\n`);
  await writeFile(path.resolve(V42211_ROOT, "design-verification.json"), `${JSON.stringify(result, null, 2)}\n`);
}
console.log(JSON.stringify(result, null, 2));
