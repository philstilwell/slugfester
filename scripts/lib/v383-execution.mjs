import { readFile } from "node:fs/promises";
import path from "node:path";
import { makeV383Schema, assert, canonicalJson } from "./v383-burden-contact.mjs";

export const V383_EXECUTION_MANIFEST = "docs/calibration/v3.8.3/held-out-burden-contact-classification-gate/execution-manifest.json";

export async function readV383Json(root, file) {
  return JSON.parse(await readFile(path.resolve(root, file), "utf8"));
}

export function mappedV383Option(mapping, reviewerPass, bundleId, optionId) {
  const option = mapping.passes?.[reviewerPass]?.[bundleId]?.options?.find((item) => item.optionId === optionId);
  assert(option, `${reviewerPass}.${bundleId}.${optionId}: sealed option missing`);
  return option;
}

export function adjudicationV383Option(mapping, debateNumber, bundleId, optionId) {
  const option = mapping.debates?.[debateNumber]?.bundles?.find((item) => item.bundleId === bundleId)?.options?.find((item) => item.optionId === optionId);
  assert(option, `pass-c.${debateNumber}.${bundleId}.${optionId}: adjudication option missing`);
  return option;
}

export function compareV383Outputs(mapping, outputA, outputB) {
  assert(outputA.debateNumber === outputB.debateNumber, "comparison debate mismatch");
  const passBById = new Map(outputB.bundles.map((item) => [item.bundleId, item]));
  return outputA.bundles.map((choiceA) => {
    const choiceB = passBById.get(choiceA.bundleId);
    assert(choiceB, `${choiceA.bundleId}: pass-b choice missing`);
    const passA = mappedV383Option(mapping, "pass-a", choiceA.bundleId, choiceA.optionId).semanticTuple;
    const passB = mappedV383Option(mapping, "pass-b", choiceB.bundleId, choiceB.optionId).semanticTuple;
    return { bundleId: choiceA.bundleId, debateNumber: outputA.debateNumber, passA, passB, agreed: canonicalJson(passA) === canonicalJson(passB) };
  });
}

export function makeV383AdjudicationArtifacts(debateNumber, passAPacket, comparisons, rotationSeed = 0) {
  const sourceById = new Map(passAPacket.bundles.map((item) => [item.bundleId, item]));
  const map = { schemaVersion: "3.8.3-heldout-adjudication-option-map", debateNumber, bundles: [] };
  const bundles = comparisons.filter((item) => !item.agreed).map((comparison, disputeIndex) => {
    const source = sourceById.get(comparison.bundleId);
    assert(source, `${comparison.bundleId}: source bundle missing`);
    const semantic = [comparison.passA, comparison.passB].sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
    assert(canonicalJson(semantic[0]) !== canonicalJson(semantic[1]), `${comparison.bundleId}: adjudication requires two distinct tuples`);
    if ((rotationSeed + disputeIndex) % 2 === 1) semantic.reverse();
    const options = semantic.map((semanticTuple, index) => ({ optionId: `option-${String(index + 1).padStart(2, "0")}`, semanticTuple }));
    map.bundles.push({ bundleId: comparison.bundleId, options });
    return { ...source, candidates: options.map((item) => ({ optionId: item.optionId, values: item.semanticTuple })) };
  });
  const packet = {
    schemaVersion: "3.8.3-heldout-burden-contact-packet",
    debateNumber,
    debateId: passAPacket.debateId,
    reviewerPass: "pass-c",
    verifiedSourceChain: passAPacket.verifiedSourceChain,
    allSpeakerAttributionConfidenceHigh: passAPacket.allSpeakerAttributionConfidenceHigh,
    bundles
  };
  return { packet, schema: makeV383Schema(packet), map };
}

export function v383SemanticWinner(votes) {
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

export function matchesV383ProvisionalAid(mapping, bundleId, semanticTuple) {
  const option = mapping.passes?.["pass-a"]?.[bundleId]?.options?.find((item) => canonicalJson(item.semanticTuple) === canonicalJson(semanticTuple));
  assert(option, `${bundleId}: semantic tuple absent from sealed universe`);
  return option.matchesProvisionalAid;
}
