import { readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "./v373-atomic-packets.mjs";

export const V373_EXECUTION_MANIFEST = "docs/calibration/v3.7.3/atomic-bundle-correction-smoke/execution-manifest.json";

export async function readJson(root, file) {
  return JSON.parse(await readFile(path.resolve(root, file), "utf8"));
}

export function mappedOption(mapping, reviewerPass, bundleId, optionId) {
  const bundle = mapping.passes?.[reviewerPass]?.[bundleId];
  const option = bundle?.options?.find((item) => item.optionId === optionId);
  if (!option) throw new Error(`${reviewerPass}.${bundleId}.${optionId}: sealed option mapping missing`);
  return option;
}

export function adjudicationOption(mapping, debateNumber, bundleId, optionId) {
  const bundle = mapping.debates?.[debateNumber]?.bundles?.find((item) => item.bundleId === bundleId);
  const option = bundle?.options?.find((item) => item.optionId === optionId);
  if (!option) throw new Error(`pass-c.${debateNumber}.${bundleId}.${optionId}: adjudication option mapping missing`);
  return option;
}

export function semanticWinner(votes) {
  const counts = [];
  for (const vote of votes.filter((value) => value !== null && value !== undefined)) {
    const key = canonicalJson(vote);
    const found = counts.find((item) => item.key === key);
    if (found) found.votes += 1;
    else counts.push({ key, value: vote, votes: 1 });
  }
  counts.sort((left, right) => right.votes - left.votes || left.key.localeCompare(right.key));
  return counts[0]?.votes >= 2 ? counts[0] : null;
}

export function matchesRetiredExpected(mapping, bundleId, value) {
  const option = mapping.passes?.["pass-a"]?.[bundleId]?.options?.find(
    (item) => canonicalJson(item.semanticTuple) === canonicalJson(value)
  );
  if (!option) throw new Error(`${bundleId}: final semantic tuple absent from sealed option universe`);
  return option.matchesRetiredExpected;
}
