#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { expectedCard, loadV37Sources, semanticAssertions, V37_FAMILIES } from "./lib/v37-retired-semantic.mjs";
import { assert, canonicalJson, V371_ROOT } from "./lib/v371-gold-audit.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${V371_ROOT}/gate-manifest.json`), manifest = JSON.parse(manifestText);
const analysisText = await read(manifest.analysisPath), analysis = JSON.parse(analysisText);
assert(!analysis.passed && analysis.results.final.fields === 14 && analysis.results.final.resolved === 14, "postmortem requires a failed audit with complete two-vote resolutions");
const v37Manifest = JSON.parse(await read(manifest.v37.manifestPath));
const { fixtures } = await loadV37Sources(root);
const expectedMap = new Map(), actualMaps = { terra: new Map(), sol: new Map() };
for (const family of V37_FAMILIES) {
  const packet = JSON.parse(await read(v37Manifest.families[family].packet));
  for (let index = 0; index < packet.cases.length; index += 1) {
    const packetCase = packet.cases[index], expected = expectedCard(family, fixtures.get(packetCase.caseId), packetCase);
    for (const assertion of semanticAssertions(family, expected)) expectedMap.set(`${family}::${packetCase.caseId}::${assertion.fieldPath}`, assertion.value);
  }
  for (const modelKey of v37Manifest.modelKeys) {
    const output = JSON.parse(await read(v37Manifest.outputs[family][modelKey]));
    for (let index = 0; index < packet.cases.length; index += 1) for (const assertion of semanticAssertions(family, output.cards[index])) actualMaps[modelKey].set(`${family}::${packet.cases[index].caseId}::${assertion.fieldPath}`, assertion.value);
  }
}
for (const decision of analysis.results.final.decisions) expectedMap.set(decision.key, decision.finalValue);

function replay(modelKey) {
  const comparisons = [...expectedMap.entries()].map(([key, expected]) => {
    const actual = actualMaps[modelKey].get(key), family = key.split("::")[0];
    return { key, family, expected, actual, matched: canonicalJson(expected) === canonicalJson(actual) };
  });
  const target = comparisons.filter((item) => item.family === "target"), nonTarget = comparisons.filter((item) => item.family !== "target"), burden = comparisons.filter((item) => item.family === "burden");
  return {
    assertions: comparisons.length,
    matches: comparisons.filter((item) => item.matched).length,
    targetMatches: target.filter((item) => item.matched).length,
    nonTargetMatches: nonTarget.filter((item) => item.matched).length,
    burdenMatches: burden.filter((item) => item.matched).length,
    originalV37ThresholdsPassed: comparisons.filter((item) => item.matched).length >= 41 && target.filter((item) => item.matched).length >= 23 && nonTarget.filter((item) => item.matched).length >= 18 && burden.filter((item) => item.matched).length === 4
  };
}
const crossKeys = [...actualMaps.terra.keys()];
const crossAgreement = crossKeys.filter((key) => canonicalJson(actualMaps.terra.get(key)) === canonicalJson(actualMaps.sol.get(key))).length;
const result = {
  schemaVersion: "3.7.1-unauthorized-resolved-key-postmortem",
  status: "informational-only",
  warning: "The official v3.7.1 audit failed its frozen initial-agreement threshold. This counterfactual applies its complete two-vote resolutions only to diagnose whether that key would have changed the model-readiness conclusion.",
  officialAnalysisSha256: sha256(analysisText),
  resolvedKeyAuthorized: false,
  changedFields: analysis.results.final.decisions.filter((item) => item.changesRetiredExpected).map((item) => ({ key: item.key, retiredExpected: item.retiredExpected, resolvedValue: item.finalValue, supportingVotes: item.supportingVotes })),
  counterfactualReplay: { terra: replay("terra"), sol: replay("sol"), crossModelAgreement: crossAgreement, crossModelAgreementRequired: 41, crossModelAgreementPassed: crossAgreement >= 41 },
  conclusion: "Neither model would pass the original v3.7 semantic thresholds even if the six resolved changes were provisionally applied.",
  modelBatchAuthorized: false,
  heldOutAccessAuthorized: false,
  numericalParticipantScoringAuthorized: false,
  assessmentProseAuthorized: false,
  productionMutationAuthorized: false
};
const outputText = `${JSON.stringify(result, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, `${V371_ROOT}/resolved-key-postmortem.json`), outputText);
console.log(outputText);
