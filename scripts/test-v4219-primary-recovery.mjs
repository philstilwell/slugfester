#!/usr/bin/env node
import { strict as assert } from "node:assert";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V4219_COMPILED_VERSION,
  V4219_EVIDENCE_LIMITS,
  V4219_OUTPUT_VERSION,
  V4219_PACKET_VERSION,
  V4219_PROTOCOL_ID,
  V4219_ROOT,
  canonicalizeV4219PrimaryOutput,
  classifyV4219PrimaryRoute,
  compileV4219PrimaryOutput,
  makeV4219PrimarySchema,
  validateV4219PrimaryOutput
} from "./lib/v4219-primary-recovery.mjs";

const shouldWrite = process.argv.includes("--write");
const historicalRoot = "docs/calibration/v4.2.18.1/fresh-direct-three";

function exactCue(events, startEvent, endEvent) {
  const text = events.slice(startEvent, endEvent + 1).map((event) => event.text).join(" ").replace(/\s+/g, " ").trim();
  const tokens = [...text.matchAll(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g)];
  assert(tokens.length >= 12);
  return text.slice(tokens[0].index, tokens[11].index + tokens[11][0].length);
}

function historicalAsSyntheticRaw(output, events) {
  const selectedMoveIds = new Set(output.moves.map((move) => move.moveId));
  return {
    ...structuredClone(output),
    schemaVersion: V4219_OUTPUT_VERSION,
    protocolId: V4219_PROTOCOL_ID,
    moves: output.moves.map((move) => {
      const { class: historicalClass, ...response } = move.response;
      const { responsiveness, ...ratings } = move.ratings;
      return {
        ...structuredClone(move),
        moveKind: historicalClass === "constructive-opening" ? "constructive" : move.moveKind,
        sourceSpan: {
          startEvent: move.sourceSpan.startEvent,
          endEvent: move.sourceSpan.endEvent,
          evidenceCue: exactCue(events, move.sourceSpan.startEvent, move.sourceSpan.endEvent)
        },
        response: {
          ...structuredClone(response),
          responsivenessWithinClass: {
            value: 50,
            rationale: responsiveness.rationale
          }
        },
        ratings: structuredClone(ratings)
      };
    }),
    burdenCompletionAdjustment: Object.fromEntries(Object.entries(output.burdenCompletionAdjustment).map(([side, adjustment]) => [side, {
      ...structuredClone(adjustment),
      eligibility: {
        ...structuredClone(adjustment.eligibility),
        relatedMoveIds: adjustment.eligibility.relatedMoveIds.filter((moveId) => selectedMoveIds.has(moveId))
      }
    }]))
  };
}

async function loadFixture(debateNumber) {
  const [historicalPacket, historicalOutput] = await Promise.all([
    readFile(`${historicalRoot}/packets/debate-${debateNumber}.json`, "utf8").then(JSON.parse),
    readFile(`${historicalRoot}/primary-outputs/debate-${debateNumber}.json`, "utf8").then(JSON.parse)
  ]);
  const packet = { ...historicalPacket, schemaVersion: V4219_PACKET_VERSION, protocolId: V4219_PROTOCOL_ID };
  const [eventsBytes, ledgerBytes] = await Promise.all([
    readFile(packet.sourceChain.eventsPath),
    readFile(packet.transportChain.sourceLedgerPath)
  ]);
  const events = JSON.parse(eventsBytes);
  return { packet, output: historicalAsSyntheticRaw(historicalOutput, Array.isArray(events) ? events : events.events), events, eventsBytes, ledgerBytes, historicalOutput };
}

const routes = {
  debate102: classifyV4219PrimaryRoute({ sourceLedgerEvents: 2625, compactCopiedInputBytes: 187972 }),
  debate107: classifyV4219PrimaryRoute({ sourceLedgerEvents: 1296, compactCopiedInputBytes: 116803 }),
  debate126: classifyV4219PrimaryRoute({ sourceLedgerEvents: 1559, compactCopiedInputBytes: 126265 })
};
assert.equal(routes.debate102.route, "partition");
assert.deepEqual(routes.debate102.exceeded, ["source-ledger-events", "compact-copied-input-bytes"]);
assert.equal(routes.debate107.route, "direct");
assert.equal(routes.debate126.route, "direct");
assert.equal(routes.debate102.durationUsedForRouting, false);

const schema = makeV4219PrimarySchema();
const moveSchema = schema.properties.moves.items.properties;
assert.equal(moveSchema.sourceSpan.properties.excerpt, undefined);
assert.equal(moveSchema.sourceSpan.properties.evidenceCue.maxLength, 180);
assert.equal(moveSchema.response.properties.class, undefined);
assert(moveSchema.response.properties.responsivenessWithinClass);
assert.equal(moveSchema.ratings.properties.responsiveness, undefined);

const debate107 = await loadFixture("107");
const validation107 = validateV4219PrimaryOutput(debate107.output, debate107.packet, debate107.events, debate107.eventsBytes, debate107.ledgerBytes);
assert.equal(validation107.status, "passed");
assert.equal(validation107.deterministicRecovery.chronologyReordered, false);
assert(validation107.deterministicRecovery.compiledEvidence.every((item) => item.characters <= V4219_EVIDENCE_LIMITS.excerptMaximumCharacters && item.tokens >= V4219_EVIDENCE_LIMITS.excerptMinimumTokens && item.tokens <= V4219_EVIDENCE_LIMITS.excerptMaximumTokens));
const compiled107 = compileV4219PrimaryOutput(debate107.output, debate107.packet, debate107.events);
assert.equal(compiled107.schemaVersion, V4219_COMPILED_VERSION);
assert(compiled107.moves.every((move) => move.sourceSpan.excerpt.length <= V4219_EVIDENCE_LIMITS.excerptMaximumCharacters));

const debate126 = await loadFixture("126");
const validation126 = validateV4219PrimaryOutput(debate126.output, debate126.packet, debate126.events, debate126.eventsBytes, debate126.ledgerBytes);
assert.equal(validation126.status, "passed");
assert.equal(validation126.deterministicRecovery.chronologyReordered, true);
const canonical126 = canonicalizeV4219PrimaryOutput(debate126.output, debate126.events);
const recoveredMove = canonical126.moves.find((move) => move.moveId === "m05-pro-mind-counterexample");
assert.equal(recoveredMove.response.class, "partial-answer");
assert.equal(recoveredMove.ratings.responsiveness.value, 67);
const historicalClassChanges = Object.fromEntries([debate107, debate126].map((fixture) => {
  const canonical = canonicalizeV4219PrimaryOutput(fixture.output, fixture.events);
  const historicalById = new Map(fixture.historicalOutput.moves.map((move) => [move.moveId, move.response.class]));
  return [fixture.packet.debateNumber, canonical.moves.flatMap((move) => historicalById.get(move.moveId) === move.response.class ? [] : [{ moveId: move.moveId, historicalClass: historicalById.get(move.moveId), derivedClass: move.response.class }])];
}));

const badCue = structuredClone(debate107.output);
badCue.moves[0].sourceSpan.evidenceCue = "this fabricated cue has enough words but never appears inside the selected source event span";
assert.throws(() => validateV4219PrimaryOutput(badCue, debate107.packet, debate107.events, debate107.eventsBytes, debate107.ledgerBytes), /exact cue is absent/);
const modelAuthoredClass = structuredClone(debate107.output);
modelAuthoredClass.moves[0].response.class = "constructive-opening";
assert.throws(() => validateV4219PrimaryOutput(modelAuthoredClass, debate107.packet, debate107.events, debate107.eventsBytes, debate107.ledgerBytes), /response: keys must be/);
const modelAuthoredAbsolute = structuredClone(debate107.output);
modelAuthoredAbsolute.moves[0].ratings.responsiveness = { value: 84, rationale: "This prohibited absolute rating is intentionally injected only to test deterministic rejection." };
assert.throws(() => validateV4219PrimaryOutput(modelAuthoredAbsolute, debate107.packet, debate107.events, debate107.eventsBytes, debate107.ledgerBytes), /ratings: keys must be/);
const futureTarget = structuredClone(debate107.output);
const firstReply = futureTarget.moves.find((move) => move.moveKind === "reply");
const lastMoveId = [...futureTarget.moves].sort((left, right) => left.sourceSpan.startEvent - right.sourceSpan.startEvent).at(-1).moveId;
firstReply.response.decisiveTargetIds = [lastMoveId];
for (const component of firstReply.response.components) component.targetMoveId = lastMoveId;
assert.throws(() => validateV4219PrimaryOutput(futureTarget, debate107.packet, debate107.events, debate107.eventsBytes, debate107.ledgerBytes), /response target must be an earlier move|reply target must already appear/);
const ambiguousExceptionalClass = structuredClone(debate107.output);
const reply = ambiguousExceptionalClass.moves.find((move) => move.moveKind === "reply");
reply.response.diagnosticConsequenceExplicit = true;
reply.response.replacementDemandAnswered = true;
assert.throws(() => validateV4219PrimaryOutput(ambiguousExceptionalClass, debate107.packet, debate107.events, debate107.eventsBytes, debate107.ledgerBytes), /mutually exclusive/);
assert.throws(() => validateV4219PrimaryOutput(debate107.historicalOutput, debate107.packet, debate107.events, debate107.eventsBytes, debate107.ledgerBytes), /primary output identity mismatch/);

const result = {
  schemaVersion: "4.2.19-primary-recovery-design-verification",
  protocolId: V4219_PROTOCOL_ID,
  status: "passed-code-only-recovery-design",
  developmentOnly: true,
  routes,
  contracts: {
    exactEvidenceCueRequired: true,
    repositoryOwnedBoundedExcerptCompilation: true,
    repositoryOwnedChronology: true,
    targetEdgesValidatedAfterChronology: true,
    repositoryDerivedResponseClass: true,
    modelSuppliesWithinClassPositionOnly: true,
    absoluteResponsivenessRejectedFromModelOutput: true
  },
  replayFixtures: {
    source: "synthetic re-encoding of preserved rejected v4.2.18.2 raw outputs",
    historicalGateOutputsAccepted: false,
    debate107: { status: validation107.status, moves: validation107.moves, chronologyReordered: false, historicalClassChanges: historicalClassChanges["107"] },
    debate126: { status: validation126.status, moves: validation126.moves, chronologyReordered: true, historicalClassChanges: historicalClassChanges["126"], formerlyInconsistentMoveDerivedClass: recoveredMove.response.class, mappedResponsivenessAtFixtureMidpoint: recoveredMove.ratings.responsiveness.value }
  },
  mutationTests: {
    absentCueRejected: true,
    modelAuthoredClassRejected: true,
    modelAuthoredAbsoluteResponsivenessRejected: true,
    futureTargetRejectedAfterCanonicalOrdering: true,
    ambiguousExceptionalClassRejected: true,
    unchangedHistoricalOutputRejected: true
  },
  totals: { modelContexts: 0, retries: 0, corrections: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { recoverySamplePreparation: true, recoveryModelExecution: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};

if (shouldWrite) {
  await mkdir(path.resolve(V4219_ROOT), { recursive: true });
  await writeFile(path.resolve(V4219_ROOT, "primary.schema.json"), `${JSON.stringify(schema, null, 2)}\n`);
  await writeFile(path.resolve(V4219_ROOT, "design-verification.json"), `${JSON.stringify(result, null, 2)}\n`);
}
console.log(JSON.stringify(result, null, 2));
