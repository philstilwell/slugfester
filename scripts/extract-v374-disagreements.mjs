#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { V374_DEBATES, V374_MANIFEST, assert, compareV374Outputs, makeV374AdjudicationArtifacts, validateV374Output } from "./lib/v374-disjoint-atomic.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const manifestText = await read(V374_MANIFEST);
const manifest = JSON.parse(manifestText);
const initialText = await read(manifest.artifacts.initialExecution);
const initial = JSON.parse(initialText);
const mappingText = await read(manifest.sealedOptionMap.path);
const mapping = JSON.parse(mappingText);
assert(initial.results.length === 6, "initial result coverage invalid");
const allInitialValid = initial.results.every((item) => item.status === "completed-valid");
const comparisons = [];
const adjudicationContexts = [];
const adjudicationMap = { schemaVersion: "3.7.4-adjudication-option-map", status: "sealed-from-deterministic-disagreement-extraction", debates: {} };

if (allInitialValid) for (let debateIndex = 0; debateIndex < V374_DEBATES.length; debateIndex += 1) {
  const debateNumber = V374_DEBATES[debateIndex];
  const contextA = manifest.initialContexts["pass-a"][debateNumber];
  const contextB = manifest.initialContexts["pass-b"][debateNumber];
  const packetA = await readJson(contextA.packet);
  const packetB = await readJson(contextB.packet);
  const schemaA = await readJson(contextA.schema);
  const schemaB = await readJson(contextB.schema);
  const outputA = await readJson(contextA.output);
  const outputB = await readJson(contextB.output);
  validateV374Output(outputA, packetA, schemaA);
  validateV374Output(outputB, packetB, schemaB);
  const debateComparisons = compareV374Outputs(mapping, outputA, outputB);
  comparisons.push(...debateComparisons);
  if (debateComparisons.some((item) => !item.agreed)) {
    const artifacts = makeV374AdjudicationArtifacts(debateNumber, packetA, debateComparisons, mapping, debateIndex * 5);
    const packetPath = `${manifest.root}/packets/pass-c/debate-${debateNumber}.json`;
    const schemaPath = `${manifest.root}/schemas/pass-c/debate-${debateNumber}.schema.json`;
    const outputPath = `${manifest.root}/outputs/pass-c/debate-${debateNumber}.json`;
    adjudicationMap.debates[debateNumber] = { bundles: artifacts.map.bundles };
    adjudicationContexts.push({ debateNumber, reviewerPass: "pass-c", packet: packetPath, schema: schemaPath, output: outputPath, bundleCount: artifacts.packet.bundles.length });
    if (shouldWrite) {
      await mkdir(path.dirname(path.resolve(root, packetPath)), { recursive: true });
      await mkdir(path.dirname(path.resolve(root, schemaPath)), { recursive: true });
      await writeFile(path.resolve(root, packetPath), `${JSON.stringify(artifacts.packet, null, 2)}\n`);
      await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(artifacts.schema, null, 2)}\n`);
    }
  }
}

const report = {
  schemaVersion: "3.7.4-initial-atomic-disagreements",
  createdAt: initial.completedAt,
  status: allInitialValid ? "initial-passes-mapped" : "initial-structural-failure",
  sources: { gateManifestSha256: sha256(manifestText), initialExecutionSha256: sha256(initialText), sealedOptionMapSha256: sha256(mappingText) },
  allInitialValid,
  counts: { bundles: comparisons.length, agreements: comparisons.filter((item) => item.agreed).length, disagreements: comparisons.filter((item) => !item.agreed).length, adjudicationContexts: adjudicationContexts.length },
  comparisons,
  adjudicationContexts,
  largerModelBatchAuthorized: false,
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
