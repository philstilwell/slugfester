#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V42211732_ROOT, compileV42211732PublicationPreview } from "./lib/v42211732-hard-route-publication.mjs";

const preparation = JSON.parse(await readFile(path.resolve(`${V42211732_ROOT}/preparation-manifest.json`), "utf8"));
const execution = JSON.parse(await readFile(path.resolve(`${V42211732_ROOT}/model-execution.json`), "utf8"));
assertV4(execution.status === "five-hard-route-publication-contexts-passed" && execution.validContexts === 5 && execution.retries === 0 && execution.correctionContexts === 0, "accepted publication execution required before compilation");
const compiled = [];
for (const context of preparation.contexts) {
  await access(path.resolve(context.compiled)).then(() => { throw new Error(`${context.compiled} already exists`); }, () => true);
  const [output, packet] = await Promise.all([context.output, context.packet].map((file) => readFile(path.resolve(file), "utf8").then(JSON.parse)));
  const preview = compileV42211732PublicationPreview(output, packet);
  await mkdir(path.dirname(path.resolve(context.compiled)), { recursive: true });
  await writeFile(path.resolve(context.compiled), `${JSON.stringify(preview, null, 2)}\n`);
  compiled.push({ debateNumber: context.debateNumber, output: context.compiled, moves: packet.moves.length, sections: packet.sections.length, overallScores: preview.score, aiExtensionIncluded: Boolean(preview.logicalExtension), modelAuthoredScores: 0 });
}
const audit = { schemaVersion: "4.2.21.17.32-hard-route-publication-compilation-audit", protocolId: preparation.protocolId, status: "passed-five-hard-route-publication-compilations", calibrationOnly: true, productionDebateDataMutated: false, rankingsMutated: false, modelAuthoredScores: 0, outputs: compiled, authorization: { renderingVerification: true, readinessPromotion: false, productionMutation: false, all195Debates: false } };
await writeFile(path.resolve(`${V42211732_ROOT}/compilation-audit.json`), `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify(audit, null, 2));
