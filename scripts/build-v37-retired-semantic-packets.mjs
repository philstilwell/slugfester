#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assert, sha256, validateClosedSchema } from "./lib/v36-decision-cards.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.7/retired-semantic-card-test", shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const inputPaths = [
  "docs/calibration/v3.2/retired-three-debate-test/inputs/pageau-folley-logos-meaning-resurrection-2026.json",
  "docs/calibration/v3.2/retired-three-debate-test/inputs/dennett-caruso-free-will-responsibility-2021.json",
  "docs/calibration/v3.2/retired-three-debate-test/inputs/koukl-oconnor-kanojia-nonbelief-harm-2025.json"
];
const selected = {
  target: ["v291-dev-62-04", "v291-dev-185-08", "v291-dev-154-08", "v291-dev-62-09"],
  diagnostic: ["v291-dev-185-07", "v291-dev-185-12", "v291-dev-154-15"],
  reframe: ["v291-dev-185-12", "v291-dev-185-08"],
  burden: ["v291-dev-62-09::burdenContact", "v291-dev-185-05::burdenContact"]
};
const inputs = await Promise.all(inputPaths.map(async (file) => JSON.parse(await read(file))));
const cases = new Map(inputs.flatMap((input) => input.cases).map((item) => [item.caseId, item]));
const retired = JSON.parse(await read("docs/calibration/v3.6.1/decision-card-development/retired-fixtures.json"));
const fixtures = new Map(retired.debates.flatMap((debate) => debate.cases).map((item) => [item.caseId, item]));

function common(challenge) {
  return {
    caseId: challenge.caseId, moveId: challenge.moveId, debateId: challenge.debateId, debateNumber: challenge.debateNumber,
    lane: challenge.lane, speakerAttributionConfidence: challenge.sourceMetadata.speakerAttributionConfidence,
    sourceExcerpt: challenge.sourceExcerpt, lockedTarget: challenge.targetPacket.claim,
    components: challenge.targetPacket.indispensableComponents.map((item) => ({ componentId: item.id, text: item.text }))
  };
}
const packetCases = {
  target: selected.target.map((caseId) => common(cases.get(caseId))),
  diagnostic: selected.diagnostic.map((caseId) => common(cases.get(caseId))),
  reframe: selected.reframe.map((caseId) => ({ ...common(cases.get(caseId)), governingDemand: cases.get(caseId).targetPacket.claim })),
  burden: selected.burden.map((key) => {
    const [caseId, fieldPath] = key.split("::"), challenge = cases.get(caseId), fixture = fixtures.get(caseId);
    const burdenPacket = fixture.burdenPackets.find((item) => item.fieldPath === fieldPath);
    assert(challenge && burdenPacket, `${key}: missing challenge or burden packet`);
    const semantic = (candidate) => fieldPath === "burdenContact" ? { tier: candidate.tier, bridgeId: candidate.bridgeId } : { value: candidate.value };
    return {
      ...common(challenge), fieldPath, burdenContext: challenge.burdenContext,
      candidate1: { candidateId: "candidate-1", semanticValue: semantic(burdenPacket.candidate1) },
      candidate2: { candidateId: "candidate-2", semanticValue: semantic(burdenPacket.candidate2) }
    };
  })
};
for (const [family, familyCases] of Object.entries(packetCases)) {
  assert(familyCases.length === selected[family].length && familyCases.every(Boolean), `${family}: sample incomplete`);
  assert(familyCases.every((item) => item.speakerAttributionConfidence === "high"), `${family}: medium-confidence case requires audio verification`);
}
const cardSchemaPaths = {
  target: "docs/calibration/v3.6.3/schema-smoke-correction/schemas/target-component-example.schema.json",
  diagnostic: "docs/calibration/v3.6/decision-card-development/schemas/diagnostic.schema.json",
  reframe: "docs/calibration/v3.6/decision-card-development/schemas/reframe.schema.json",
  burden: "docs/calibration/v3.6/decision-card-development/schemas/burden-conflict.schema.json"
};
const audit = { packets: {}, schemas: {} };
for (const [family, familyCases] of Object.entries(packetCases)) {
  const packet = {
    schemaVersion: "3.7-gold-blind-family-packet", family, cases: familyCases,
    blindness: { expectedCardsAbsent: true, retiredGoldAbsent: true, scoresAbsent: true, legacyMaterialAbsent: true, otherModelOutputAbsent: true }
  };
  const packetText = `${JSON.stringify(packet, null, 2)}\n`, packetPath = `${gateRoot}/packets/${family}.json`;
  const item = validateClosedSchema(JSON.parse(await read(cardSchemaPaths[family])), `${family}.cardSchema`);
  delete item.$schema; delete item.$id;
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema", $id: `slugfester-v3.7-${family}-batch`, type: "object", additionalProperties: false,
    required: ["schemaVersion", "family", "cards"],
    properties: {
      schemaVersion: { type: "string", const: "3.7-family-card-batch" }, family: { type: "string", const: family },
      cards: { type: "array", items: item }
    }
  };
  validateClosedSchema(schema, `${family}.batchSchema`);
  const schemaText = `${JSON.stringify(schema, null, 2)}\n`, schemaPath = `${gateRoot}/schemas/${family}.schema.json`;
  if (shouldWrite) {
    await mkdir(path.dirname(path.resolve(root, packetPath)), { recursive: true });
    await mkdir(path.dirname(path.resolve(root, schemaPath)), { recursive: true });
    await writeFile(path.resolve(root, packetPath), packetText); await writeFile(path.resolve(root, schemaPath), schemaText);
  } else {
    assert(await read(packetPath) === packetText, `${family}: packet stale`); assert(await read(schemaPath) === schemaText, `${family}: schema stale`);
  }
  audit.packets[family] = { path: packetPath, caseCount: familyCases.length, sha256: sha256(packetText) };
  audit.schemas[family] = { path: schemaPath, sha256: sha256(schemaText) };
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "matched", selected, inputPaths, audit, modelContextsExecuted: 0 }, null, 2));
