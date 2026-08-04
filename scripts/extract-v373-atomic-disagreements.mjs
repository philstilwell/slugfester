#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { assert, canonicalJson, makeV373Schema, validateV373Output, V373_DEBATES } from "./lib/v373-atomic-packets.mjs";
import { mappedOption, readJson, V373_EXECUTION_MANIFEST } from "./lib/v373-execution.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(V373_EXECUTION_MANIFEST);
const manifest = JSON.parse(manifestText);
const initialText = await read(manifest.artifacts.initialExecution);
const initial = JSON.parse(initialText);
const sealedText = await read(manifest.sealedOptionMap.path);
const sealed = JSON.parse(sealedText);

assert(initial.results.length === 6, "initial execution must contain exactly six context results");
const allInitialValid = initial.results.every((item) => item.status === "completed-valid");
const comparisons = [];
const adjudicationContexts = [];
const adjudicationMap = {
  schemaVersion: "3.7.3-adjudication-option-map",
  status: "sealed-from-deterministic-disagreement-extraction",
  debates: {}
};
let globalDisputeIndex = 0;

if (allInitialValid) for (const debateNumber of V373_DEBATES) {
  const packets = {};
  const outputs = {};
  for (const reviewerPass of ["pass-a", "pass-b"]) {
    const context = manifest.initialContexts[reviewerPass][debateNumber];
    packets[reviewerPass] = await readJson(root, context.packet);
    const schema = await readJson(root, context.schema);
    outputs[reviewerPass] = await readJson(root, context.output);
    validateV373Output(outputs[reviewerPass], packets[reviewerPass], schema);
  }
  const packetAById = new Map(packets["pass-a"].bundles.map((item) => [item.bundleId, item]));
  const passBById = new Map(outputs["pass-b"].bundles.map((item) => [item.bundleId, item]));
  const disputed = [];
  for (const choiceA of outputs["pass-a"].bundles) {
    const choiceB = passBById.get(choiceA.bundleId);
    assert(choiceB, `${choiceA.bundleId}: pass-b bundle missing`);
    const optionA = mappedOption(sealed, "pass-a", choiceA.bundleId, choiceA.optionId);
    const optionB = mappedOption(sealed, "pass-b", choiceB.bundleId, choiceB.optionId);
    const agreed = canonicalJson(optionA.semanticTuple) === canonicalJson(optionB.semanticTuple);
    const comparison = {
      bundleId: choiceA.bundleId,
      debateNumber,
      passA: optionA.semanticTuple,
      passB: optionB.semanticTuple,
      agreed
    };
    comparisons.push(comparison);
    if (!agreed) disputed.push({ comparison, source: packetAById.get(choiceA.bundleId) });
  }
  if (disputed.length) {
    const bundles = disputed.map(({ source }) => {
      assert(source, "pass-a source bundle missing");
      const sourceValues = new Map(source.candidates.map((item) => [item.optionId, item.values]));
      const mapped = sealed.passes["pass-a"][source.bundleId].options.map((item) => ({
        semanticTuple: item.semanticTuple,
        matchesRetiredExpected: item.matchesRetiredExpected,
        values: sourceValues.get(item.optionId)
      }));
      assert(mapped.every((item) => item.values), `${source.bundleId}: independent candidate values missing`);
      const shift = (globalDisputeIndex + 2) % mapped.length;
      globalDisputeIndex += 1;
      const ordered = [...mapped.slice(shift), ...mapped.slice(0, shift)];
      const candidates = ordered.map((item, index) => ({ optionId: `option-${index + 1}`, values: item.values }));
      if (!adjudicationMap.debates[debateNumber]) adjudicationMap.debates[debateNumber] = { bundles: [] };
      adjudicationMap.debates[debateNumber].bundles.push({
        bundleId: source.bundleId,
        options: ordered.map((item, index) => ({
          optionId: `option-${index + 1}`,
          semanticTuple: item.semanticTuple,
          matchesRetiredExpected: item.matchesRetiredExpected
        }))
      });
      return { ...source, candidates };
    });
    const packet = {
      schemaVersion: "3.7.3-atomic-bundle-packet",
      debateNumber,
      reviewerPass: "pass-c",
      allSpeakerAttributionConfidenceHigh: packets["pass-a"].allSpeakerAttributionConfidenceHigh,
      bundles
    };
    const schema = makeV373Schema(packet);
    const packetPath = `${manifest.root}/packets/pass-c/debate-${debateNumber}.json`;
    const schemaPath = `${manifest.root}/schemas/pass-c/debate-${debateNumber}.schema.json`;
    const outputPath = `${manifest.root}/outputs/pass-c/debate-${debateNumber}.json`;
    adjudicationContexts.push({ debateNumber, reviewerPass: "pass-c", packet: packetPath, schema: schemaPath, output: outputPath, bundleCount: bundles.length });
    if (shouldWrite) {
      await mkdir(path.dirname(path.resolve(root, packetPath)), { recursive: true });
      await mkdir(path.dirname(path.resolve(root, schemaPath)), { recursive: true });
      await writeFile(path.resolve(root, packetPath), `${JSON.stringify(packet, null, 2)}\n`);
      await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(schema, null, 2)}\n`);
    }
  }
}

const report = {
  schemaVersion: "3.7.3-initial-atomic-disagreements",
  createdAt: initial.completedAt,
  status: allInitialValid ? "initial-passes-mapped" : "initial-structural-failure",
  sources: {
    executionManifestSha256: sha256(manifestText),
    initialExecutionSha256: sha256(initialText),
    sealedOptionMapSha256: sha256(sealedText)
  },
  allInitialValid,
  counts: {
    bundles: comparisons.length,
    agreements: comparisons.filter((item) => item.agreed).length,
    disagreements: comparisons.filter((item) => !item.agreed).length,
    adjudicationContexts: adjudicationContexts.length
  },
  comparisons,
  adjudicationContexts,
  broaderModelBatchAuthorized: false,
  heldOutAccessAuthorized: false,
  numericalScoringAuthorized: false,
  assessmentProseAuthorized: false,
  productionMutationAuthorized: false
};
const reportText = `${JSON.stringify(report, null, 2)}\n`;
const mapText = `${JSON.stringify(adjudicationMap, null, 2)}\n`;
if (shouldWrite) {
  await writeFile(path.resolve(root, manifest.artifacts.initialDisagreements), reportText);
  await writeFile(path.resolve(root, manifest.artifacts.adjudicationOptionMap), mapText);
}
console.log(reportText);
