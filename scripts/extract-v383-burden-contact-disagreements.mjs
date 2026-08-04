#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { V383_DEBATES, V383_ROOT, assert, validateV383Output } from "./lib/v383-burden-contact.mjs";
import { V383_EXECUTION_MANIFEST, compareV383Outputs, makeV383AdjudicationArtifacts, readV383Json } from "./lib/v383-execution.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(V383_EXECUTION_MANIFEST);
const manifest = JSON.parse(manifestText);
const initialText = await read(manifest.artifacts.initialExecution);
const initial = JSON.parse(initialText);
const sealedText = await read(manifest.packetConstruction.sealedOptionMap);
const sealed = JSON.parse(sealedText);
assert(initial.results.length === 6, "initial result coverage invalid");
const allInitialValid = initial.results.every((item) => item.status === "completed-valid");
const comparisons = [];
const adjudicationContexts = [];
const adjudicationMap = { schemaVersion: "3.8.3-heldout-adjudication-option-map-set", status: "sealed-from-deterministic-disagreement-extraction", debates: {} };

if (allInitialValid) {
  for (let debateIndex = 0; debateIndex < V383_DEBATES.length; debateIndex += 1) {
    const debateNumber = V383_DEBATES[debateIndex];
    const contextA = manifest.contexts["pass-a"][debateNumber];
    const contextB = manifest.contexts["pass-b"][debateNumber];
    const [packetA, packetB, schemaA, schemaB, outputA, outputB] = await Promise.all([contextA.packet, contextB.packet, contextA.schema, contextB.schema, contextA.output, contextB.output].map((file) => readV383Json(root, file)));
    validateV383Output(outputA, packetA, schemaA);
    validateV383Output(outputB, packetB, schemaB);
    const debateComparisons = compareV383Outputs(sealed, outputA, outputB);
    comparisons.push(...debateComparisons);
    if (debateComparisons.some((item) => !item.agreed)) {
      const artifacts = makeV383AdjudicationArtifacts(debateNumber, packetA, debateComparisons, debateIndex);
      const packetPath = `${V383_ROOT}/adjudication/packets/debate-${debateNumber}.json`;
      const schemaPath = `${V383_ROOT}/adjudication/schemas/debate-${debateNumber}.schema.json`;
      const outputPath = `${V383_ROOT}/adjudication/outputs/debate-${debateNumber}.json`;
      adjudicationMap.debates[debateNumber] = artifacts.map;
      adjudicationContexts.push({ debateNumber, reviewerPass: "pass-c", packet: packetPath, schema: schemaPath, transcript: contextA.transcript, events: contextA.events, output: outputPath, itemCount: artifacts.packet.bundles.length });
      if (shouldWrite) {
        await mkdir(path.dirname(path.resolve(root, packetPath)), { recursive: true });
        await mkdir(path.dirname(path.resolve(root, schemaPath)), { recursive: true });
        await writeFile(path.resolve(root, packetPath), `${JSON.stringify(artifacts.packet, null, 2)}\n`);
        await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(artifacts.schema, null, 2)}\n`);
      }
    }
  }
}

const report = {
  schemaVersion: "3.8.3-heldout-initial-composite-disagreements",
  createdAt: initial.completedAt,
  status: allInitialValid ? "initial-passes-mapped" : "initial-structural-failure",
  sources: { executionManifestSha256: sha256(manifestText), initialExecutionSha256: sha256(initialText), sealedOptionMapSha256: sha256(sealedText) },
  allInitialValid,
  counts: { compositeCases: comparisons.length, agreements: comparisons.filter((item) => item.agreed).length, disagreements: comparisons.filter((item) => !item.agreed).length, adjudicationContexts: adjudicationContexts.length },
  comparisons,
  adjudicationContexts,
  numericalScoringAuthorized: false,
  assessmentProseAuthorized: false,
  productionMutationAuthorized: false
};
if (shouldWrite) {
  await writeFile(path.resolve(root, manifest.artifacts.initialDisagreements), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.resolve(root, manifest.artifacts.adjudicationOptionMap), `${JSON.stringify(adjudicationMap, null, 2)}\n`);
}
console.log(JSON.stringify({ status: report.status, ...report.counts }, null, 2));
