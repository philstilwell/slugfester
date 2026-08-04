import { readFile } from "node:fs/promises";
import path from "node:path";
import { makeV375Schema, assert, canonicalJson } from "./v375-correction.mjs";

export const V375_EXECUTION_MANIFEST = "docs/calibration/v3.7.5/taxonomy-priority-correction-smoke/execution-manifest.json";

export async function readJson(root, file) {
  return JSON.parse(await readFile(path.resolve(root, file), "utf8"));
}

export function mappedOption(mapping, reviewerPass, bundleId, optionId) {
  const option = mapping.passes?.[reviewerPass]?.[bundleId]?.options?.find((item) => item.optionId === optionId);
  assert(option, `${reviewerPass}.${bundleId}.${optionId}: sealed option missing`);
  return option;
}

export function adjudicationOption(mapping, debateNumber, bundleId, optionId) {
  const option = mapping.debates?.[debateNumber]?.bundles?.find((item) => item.bundleId === bundleId)?.options?.find((item) => item.optionId === optionId);
  assert(option, `pass-c.${debateNumber}.${bundleId}.${optionId}: adjudication option missing`);
  return option;
}

export function compareV375Outputs(mapping, outputA, outputB) {
  assert(outputA.debateNumber === outputB.debateNumber, "comparison debate mismatch");
  const passBById = new Map(outputB.bundles.map((item) => [item.bundleId, item]));
  return outputA.bundles.map((choiceA) => {
    const choiceB = passBById.get(choiceA.bundleId);
    assert(choiceB, `${choiceA.bundleId}: pass-b choice missing`);
    const passA = mappedOption(mapping, "pass-a", choiceA.bundleId, choiceA.optionId).semanticTuple;
    const passB = mappedOption(mapping, "pass-b", choiceB.bundleId, choiceB.optionId).semanticTuple;
    return { bundleId: choiceA.bundleId, debateNumber: outputA.debateNumber, passA, passB, agreed: canonicalJson(passA) === canonicalJson(passB) };
  });
}

export function makeV375AdjudicationArtifacts(debateNumber, passAPacket, comparisons, mapping, rotationSeed = 0) {
  const sourceById = new Map(passAPacket.bundles.map((item) => [item.bundleId, item]));
  const map = { schemaVersion: "3.7.5-adjudication-option-map", debateNumber, bundles: [] };
  const bundles = comparisons.filter((item) => !item.agreed).map((comparison, disputeIndex) => {
    const source = sourceById.get(comparison.bundleId);
    assert(source, `${comparison.bundleId}: source bundle missing`);
    const valuesByOption = new Map(source.candidates.map((item) => [item.optionId, item.values]));
    const universe = mapping.passes["pass-a"][comparison.bundleId].options.map((item) => ({ ...item, values: valuesByOption.get(item.optionId) }));
    assert(universe.every((item) => item.values), `${comparison.bundleId}: candidate values missing`);
    const shift = (rotationSeed + disputeIndex + 1) % universe.length;
    const ordered = [...universe.slice(shift), ...universe.slice(0, shift)];
    map.bundles.push({
      bundleId: comparison.bundleId,
      options: ordered.map((item, index) => ({ optionId: `option-${index + 1}`, semanticTuple: item.semanticTuple, matchesDevelopmentReference: item.matchesDevelopmentReference }))
    });
    return { ...source, candidates: ordered.map((item, index) => ({ optionId: `option-${index + 1}`, values: item.values })) };
  });
  const packet = { schemaVersion: "3.7.5-correction-packet", debateNumber, reviewerPass: "pass-c", allSpeakerAttributionConfidenceHigh: passAPacket.allSpeakerAttributionConfidenceHigh, bundles };
  return { packet, schema: makeV375Schema(packet), map };
}

export function semanticWinner(votes) {
  const counts = [];
  for (const value of votes.filter((item) => item !== null && item !== undefined)) {
    const key = canonicalJson(value);
    const found = counts.find((item) => item.key === key);
    if (found) found.votes += 1;
    else counts.push({ key, value, votes: 1 });
  }
  counts.sort((left, right) => right.votes - left.votes || left.key.localeCompare(right.key));
  return counts[0]?.votes >= 2 ? counts[0] : null;
}

export function matchesDevelopmentReference(mapping, bundleId, semanticTuple) {
  const option = mapping.passes?.["pass-a"]?.[bundleId]?.options?.find((item) => canonicalJson(item.semanticTuple) === canonicalJson(semanticTuple));
  assert(option, `${bundleId}: semantic tuple absent from sealed universe`);
  return option.matchesDevelopmentReference;
}
