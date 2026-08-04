#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { compileBundle, V372_SPEC_PATH } from "./lib/v372-atomic-bundles.mjs";
import { cartesian, canonicalJson, makeV373Schema, V373_DEBATES, V373_PASSES, V373_ROOT } from "./lib/v373-atomic-packets.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), read = (file) => readFile(path.resolve(root, file), "utf8");
const spec = JSON.parse(await read(V372_SPEC_PATH));
const v371Root = "docs/calibration/v3.7.1/gold-blind-benchmark-audit";
const sealed = JSON.parse(await read(`${v371Root}/sealed-option-map.json`));
const auditSource = JSON.parse(await read("docs/calibration/v3.7/retired-semantic-card-test/gold-audit-disagreements.json"));
const disputes = new Map([...auditSource.consensusAgainstRetiredGold, ...auditSource.crossModelDisagreements].map((item) => [item.key, item]));
const passAMapping = new Map(Object.values(sealed.passes["pass-a"]).flatMap((debate) => debate.decisions.map((item) => [item.auditId, item])));
const sourceDecisions = new Map();
for (const debateNumber of V373_DEBATES) {
  const packet = JSON.parse(await read(`${v371Root}/packets/pass-a/debate-${debateNumber}.json`));
  for (const decision of packet.decisions) sourceDecisions.set(decision.auditId, decision);
}
const retiredValues = new Map();
for (const mapping of passAMapping.values()) retiredValues.set(mapping.auditId, disputes.get(mapping.key).retiredExpected);

function valuesForAudit(auditId) {
  const mapping = passAMapping.get(auditId), values = [];
  for (const option of mapping.options) if (!values.some((value) => canonicalJson(value) === canonicalJson(option.semanticValue))) values.push(option.semanticValue);
  return values;
}

function completeValues(bundle, inputs) {
  const values = new Map(bundle.inputs.map((input, index) => [input.auditId, inputs[index]]));
  if (bundle.compiler === "target-components") {
    const anyContact = inputs.some((value) => value !== "none");
    const witnessValue = anyContact ? "component-contact-precludes-contrary" : "relevant-no-component";
    for (const witness of bundle.witnesses) values.set(witness.auditId, witnessValue);
  }
  return values;
}

const candidateSets = {}, mapping = { schemaVersion: "3.7.3-sealed-atomic-option-map", status: "sealed-from-model-contexts", passes: {} };
for (const bundle of spec.bundles) {
  const combinations = cartesian(bundle.inputs.map((input) => valuesForAudit(input.auditId))), candidates = [];
  for (const combination of combinations) {
    const compiled = compileBundle(bundle, completeValues(bundle, combination), `candidate.${bundle.bundleId}`);
    if (!compiled.valid) continue;
    const independentValues = Object.fromEntries(bundle.inputs.map((input, index) => [input.fieldId, combination[index]]));
    const derivedValues = Object.fromEntries(Object.entries(compiled.semanticTuple).filter(([key]) => !Object.hasOwn(independentValues, key) && !Object.hasOwn(bundle.fixedFields, key)));
    const semantic = { independentValues, derivedValues };
    if (!candidates.some((item) => canonicalJson(item.semantic) === canonicalJson(semantic))) candidates.push({ semantic, fullTuple: compiled.semanticTuple });
  }
  candidateSets[bundle.bundleId] = candidates;
}

for (const reviewerPass of V373_PASSES) {
  mapping.passes[reviewerPass] = {};
  let globalIndex = 0;
  for (const debateNumber of V373_DEBATES) {
    const bundles = spec.bundles.filter((item) => item.debateNumber === debateNumber).map((bundle) => {
      const candidates = candidateSets[bundle.bundleId], shift = reviewerPass === "pass-a" ? globalIndex % candidates.length : (globalIndex + 1) % candidates.length;
      globalIndex += 1;
      const ordered = [...candidates.slice(shift), ...candidates.slice(0, shift)];
      const packetCandidates = ordered.map((candidate, index) => ({ optionId: `option-${index + 1}`, values: candidate.semantic.independentValues }));
      const mappedOptions = ordered.map((candidate, index) => {
        const retiredMap = completeValues(bundle, bundle.inputs.map((input) => retiredValues.get(input.auditId)));
        const retired = compileBundle(bundle, retiredMap, `retired.${bundle.bundleId}`);
        return { optionId: `option-${index + 1}`, semanticTuple: candidate.fullTuple, matchesRetiredExpected: canonicalJson(candidate.fullTuple) === canonicalJson(retired.semanticTuple) };
      });
      const source = sourceDecisions.get(bundle.inputs[0]?.auditId ?? bundle.witnesses[0].auditId);
      mapping.passes[reviewerPass][bundle.bundleId] = { debateNumber, options: mappedOptions };
      return { bundleId: bundle.bundleId, family: bundle.family, caseId: bundle.caseId, sourceExcerpt: source.sourceExcerpt, speakerAttributionConfidence: source.speakerAttributionConfidence, decisionContext: source.decisionContext, independentFields: bundle.inputs.map((item) => item.fieldId), candidates: packetCandidates };
    });
    const packet = { schemaVersion: "3.7.3-atomic-bundle-packet", debateNumber, reviewerPass, allSpeakerAttributionConfidenceHigh: bundles.every((item) => item.speakerAttributionConfidence === "high"), bundles };
    const schema = makeV373Schema(packet);
    if (shouldWrite) {
      const packetPath = path.resolve(root, V373_ROOT, "packets", reviewerPass, `debate-${debateNumber}.json`), schemaPath = path.resolve(root, V373_ROOT, "schemas", reviewerPass, `debate-${debateNumber}.schema.json`);
      await mkdir(path.dirname(packetPath), { recursive: true }); await mkdir(path.dirname(schemaPath), { recursive: true });
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`); await writeFile(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
    }
  }
}
if (shouldWrite) { await mkdir(path.resolve(root, V373_ROOT), { recursive: true }); await writeFile(path.resolve(root, V373_ROOT, "sealed-atomic-option-map.json"), `${JSON.stringify(mapping, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", bundleCount: spec.bundles.length, candidateCounts: Object.fromEntries(Object.entries(candidateSets).map(([key, values]) => [key, values.length])), initialContextCount: 6 }, null, 2));
