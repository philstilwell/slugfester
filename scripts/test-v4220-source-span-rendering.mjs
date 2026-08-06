#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "./lib/v4-lean-production.mjs";
import { V4219_ROOT } from "./lib/v4219-primary-recovery.mjs";
import { V4220_COMPILED_VERSION, V4220_OUTPUT_VERSION, V4220_PACKET_VERSION, V4220_PROTOCOL_ID, V4220_ROOT, canonicalizeV4220PrimaryOutput, compileV4220PrimaryOutput, makeV4220PrimarySchema, renderV4220EvidenceWindow, validateV4220PrimaryOutput } from "./lib/v4220-source-span-rendering.mjs";

const shouldWrite = process.argv.includes("--write");
async function loadFixture(debateNumber) {
  const [oldOutput, oldPacket] = await Promise.all([readFile(`${V4219_ROOT}/primary-outputs/debate-${debateNumber}.json`, "utf8").then(JSON.parse), readFile(`${V4219_ROOT}/packets/debate-${debateNumber}.json`, "utf8").then(JSON.parse)]);
  const packet = { ...oldPacket, schemaVersion: V4220_PACKET_VERSION, protocolId: V4220_PROTOCOL_ID };
  delete packet.modelInputBoundary.exactEvidenceCueRequired;
  delete packet.modelInputBoundary.evidenceCueTokenRange;
  delete packet.modelInputBoundary.evidenceCueMaximumCharacters;
  packet.modelInputBoundary.modelSelectsInclusiveEventSpanOnly = true;
  packet.modelInputBoundary.repositoryOwnedLexicalSalienceRendering = true;
  packet.modelInputBoundary.renderingAnchorFields = ["proposition", "evidenceBasis", "response.rationale"];
  const output = { ...structuredClone(oldOutput), schemaVersion: V4220_OUTPUT_VERSION, protocolId: V4220_PROTOCOL_ID, moves: oldOutput.moves.map((move) => ({ ...structuredClone(move), sourceSpan: { startEvent: move.sourceSpan.startEvent, endEvent: move.sourceSpan.endEvent } })) };
  const [eventsBytes, ledgerBytes] = await Promise.all([readFile(packet.sourceChain.eventsPath), readFile(packet.transportChain.sourceLedgerPath)]);
  return { packet, output, events: JSON.parse(eventsBytes), eventsBytes, ledgerBytes };
}

const schema = makeV4220PrimarySchema();
const sourceSpanSchema = schema.properties.moves.items.properties.sourceSpan;
assert.deepEqual(sourceSpanSchema.required, ["startEvent", "endEvent"]);
assert.equal(sourceSpanSchema.properties.evidenceCue, undefined);
assert.equal(sourceSpanSchema.properties.excerpt, undefined);
assert.equal(schema.properties.moves.items.properties.response.properties.class, undefined);
assert.equal(schema.properties.moves.items.properties.ratings.properties.responsiveness, undefined);

const debate110 = await loadFixture("110");
const validation110 = validateV4220PrimaryOutput(debate110.output, debate110.packet, debate110.events, debate110.eventsBytes, debate110.ledgerBytes);
assert.equal(validation110.status, "passed");
assert.equal(validation110.deterministicRecovery.modelAuthoredEvidenceText, false);
assert(validation110.deterministicRecovery.renderedEvidence.every((item) => item.sourceExact && item.wholeWordBoundaries && item.tokenCount >= 12 && item.tokenCount <= 90 && item.characterCount <= 450));
const compiled110 = compileV4220PrimaryOutput(debate110.output, debate110.packet, debate110.events);
assert.equal(compiled110.schemaVersion, V4220_COMPILED_VERSION);
assert.equal(canonicalJson(compiled110), canonicalJson(compileV4220PrimaryOutput(debate110.output, debate110.packet, debate110.events)));

const debate194 = await loadFixture("194");
const validation194 = validateV4220PrimaryOutput(debate194.output, debate194.packet, debate194.events, debate194.eventsBytes, debate194.ledgerBytes);
assert.equal(validation194.status, "passed");
assert(validation194.deterministicRecovery.renderedEvidence.every((item) => item.characterCount <= 450));

const debate147 = await loadFixture("147");
assert.throws(() => validateV4220PrimaryOutput(debate147.output, debate147.packet, debate147.events, debate147.eventsBytes, debate147.ledgerBytes), /reply target must already appear|response target must be an earlier move/);
const futureTargetMove = debate147.output.moves.find((move) => move.moveId === "pro-mind-1");
assert.equal(futureTargetMove.response.decisiveTargetIds[0], "con-mind-1");

const modelAuthoredCue = structuredClone(debate110.output);
modelAuthoredCue.moves[0].sourceSpan.evidenceCue = "a prohibited model-authored quotation field is inserted into this source span";
assert.throws(() => validateV4220PrimaryOutput(modelAuthoredCue, debate110.packet, debate110.events, debate110.eventsBytes, debate110.ledgerBytes), /sourceSpan: keys must be/);
const tooShort = structuredClone(debate110.output.moves[0]);
tooShort.sourceSpan = { startEvent: 0, endEvent: 0 };
assert.throws(() => renderV4220EvidenceWindow(tooShort, debate110.events), /fewer than 12 lexical tokens|no bounded evidence window/);
const firstRendered = validation110.deterministicRecovery.renderedEvidence[0];
const canonical110 = canonicalizeV4220PrimaryOutput(debate110.output, debate110.events);
assert.equal(canonical110.moves[0].sourceSpan.excerpt, firstRendered.excerpt);

const result = { schemaVersion: "4.2.20-source-span-rendering-design-verification", protocolId: V4220_PROTOCOL_ID, status: "passed-code-only-source-span-rendering-design", developmentOnly: true, contracts: { modelSelectsEventSpanOnly: true, modelAuthoredEvidenceTextProhibited: true, repositoryOwnedLexicalSalienceRendering: true, boundedVerbatimWindow: { tokenRange: [12, 90], maximumCharacters: 450 }, deterministicTieBreakFrozen: true, repositoryOwnedChronology: true, futureTargetRemainsHardFailure: true, automaticTargetRepairPerformed: false, repositoryDerivedResponseClass: true }, preservedGateReplays: { historicalGateOutputsAccepted: false, debate110PassesEvidenceRenderingCounterfactual: validation110.status === "passed", debate194PassesEvidenceRenderingCounterfactual: validation194.status === "passed", debate147RemainsRejectedForFutureTarget: true }, mutationTests: { modelAuthoredEvidenceTextRejected: true, insufficientSourceSpanRejected: true, deterministicReplayExact: true, futureTargetRejected: true }, totals: { modelContexts: 0, retries: 0, corrections: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }, authorization: { freshSamplePreparation: true, recoveryModelExecution: false, passB: false, audioVerification: false, scoreDerivation: false, productionMutation: false, all195Debates: false } };
if (shouldWrite) {
  await mkdir(path.resolve(V4220_ROOT), { recursive: true });
  await writeFile(path.resolve(V4220_ROOT, "primary.schema.json"), `${JSON.stringify(schema, null, 2)}\n`);
  await writeFile(path.resolve(V4220_ROOT, "design-verification.json"), `${JSON.stringify(result, null, 2)}\n`);
}
console.log(JSON.stringify(result, null, 2));
