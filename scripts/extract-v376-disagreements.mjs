#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { V376_DEBATES, assert, validateV376Output } from "./lib/v376-burden-contact.mjs";
import { V376_EXECUTION_MANIFEST, compareV376Outputs, makeV376AdjudicationArtifacts, readJson } from "./lib/v376-execution.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(V376_EXECUTION_MANIFEST), manifest = JSON.parse(manifestText), initialText = await read(manifest.artifacts.initialExecution), initial = JSON.parse(initialText), sealedText = await read(manifest.sealedOptionMap.path), sealed = JSON.parse(sealedText);
assert(initial.results.length === 6, "initial result coverage invalid");
const allInitialValid = initial.results.every((item) => item.status === "completed-valid"), comparisons = [], adjudicationContexts = [];
const adjudicationMap = { schemaVersion: "3.7.6-adjudication-option-map", status: "sealed-from-deterministic-disagreement-extraction", debates: {} };

if (allInitialValid) for (let debateIndex = 0; debateIndex < V376_DEBATES.length; debateIndex += 1) {
  const debateNumber = V376_DEBATES[debateIndex], contextA = manifest.initialContexts["pass-a"][debateNumber], contextB = manifest.initialContexts["pass-b"][debateNumber];
  const [packetA, packetB, schemaA, schemaB, outputA, outputB] = await Promise.all([contextA.packet, contextB.packet, contextA.schema, contextB.schema, contextA.output, contextB.output].map((file) => readJson(root, file)));
  validateV376Output(outputA, packetA, schemaA); validateV376Output(outputB, packetB, schemaB);
  const debateComparisons = compareV376Outputs(sealed, outputA, outputB);
  comparisons.push(...debateComparisons);
  if (debateComparisons.some((item) => !item.agreed)) {
    const artifacts = makeV376AdjudicationArtifacts(debateNumber, packetA, debateComparisons, sealed, debateIndex * 5), packetPath = `${manifest.root}/packets/pass-c/debate-${debateNumber}.json`, schemaPath = `${manifest.root}/schemas/pass-c/debate-${debateNumber}.schema.json`, outputPath = `${manifest.root}/outputs/pass-c/debate-${debateNumber}.json`;
    adjudicationMap.debates[debateNumber] = { bundles: artifacts.map.bundles };
    adjudicationContexts.push({ debateNumber, reviewerPass: "pass-c", packet: packetPath, schema: schemaPath, output: outputPath, bundleCount: artifacts.packet.bundles.length });
    if (shouldWrite) {
      await mkdir(path.dirname(path.resolve(root, packetPath)), { recursive: true }); await mkdir(path.dirname(path.resolve(root, schemaPath)), { recursive: true });
      await writeFile(path.resolve(root, packetPath), `${JSON.stringify(artifacts.packet, null, 2)}\n`); await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(artifacts.schema, null, 2)}\n`);
    }
  }
}
const report = { schemaVersion: "3.7.6-initial-composite-disagreements", createdAt: initial.completedAt, status: allInitialValid ? "initial-passes-mapped" : "initial-structural-failure", sources: { executionManifestSha256: sha256(manifestText), initialExecutionSha256: sha256(initialText), sealedOptionMapSha256: sha256(sealedText) }, allInitialValid, counts: { compositeCases: comparisons.length, agreements: comparisons.filter((item) => item.agreed).length, disagreements: comparisons.filter((item) => !item.agreed).length, adjudicationContexts: adjudicationContexts.length }, comparisons, adjudicationContexts, caseDisjointRepeatabilityPreregistrationAuthorized: false, largerModelBatchAuthorized: false, heldOutAccessAuthorized: false, numericalScoringAuthorized: false, assessmentProseAuthorized: false, productionMutationAuthorized: false };
const reportText = `${JSON.stringify(report, null, 2)}\n`, mapText = `${JSON.stringify(adjudicationMap, null, 2)}\n`;
if (shouldWrite) { await writeFile(path.resolve(root, manifest.artifacts.initialDisagreements), reportText); await writeFile(path.resolve(root, manifest.artifacts.adjudicationOptionMap), mapText); }
console.log(reportText);
