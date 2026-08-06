#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { makeV422110PrimarySchema, V422110_MODEL, V422110_PROTOCOL_ID, V422110_ROOT } from "./lib/v422110-structural-partition-primary.mjs";

const shouldWrite = process.argv.includes("--write");
const preparationPath = "docs/calibration/v4.2.21.9/generalized-partition/preparation-manifest.json";
const workflowPath = "docs/assessment-workflow-v4.2.21.10.md";
const manualPath = `${V422110_ROOT}/manual.md`;
const schemaPath = `${V422110_ROOT}/primary-template.schema.json`;
const preparation = JSON.parse(await readFile(preparationPath, "utf8"));
assertV4(preparation.status === "three-partition-contexts-prepared-structural-primary-design-required" && preparation.authorization.candidateGroundedStructuralPrimaryDesign, "v4.2.21.9 structural primary design authorization unavailable");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceFiles = [preparationPath, workflowPath, manualPath, "scripts/lib/v422110-structural-partition-primary.mjs", "scripts/test-v422110-structural-partition-primary.mjs", "scripts/preregister-v422110-structural-partition-primary.mjs"];
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(file));
const manifest = {
  schemaVersion: "4.2.21.10-structural-partition-primary-design",
  protocolId: V422110_PROTOCOL_ID,
  status: shouldWrite ? "structural-partition-primary-design-frozen-discovery-manifest-authorized" : "preview",
  calibrationOnly: true,
  AIOnly: true,
  model: { label: V422110_MODEL.label, slug: V422110_MODEL.slug, reasoningEffort: V422110_MODEL.primaryReasoningEffort, authentication: "ChatGPT subscription", meteredApiCostUsdMaximum: 0 },
  structure: { sectionsMinimum: 4, sectionsMaximum: 6, movesPerSidePerSectionMinimum: 1, movesPerSidePerSectionMaximum: 2, totalMovesMinimum: 8, totalMovesMaximum: 24, sectionWeightsTotal: 100, sideCandidateEnumsLockedPerDebate: true, duplicateCandidateSelectionHardFailure: true },
  repositoryOwnedFields: ["sectionId", "side", "speaker", "moveKind", "sourceSpan", "attributionConfidence", "evidenceExcerpt", "globalChronology"],
  validation: { unchangedV4220ValidatorReused: true, futureTargetHardFailure: true, sameSideTargetHardFailure: true, automaticTargetRepair: false, sourceSpanEvidenceRenderedDeterministically: true, completeTranscriptReviewIsDistributedProcessClaim: true },
  inputs: { partitionPreparation: preparationPath, workflow: workflowPath, manual: manualPath, primarySchemaTemplate: schemaPath },
  sourceHashes,
  totals: { modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 },
  authorization: { discoveryExecutionManifest: true, discoveryModelExecution: false, primaryPacketPreparation: false, primaryModelExecution: false, passBModelExecution: false, audioExecution: false, adjudicationModelExecution: false, scoreDerivation: false, publicationFinalization: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) {
  await mkdir(V422110_ROOT, { recursive: true });
  await writeFile(schemaPath, `${JSON.stringify(makeV422110PrimarySchema(), null, 2)}\n`);
  await writeFile(`${V422110_ROOT}/design-manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({ status: manifest.status, structure: manifest.structure, discoveryExecutionManifestAuthorized: manifest.authorization.discoveryExecutionManifest, modelContextsExecuted: 0, audioCalls: 0, scoresDerived: 0, meteredApiCostUsd: 0 }, null, 2));
