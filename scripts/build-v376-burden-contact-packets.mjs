#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { V376_CASES, V376_DEBATES, V376_PASSES, V376_ROOT, canonicalJson, makeV376Schema } from "./lib/v376-burden-contact.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), readJson = async (file) => JSON.parse(await readFile(path.resolve(root, file), "utf8"));
const sourceIds = ["pageau-folley-logos-meaning-resurrection-2026", "koukl-oconnor-kanojia-nonbelief-harm-2025", "dennett-caruso-free-will-responsibility-2021"];
const cases = new Map();
for (const debateId of sourceIds) for (const item of (await readJson(`docs/calibration/v3.2/retired-three-debate-test/inputs/${debateId}.json`)).cases) cases.set(item.caseId, item);

function strengthenedRoute(sourceCase) {
  const route = sourceCase.burdenContext.route;
  if (route.id === "koukl-oconnor-kanojia-nonbelief-harm-2025-con-route") return { ...route, bridges: [
    route.bridges.find((item) => item.tier === "motion"),
    route.bridges.find((item) => item.tier === "central"),
    { id: "koukl-oconnor-kanojia-nonbelief-harm-2025-con-subsidiary-conversion", tier: "subsidiary", description: "Cross-religious conversion counterexamples undercut an inference from reported post-conversion satisfaction to Christianity's exclusive superiority." },
    { id: "koukl-oconnor-kanojia-nonbelief-harm-2025-con-subsidiary-dharma", tier: "subsidiary", description: "The distinction between dharma and Western morality resists treating Hindu duty as merely an instance of the Christian moral framework." }
  ] };
  if (route.id === "pageau-folley-logos-meaning-resurrection-2026-pro-route") return { ...route, bridges: [
    route.bridges.find((item) => item.tier === "motion"),
    route.bridges.find((item) => item.tier === "central"),
    { id: "pageau-folley-logos-meaning-resurrection-2026-pro-subsidiary-symbolic-meaning", tier: "subsidiary", description: "Biblical narratives or resurrection claims can disclose truth through analogical structure, experienced meaning, or their downstream portrait of the world apart from isolated historical attestation." }
  ] };
  if (route.id === "pageau-folley-logos-meaning-resurrection-2026-con-route") return { ...route, bridges: [
    route.bridges.find((item) => item.tier === "motion"),
    route.bridges.find((item) => item.tier === "central"),
    { id: "pageau-folley-logos-meaning-resurrection-2026-con-subsidiary-social-unity", tier: "subsidiary", description: "Collective purpose and constraint can be explained through human coordination and social practices without positing a higher ontological unity." }
  ] };
  return route;
}

const built = V376_CASES.map((definition) => {
  const sourceCase = cases.get(definition.caseId), route = strengthenedRoute(sourceCase);
  const options = [{ burdenContact: null }, ...route.bridges.flatMap((bridge) => ["support", "attack"].map((polarity) => ({ burdenContact: { polarity, tier: bridge.tier, bridgeId: bridge.id } })))];
  const reference = definition.fixture === null ? options[0] : options.find((item) => item.burdenContact?.polarity === definition.fixture.polarity && item.burdenContact?.bridgeId === definition.fixture.bridgeId);
  if (!reference) throw new Error(`${definition.caseId}: design fixture absent from candidate universe`);
  return { definition, sourceCase, route, options, reference };
});
const mapping = { schemaVersion: "3.7.6-sealed-burden-contact-option-map", status: "sealed-from-model-contexts", warning: "Design fixtures are provisional AI-authored structural expectations, not ground truth.", passes: {} };

for (const reviewerPass of V376_PASSES) {
  mapping.passes[reviewerPass] = {};
  let globalIndex = 0;
  for (const debateNumber of V376_DEBATES) {
    const bundles = built.filter((item) => item.definition.debateNumber === debateNumber).map((item) => {
      const shiftA = globalIndex % item.options.length, shift = reviewerPass === "pass-a" ? shiftA : (shiftA + Math.ceil(item.options.length / 2)) % item.options.length;
      globalIndex += 1;
      const ordered = [...item.options.slice(shift), ...item.options.slice(0, shift)], bundleId = `burden-contact-${item.definition.caseId.replace("v291-dev-", "")}`;
      mapping.passes[reviewerPass][bundleId] = { debateNumber, caseId: item.definition.caseId, options: ordered.map((value, index) => ({ optionId: `option-${index + 1}`, semanticTuple: value, matchesDesignFixture: canonicalJson(value) === canonicalJson(item.reference) })) };
      return { bundleId, family: "burden-contact", caseId: item.definition.caseId, sourceExcerpt: item.sourceCase.sourceExcerpt, speakerAttributionConfidence: item.sourceCase.sourceMetadata.speakerAttributionConfidence, decisionContext: { speaker: { name: item.sourceCase.speaker, side: item.sourceCase.side }, lockedTarget: item.sourceCase.targetPacket.claim, route: item.route }, independentFields: ["burdenContact"], candidates: ordered.map((values, index) => ({ optionId: `option-${index + 1}`, values })) };
    });
    const packet = { schemaVersion: "3.7.6-burden-contact-packet", debateNumber, reviewerPass, allSpeakerAttributionConfidenceHigh: bundles.every((item) => item.speakerAttributionConfidence === "high"), bundles };
    const schema = makeV376Schema(packet);
    if (shouldWrite) {
      const packetPath = path.resolve(root, V376_ROOT, "packets", reviewerPass, `debate-${debateNumber}.json`), schemaPath = path.resolve(root, V376_ROOT, "schemas", reviewerPass, `debate-${debateNumber}.schema.json`);
      await mkdir(path.dirname(packetPath), { recursive: true }); await mkdir(path.dirname(schemaPath), { recursive: true });
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`); await writeFile(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
    }
  }
}
if (shouldWrite) { await mkdir(path.resolve(root, V376_ROOT), { recursive: true }); await writeFile(path.resolve(root, V376_ROOT, "sealed-option-map.json"), `${JSON.stringify(mapping, null, 2)}\n`); }
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", caseCount: built.length, candidateCounts: Object.fromEntries(built.map((item) => [item.definition.caseId, item.options.length])), bundlesPerDebate: Object.fromEntries(V376_DEBATES.map((debate) => [debate, built.filter((item) => item.definition.debateNumber === debate).length])) }, null, 2));
