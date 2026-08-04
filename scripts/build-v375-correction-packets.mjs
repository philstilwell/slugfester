#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V375_BUNDLES, V375_DEBATES, V375_PASSES, V375_ROOT, canonicalJson, makeV375Schema } from "./lib/v375-correction.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const sourceDefs = ["pageau-folley-logos-meaning-resurrection-2026", "koukl-oconnor-kanojia-nonbelief-harm-2025", "dennett-caruso-free-will-responsibility-2021"];
const cases = new Map(), fixtures = new Map();
for (const debateId of sourceDefs) {
  const input = await readJson(`docs/calibration/v3.2/retired-three-debate-test/inputs/${debateId}.json`);
  for (const item of input.cases) cases.set(item.caseId, item);
}
const normalized = await readJson("docs/calibration/v3.6.1/decision-card-development/retired-fixtures.json");
for (const debate of normalized.debates) for (const item of debate.cases) fixtures.set(item.caseId, item);
const diagnosticValues = ["none", "ambiguity", "attribution-error", "invalid-inference"];
const mapping = { schemaVersion: "3.7.5-sealed-correction-option-map", status: "sealed-from-model-contexts", passes: {} };

function candidates(definition) {
  const sourceCase = cases.get(definition.caseId), fixture = fixtures.get(definition.caseId);
  if (definition.family === "diagnostic") return {
    reference: { "defect.type": fixture.diagnosticCard.defect.type },
    options: diagnosticValues.map((value) => ({ "defect.type": value })),
    decisionContext: { lockedTarget: sourceCase.targetPacket.claim, components: sourceCase.targetPacket.indispensableComponents.map((item) => ({ componentId: item.id, text: item.text })) },
    independentFields: ["defect.type"]
  };
  const bridgeOptions = sourceCase.burdenContext.route.bridges.slice(0, 4).map((bridge) => ({ burdenContact: { tier: bridge.tier, bridgeId: bridge.id } }));
  const reference = bridgeOptions.find((item) => item.burdenContact.bridgeId === definition.referenceBridgeId);
  return {
    reference,
    options: bridgeOptions,
    decisionContext: { lockedTarget: sourceCase.targetPacket.claim, components: sourceCase.targetPacket.indispensableComponents.map((item) => ({ componentId: item.id, text: item.text })), fieldPath: "burdenContact", burdenContext: { route: sourceCase.burdenContext.route } },
    independentFields: ["burdenContact"]
  };
}

const built = V375_BUNDLES.map((definition) => ({ definition, sourceCase: cases.get(definition.caseId), ...candidates(definition) }));
for (const reviewerPass of V375_PASSES) {
  mapping.passes[reviewerPass] = {};
  let globalIndex = 0;
  for (const debateNumber of V375_DEBATES) {
    const bundles = built.filter((item) => item.definition.debateNumber === debateNumber).map((item) => {
      const shift = reviewerPass === "pass-a" ? globalIndex % item.options.length : (globalIndex + 1) % item.options.length;
      globalIndex += 1;
      const ordered = [...item.options.slice(shift), ...item.options.slice(0, shift)];
      mapping.passes[reviewerPass][item.definition.bundleId] = { debateNumber, caseId: item.definition.caseId, options: ordered.map((value, index) => ({ optionId: `option-${index + 1}`, semanticTuple: value, matchesDevelopmentReference: canonicalJson(value) === canonicalJson(item.reference) })) };
      return { bundleId: item.definition.bundleId, family: item.definition.family, caseId: item.definition.caseId, sourceExcerpt: item.sourceCase.sourceExcerpt, speakerAttributionConfidence: item.sourceCase.sourceMetadata.speakerAttributionConfidence, decisionContext: item.decisionContext, independentFields: item.independentFields, candidates: ordered.map((values, index) => ({ optionId: `option-${index + 1}`, values })) };
    });
    const packet = { schemaVersion: "3.7.5-correction-packet", debateNumber, reviewerPass, allSpeakerAttributionConfidenceHigh: bundles.every((item) => item.speakerAttributionConfidence === "high"), bundles };
    const schema = makeV375Schema(packet);
    if (shouldWrite) {
      const packetPath = path.resolve(root, V375_ROOT, "packets", reviewerPass, `debate-${debateNumber}.json`), schemaPath = path.resolve(root, V375_ROOT, "schemas", reviewerPass, `debate-${debateNumber}.schema.json`);
      await mkdir(path.dirname(packetPath), { recursive: true }); await mkdir(path.dirname(schemaPath), { recursive: true });
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`); await writeFile(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
    }
  }
}
if (shouldWrite) { await mkdir(path.resolve(root, V375_ROOT), { recursive: true }); await writeFile(path.resolve(root, V375_ROOT, "sealed-option-map.json"), `${JSON.stringify(mapping, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", bundleCount: built.length, familyCounts: { diagnostic: built.filter((item) => item.definition.family === "diagnostic").length, burden: built.filter((item) => item.definition.family === "burden").length }, bundlesPerDebate: Object.fromEntries(V375_DEBATES.map((debate) => [debate, built.filter((item) => item.definition.debateNumber === debate).length])) }, null, 2));
