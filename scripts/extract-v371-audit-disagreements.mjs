#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { assert, canonicalJson, makeAuditSchema, semanticOptionMap, validateAuditOutput, V371_DEBATES, V371_INITIAL_PASSES, V371_ROOT } from "./lib/v371-gold-audit.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${V371_ROOT}/gate-manifest.json`);
const manifest = JSON.parse(manifestText);
const executionText = await read(manifest.initialExecutionPath);
const execution = JSON.parse(executionText);
const mappingText = await read(manifest.sealedOptionMap.path);
const mapping = JSON.parse(mappingText);

assert(execution.results.length === 6, "initial execution coverage invalid");
const allInitialValid = execution.results.every((item) => item.status === "completed-valid");
const comparisons = [];
const adjudicationContexts = [];
const adjudicationMap = { schemaVersion: "3.7.1-adjudication-option-map", status: "sealed-from-adjudication-contexts", debates: {} };

if (allInitialValid) for (const debateNumber of V371_DEBATES) {
  const packets = {}, outputs = {}, semanticMaps = {};
  for (const reviewerPass of V371_INITIAL_PASSES) {
    packets[reviewerPass] = JSON.parse(await read(manifest.initialContexts[reviewerPass][debateNumber].packet));
    const schema = JSON.parse(await read(manifest.initialContexts[reviewerPass][debateNumber].schema));
    outputs[reviewerPass] = JSON.parse(await read(manifest.outputs.initial[reviewerPass][debateNumber]));
    validateAuditOutput(outputs[reviewerPass], packets[reviewerPass], schema);
    semanticMaps[reviewerPass] = semanticOptionMap(mapping, debateNumber, reviewerPass);
  }
  const packetAById = new Map(packets["pass-a"].decisions.map((item) => [item.auditId, item]));
  const passBById = new Map(outputs["pass-b"].decisions.map((item) => [item.auditId, item]));
  const disputed = [];
  for (const decisionA of outputs["pass-a"].decisions) {
    const decisionB = passBById.get(decisionA.auditId);
    assert(decisionB, `${decisionA.auditId}: pass-b decision missing`);
    const valueA = semanticMaps["pass-a"].get(`${decisionA.auditId}::${decisionA.optionId}`);
    const valueB = semanticMaps["pass-b"].get(`${decisionB.auditId}::${decisionB.optionId}`);
    const agreed = canonicalJson(valueA) === canonicalJson(valueB);
    const comparison = { auditId: decisionA.auditId, debateNumber, passA: valueA, passB: valueB, agreed };
    comparisons.push(comparison);
    if (!agreed) disputed.push({ comparison, source: packetAById.get(decisionA.auditId) });
  }
  if (disputed.length) {
    const mappingById = new Map(mapping.passes["pass-a"][debateNumber].decisions.map((item) => [item.auditId, item]));
    const decisions = disputed.map(({ source }, index) => {
      const original = mappingById.get(source.auditId);
      const semanticValues = original.options.map((item) => item.semanticValue);
      const shift = (Number(source.auditId.slice(6)) + index + 1) % semanticValues.length;
      const ordered = [...semanticValues.slice(shift), ...semanticValues.slice(0, shift)];
      return { ...source, candidates: ordered.map((value, optionIndex) => ({ optionId: `option-${optionIndex + 1}`, value })) };
    });
    const packet = { schemaVersion: "3.7.1-audit-packet", debateNumber, reviewerPass: "pass-c", lane: packets["pass-a"].lane, allSpeakerAttributionConfidenceHigh: true, decisions };
    const schema = makeAuditSchema(packet);
    const packetPath = `${V371_ROOT}/packets/pass-c/debate-${debateNumber}.json`;
    const schemaPath = `${V371_ROOT}/schemas/pass-c/debate-${debateNumber}.schema.json`;
    const outputPath = `${V371_ROOT}/outputs/pass-c/debate-${debateNumber}.json`;
    adjudicationMap.debates[debateNumber] = {
      decisions: decisions.map((decision) => ({ auditId: decision.auditId, options: decision.candidates.map((candidate) => ({ optionId: candidate.optionId, semanticValue: candidate.value })) }))
    };
    adjudicationContexts.push({ debateNumber, packet: packetPath, schema: schemaPath, output: outputPath, decisionCount: decisions.length });
    if (shouldWrite) {
      await mkdir(path.dirname(path.resolve(root, packetPath)), { recursive: true });
      await mkdir(path.dirname(path.resolve(root, schemaPath)), { recursive: true });
      await writeFile(path.resolve(root, packetPath), `${JSON.stringify(packet, null, 2)}\n`);
      await writeFile(path.resolve(root, schemaPath), `${JSON.stringify(schema, null, 2)}\n`);
    }
  }
}

const report = {
  schemaVersion: "3.7.1-initial-audit-disagreements",
  createdAt: execution.completedAt,
  status: allInitialValid ? "initial-passes-mapped" : "initial-structural-failure",
  sources: { manifestSha256: sha256(manifestText), initialExecutionSha256: sha256(executionText), sealedOptionMapSha256: sha256(mappingText) },
  allInitialValid,
  counts: { assertions: comparisons.length, agreements: comparisons.filter((item) => item.agreed).length, disagreements: comparisons.filter((item) => !item.agreed).length, adjudicationContexts: adjudicationContexts.length },
  comparisons,
  adjudicationContexts,
  modelBatchAuthorized: false,
  heldOutAccessAuthorized: false,
  numericalScoringAuthorized: false,
  assessmentProseAuthorized: false,
  productionMutationAuthorized: false
};
const reportText = `${JSON.stringify(report, null, 2)}\n`;
const mapText = `${JSON.stringify(adjudicationMap, null, 2)}\n`;
if (shouldWrite) {
  await writeFile(path.resolve(root, manifest.initialDisagreementPath), reportText);
  await writeFile(path.resolve(root, manifest.adjudicationOptionMapPath), mapText);
}
console.log(reportText);
