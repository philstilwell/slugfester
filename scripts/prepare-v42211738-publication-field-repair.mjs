#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { validateV42211736PublicationOutput } from "./lib/v42211736-hard-route-publication-integrity.mjs";
import { V42211737_ROOT } from "./lib/v42211737-hard-route-publication-normalization.mjs";
import { V42211738_OUTPUT_VERSION, V42211738_PROTOCOL_ID, V42211738_ROOT } from "./lib/v42211738-publication-field-repair.mjs";

const preparationPath = `${V42211738_ROOT}/preparation-manifest.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const wordCount = (value) => String(value ?? "").trim().split(/\s+/).filter(Boolean).length;
const exactObject = (properties) => ({ type: "object", additionalProperties: false, properties, required: Object.keys(properties) });
assertV4(!(await exists(preparationPath)), `${preparationPath} already exists`);
const [oldPreparation, oldExecution, oldAnalysis] = await Promise.all(["preparation-manifest.json", "model-execution.json", "analysis.json"].map((file) => readFile(path.resolve(`${V42211737_ROOT}/${file}`), "utf8").then(JSON.parse)));
assertV4(oldExecution.status === "hard-route-publication-gate-complete-with-failure" && oldExecution.contextsAttempted === 5 && oldExecution.validContexts === 3 && oldAnalysis.gate.validContexts === 3, "v17.37 repair source mismatch");

const contexts = [];
for (const debateNumber of ["153", "165"]) {
  const oldContext = oldPreparation.contexts.find((context) => context.debateNumber === debateNumber);
  const publicationPacket = JSON.parse(await readFile(path.resolve(oldContext.packet), "utf8"));
  const rawOutput = JSON.parse(await readFile(path.resolve(oldContext.rawOutput), "utf8"));
  let repairPacket, schema;
  if (debateNumber === "153") {
    const corrections = Object.entries(rawOutput.moveProse).filter(([, prose]) => wordCount(prose.critique) < 105 || wordCount(prose.critique) > 130).map(([moveId, prose]) => ({ moveId, originalCritique: prose.critique, originalWords: wordCount(prose.critique), move: publicationPacket.moves.find((move) => move.moveId === moveId) }));
    assertV4(corrections.length === 8 && corrections.every((item) => item.originalWords >= 131 && item.originalWords <= 135), "Debate 153 correction extraction mismatch");
    repairPacket = { schemaVersion: "4.2.21.17.38-publication-field-repair-packet", protocolId: V42211738_PROTOCOL_ID, debateNumber, debateId: oldContext.debateId, repairType: "critique-word-boundary", immutableBaseOutput: oldContext.output, publicationPacket: oldContext.packet, constraints: { labels: ["Strongest feature:", "Principal limitation:", "Live burden:", "Locked score:"], generationTargetWords: [112, 122], acceptanceWords: [105, 130], minimumCharacters: 880, terminalPunctuation: true, unexpectedCJKAndHangulRejected: true }, corrections };
    schema = exactObject({ schemaVersion: { type: "string", const: V42211738_OUTPUT_VERSION }, protocolId: { type: "string", const: V42211738_PROTOCOL_ID }, debateNumber: { type: "string", const: debateNumber }, assessmentModel: { type: "string", const: "5.6 Sol" }, completedAt: { type: "string", minLength: 10 }, correctedCritiques: exactObject(Object.fromEntries(corrections.map((item) => [item.moveId, { type: "string", minLength: 880 }]))) });
  } else {
    const current = rawOutput.representativeQuotes.con;
    const currentMove = publicationPacket.moves.find((move) => move.moveId === current.sourceMoveId);
    assertV4(currentMove && !currentMove.sourceExcerpt.includes(current.text), "Debate 165 quote defect mismatch");
    const eligibleSources = publicationPacket.moves.filter((move) => move.side === "con" && move.quoteEligible).map((move) => ({ moveId: move.moveId, sourceExcerpt: move.sourceExcerpt }));
    const diagnostic = structuredClone(rawOutput);
    diagnostic.representativeQuotes.con = { ...diagnostic.representativeQuotes.con, sourceMoveId: eligibleSources[0].moveId, text: eligibleSources[0].sourceExcerpt.split(/\s+/).slice(0, 6).join(" ") };
    assertV4(validateV42211736PublicationOutput(diagnostic, publicationPacket).status === "passed", "Debate 165 has a defect beyond con quote exactness");
    repairPacket = { schemaVersion: "4.2.21.17.38-publication-field-repair-packet", protocolId: V42211738_PROTOCOL_ID, debateNumber, debateId: oldContext.debateId, repairType: "representative-quote-exactness", immutableBaseOutput: oldContext.rawOutput, publicationPacket: oldContext.packet, constraints: { side: "con", generationTargetWords: [6, 14], acceptanceWords: [3, 18], exactContiguousSourceSubstring: true }, currentInvalidQuote: current, eligibleSources };
    schema = exactObject({ schemaVersion: { type: "string", const: V42211738_OUTPUT_VERSION }, protocolId: { type: "string", const: V42211738_PROTOCOL_ID }, debateNumber: { type: "string", const: debateNumber }, assessmentModel: { type: "string", const: "5.6 Sol" }, completedAt: { type: "string", minLength: 10 }, correctedConQuote: exactObject({ sourceMoveId: { type: "string", enum: eligibleSources.map((item) => item.moveId) }, text: { type: "string", minLength: 3 } }) });
  }
  const packetPath = `${V42211738_ROOT}/packets/debate-${debateNumber}.json`, schemaPath = `${V42211738_ROOT}/schemas/debate-${debateNumber}.schema.json`, repairOutput = `${V42211738_ROOT}/repair-outputs/debate-${debateNumber}.json`;
  await mkdir(path.resolve(path.dirname(packetPath)), { recursive: true });
  await mkdir(path.resolve(path.dirname(schemaPath)), { recursive: true });
  const packetDocument = `${JSON.stringify(repairPacket, null, 2)}\n`, schemaDocument = `${JSON.stringify(schema, null, 2)}\n`;
  await writeFile(path.resolve(packetPath), packetDocument); await writeFile(path.resolve(schemaPath), schemaDocument);
  contexts.push({ debateNumber, debateId: oldContext.debateId, repairType: repairPacket.repairType, packet: packetPath, schema: schemaPath, repairOutput, baseOutput: repairPacket.immutableBaseOutput, publicationPacket: oldContext.packet, finalOutput: `${V42211738_ROOT}/outputs/debate-${debateNumber}.json`, correctedFields: repairPacket.repairType === "critique-word-boundary" ? repairPacket.corrections.length : 1, copiedInputBytes: Buffer.byteLength(packetDocument) + Buffer.byteLength(schemaDocument) + Buffer.byteLength(await readFile(path.resolve("docs/assessment-workflow-v4.2.21.17.38.md"))) });
}
const acceptedDebates = ["51", "63", "90"].map((debateNumber) => { const context = oldPreparation.contexts.find((item) => item.debateNumber === debateNumber); return { debateNumber, sourceOutput: context.output, publicationPacket: context.packet, finalOutput: `${V42211738_ROOT}/outputs/debate-${debateNumber}.json` }; });
const preparation = { schemaVersion: "4.2.21.17.38-publication-field-repair-preparation", protocolId: V42211738_PROTOCOL_ID, status: "prepared-two-isolated-publication-field-repairs", preparedAt: new Date().toISOString(), calibrationOnly: true, AIOnly: true, model: oldPreparation.model, inputs: { workflow: "docs/assessment-workflow-v4.2.21.17.38.md", v17_37Preparation: `${V42211737_ROOT}/preparation-manifest.json`, v17_37Execution: `${V42211737_ROOT}/model-execution.json`, v17_37Analysis: `${V42211737_ROOT}/analysis.json` }, contexts, acceptedDebates, policy: { contexts: 2, attemptsPerContext: 1, retries: 0, furtherCorrectionContexts: 0, maximumConcurrency: 2, timeoutMsPerContext: 480000, maximumMinutesPerContext: 6, maximumMeanMinutes: 5, modelAuthoredScores: 0 }, totals: { modelContexts: 2, correctedFields: contexts.reduce((sum, context) => sum + context.correctedFields, 0), maximumCopiedInputBytes: Math.max(...contexts.map((context) => context.copiedInputBytes)), modelAuthoredScores: 0, meteredApiCostUsd: 0, transcriptionCostUsdThisStage: 0 }, authorization: { executionManifest: true, modelExecution: false, merge: false, renderingVerification: false, productionMutation: false, all195Debates: false } };
await mkdir(path.resolve(V42211738_ROOT), { recursive: true }); await writeFile(path.resolve(preparationPath), `${JSON.stringify(preparation, null, 2)}\n`);
console.log(JSON.stringify({ status: preparation.status, contexts: contexts.map((context) => ({ debateNumber: context.debateNumber, repairType: context.repairType, correctedFields: context.correctedFields })), totalCorrectedFields: preparation.totals.correctedFields, maximumCopiedInputBytes: preparation.totals.maximumCopiedInputBytes, modelAuthoredScores: 0 }, null, 2));

