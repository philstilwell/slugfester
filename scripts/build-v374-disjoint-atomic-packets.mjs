#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V374_BUNDLES, V374_DEBATES, V374_PASSES, V374_ROOT, canonicalJson, makeV374Schema } from "./lib/v374-disjoint-atomic.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const sourceDefs = [
  { debateNumber: "62", debateId: "pageau-folley-logos-meaning-resurrection-2026" },
  { debateNumber: "154", debateId: "koukl-oconnor-kanojia-nonbelief-harm-2025" },
  { debateNumber: "185", debateId: "dennett-caruso-free-will-responsibility-2021" }
];
const cases = new Map();
const gold = new Map();
for (const source of sourceDefs) {
  const inputPath = `docs/calibration/v3.2/retired-three-debate-test/inputs/${source.debateId}.json`;
  const goldPath = `docs/calibration/v3.2/retired-three-debate-test/gold/${source.debateId}.json`;
  const input = await readJson(inputPath);
  const retired = await readJson(goldPath);
  for (const item of input.cases) cases.set(item.caseId, { ...item, inputPath, goldPath });
  for (const item of retired.annotations) gold.set(item.caseId, item);
}
const normalized = await readJson("docs/calibration/v3.6.1/decision-card-development/retired-fixtures.json");
const fixtures = new Map(normalized.debates.flatMap((debate) => debate.cases.map((item) => [item.caseId, item])));

function unique(values) {
  const result = [];
  for (const value of values) if (!result.some((item) => canonicalJson(item) === canonicalJson(value))) result.push(value);
  return result;
}

function targetCandidates(card) {
  const expected = Object.fromEntries(card.components.map((item, index) => [`component.c${index + 1}.contactMode`, item.contactMode]));
  const keys = Object.keys(expected);
  const allNone = Object.fromEntries(keys.map((key) => [key, "none"]));
  const allExact = Object.fromEntries(keys.map((key) => [key, "exact-proposition"]));
  const distinctions = Object.fromEntries(keys.map((key) => [key, expected[key] === "none" ? "none" : "distinction"]));
  return { expected, candidates: unique([expected, allNone, allExact, distinctions]).slice(0, 4) };
}

function diagnosticDefectCandidates(card) {
  const expected = { "defect.type": card.defect.type };
  return { expected, candidates: unique([expected, { "defect.type": "none" }, { "defect.type": "ambiguity" }, { "defect.type": "attribution-error" }, { "defect.type": "invalid-inference" }]).slice(0, 4) };
}

function diagnosticLinkedCandidates(card) {
  const expected = { "consequence.relationKind": card.consequence.relationKind, "defect.type": card.defect.type };
  return {
    expected,
    candidates: unique([
      expected,
      { "consequence.relationKind": "because", "defect.type": card.defect.type },
      { "consequence.relationKind": card.consequence.relationKind, "defect.type": "attribution-error" },
      { "consequence.relationKind": "explicit-negation", "defect.type": card.defect.type }
    ]).slice(0, 4)
  };
}

function reframeCandidates(card) {
  const expected = { "malformedDemand.explained": Boolean(card.malformedCueText), relationKind: card.relationKind, "replacementDemand.stated": Boolean(card.replacementCueText) };
  return { expected, candidates: unique([expected, { "malformedDemand.explained": true, relationKind: "contrastive", "replacementDemand.stated": true }, { "malformedDemand.explained": true, relationKind: "none", "replacementDemand.stated": false }, { "malformedDemand.explained": false, relationKind: "none", "replacementDemand.stated": true }]).slice(0, 4) };
}

function burdenCandidates(sourceCase, retired) {
  const options = sourceCase.burdenContext.route.bridges.slice(0, 4).map((bridge) => ({ burdenContact: { tier: bridge.tier, bridgeId: bridge.id } }));
  const expected = { burdenContact: { tier: retired.burdenContact.tier, bridgeId: retired.burdenContact.bridgeId } };
  return { expected, candidates: unique([expected, ...options]).slice(0, 4) };
}

function semanticTuple(definition, values) {
  if (definition.kind === "target-components") {
    const anyContact = Object.values(values).some((value) => value !== "none");
    return { relevantContraryCandidatePresent: false, ...values, "contrary.classification": anyContact ? "component-contact-precludes-contrary" : "none" };
  }
  if (definition.kind === "diagnostic-defect") return { consequenceStated: false, "consequence.relationKind": "none", ...values };
  if (definition.kind === "diagnostic-linked") return { consequenceStated: true, ...values };
  return values;
}

function buildBundle(definition) {
  const sourceCase = cases.get(definition.caseId);
  const fixture = fixtures.get(definition.caseId);
  const retired = gold.get(definition.caseId);
  let candidateSet;
  if (definition.kind === "target-components") candidateSet = targetCandidates(fixture.targetCard);
  else if (definition.kind === "diagnostic-defect") candidateSet = diagnosticDefectCandidates(fixture.diagnosticCard);
  else if (definition.kind === "diagnostic-linked") candidateSet = diagnosticLinkedCandidates(fixture.diagnosticCard);
  else if (definition.kind === "reframe") candidateSet = reframeCandidates(fixture.reframeCard);
  else candidateSet = burdenCandidates(sourceCase, retired);
  const target = { lockedTarget: sourceCase.targetPacket.claim, components: sourceCase.targetPacket.indispensableComponents.map((item) => ({ componentId: item.id, text: item.text })) };
  const decisionContext = definition.kind === "burden"
    ? { ...target, fieldPath: "burdenContact", burdenContext: { route: sourceCase.burdenContext.route } }
    : definition.kind === "reframe"
      ? { ...target, governingDemand: sourceCase.targetPacket.claim }
      : target;
  return {
    definition,
    sourceCase,
    decisionContext,
    independentFields: Object.keys(candidateSet.expected),
    candidates: candidateSet.candidates.map((values) => ({ values, semanticTuple: semanticTuple(definition, values), matchesRetiredExpected: canonicalJson(values) === canonicalJson(candidateSet.expected) }))
  };
}

const built = V374_BUNDLES.map(buildBundle);
const mapping = { schemaVersion: "3.7.4-sealed-atomic-option-map", status: "sealed-from-model-contexts", passes: {} };
for (const reviewerPass of V374_PASSES) {
  mapping.passes[reviewerPass] = {};
  let globalIndex = 0;
  for (const debateNumber of V374_DEBATES) {
    const bundles = built.filter((item) => item.definition.debateNumber === debateNumber).map((item) => {
      const shift = reviewerPass === "pass-a" ? globalIndex % item.candidates.length : (globalIndex + 1) % item.candidates.length;
      globalIndex += 1;
      const ordered = [...item.candidates.slice(shift), ...item.candidates.slice(0, shift)];
      mapping.passes[reviewerPass][item.definition.bundleId] = {
        debateNumber,
        caseId: item.definition.caseId,
        options: ordered.map((candidate, index) => ({ optionId: `option-${index + 1}`, semanticTuple: candidate.semanticTuple, matchesRetiredExpected: candidate.matchesRetiredExpected }))
      };
      return {
        bundleId: item.definition.bundleId,
        family: item.definition.family,
        caseId: item.definition.caseId,
        sourceExcerpt: item.sourceCase.sourceExcerpt,
        speakerAttributionConfidence: item.sourceCase.sourceMetadata.speakerAttributionConfidence,
        decisionContext: item.decisionContext,
        independentFields: item.independentFields,
        candidates: ordered.map((candidate, index) => ({ optionId: `option-${index + 1}`, values: candidate.values }))
      };
    });
    const packet = { schemaVersion: "3.7.4-atomic-bundle-packet", debateNumber, reviewerPass, allSpeakerAttributionConfidenceHigh: bundles.every((item) => item.speakerAttributionConfidence === "high"), bundles };
    const schema = makeV374Schema(packet);
    if (shouldWrite) {
      const packetPath = path.resolve(root, V374_ROOT, "packets", reviewerPass, `debate-${debateNumber}.json`);
      const schemaPath = path.resolve(root, V374_ROOT, "schemas", reviewerPass, `debate-${debateNumber}.schema.json`);
      await mkdir(path.dirname(packetPath), { recursive: true });
      await mkdir(path.dirname(schemaPath), { recursive: true });
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`);
      await writeFile(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
    }
  }
}
if (shouldWrite) {
  await mkdir(path.resolve(root, V374_ROOT), { recursive: true });
  await writeFile(path.resolve(root, V374_ROOT, "sealed-atomic-option-map.json"), `${JSON.stringify(mapping, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", debates: V374_DEBATES, disjointCaseIds: [...new Set(built.map((item) => item.definition.caseId))], bundleCount: built.length, bundlesPerDebate: Object.fromEntries(V374_DEBATES.map((debate) => [debate, built.filter((item) => item.definition.debateNumber === debate).length])), candidateCounts: Object.fromEntries(built.map((item) => [item.definition.bundleId, item.candidates.length])) }, null, 2));
