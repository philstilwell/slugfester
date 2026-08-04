#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V33_MODELS, assert, canonicalJson, sameSemantic, semanticValue, sha256, validateBlindAdjudication
} from "./lib/v33-blind-bundles.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.3/retired-three-debate-test";
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`), manifest = JSON.parse(manifestText);
const summaries = [];
for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId];
  const [packetText, sealText] = await Promise.all([read(outputs.blindPacket), read(outputs.candidateSeal)]);
  const packet = JSON.parse(packetText), seal = JSON.parse(sealText);
  const sealById = new Map(seal.fields.map((item) => [item.decisionId, item]));
  for (const modelKey of Object.keys(V33_MODELS)) {
    const adjudicationText = await read(outputs.adjudications[modelKey]);
    const adjudication = JSON.parse(adjudicationText);
    const decisions = validateBlindAdjudication(adjudication, packet, modelKey);
    let conflictMappedX = 0, conflictMappedY = 0, sharedRetains = 0, sharedOverrides = 0, unmappedFields = 0;
    const mappings = decisions.map((decision) => {
      const sealed = sealById.get(decision.decisionId);
      assert(sealed, `${decision.decisionId}: missing sealed candidates`);
      const semanticJson = canonicalJson(semanticValue(decision.fieldPath, decision.compound));
      const matchesX = semanticJson === sealed.X.semanticJson, matchesY = semanticJson === sealed.Y.semanticJson;
      let disposition;
      if (sealed.rawAgreement) {
        if (matchesX && matchesY) { disposition = "shared-retain"; sharedRetains += 1; }
        else { disposition = "shared-override"; sharedOverrides += 1; }
      } else if (matchesX !== matchesY) {
        disposition = matchesX ? "mapped-X" : "mapped-Y";
        if (matchesX) conflictMappedX += 1; else conflictMappedY += 1;
      } else {
        disposition = "unmapped";
        unmappedFields += 1;
      }
      return {
        decisionId: decision.decisionId, caseId: decision.caseId, bundleId: decision.bundleId, fieldPath: decision.fieldPath,
        blindSemanticJson: semanticJson, blindCompoundJson: canonicalJson(decision.compound), disposition,
        sealedMatch: disposition === "mapped-X" ? "X" : disposition === "mapped-Y" ? "Y" : null,
        rawAgreement: sealed.rawAgreement, candidateProvenanceRevealedOnlyAfterContext: true
      };
    });
    const mapping = {
      schemaVersion: "3.3-post-context-candidate-mapping", workflowVersion: manifest.workflowVersion, rubricVersion: manifest.rubricVersion,
      model: V33_MODELS[modelKey], modelKey, debateId: debate.debateId, debateNumber: debate.debateNumber,
      mappedAt: new Date().toISOString(), candidateSealWasModelVisible: false,
      sources: { manifestSha256: sha256(manifestText), packetSha256: sha256(packetText), candidateSealSha256: sha256(sealText), adjudicationSha256: sha256(adjudicationText) },
      mappings,
      audit: { decisionCount: mappings.length, conflictMappedX, conflictMappedY, sharedRetains, sharedOverrides, unmappedFields, modelSchemaOrInvariantRetries: 0 }
    };
    const outputText = `${JSON.stringify(mapping, null, 2)}\n`;
    if (shouldWrite) {
      await mkdir(path.dirname(path.resolve(root, outputs.mappingResults[modelKey])), { recursive: true });
      await writeFile(path.resolve(root, outputs.mappingResults[modelKey]), outputText);
    }
    summaries.push({ debateId: debate.debateId, modelKey, ...mapping.audit, outputSha256: sha256(outputText) });
  }
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", variants: summaries }, null, 2));

