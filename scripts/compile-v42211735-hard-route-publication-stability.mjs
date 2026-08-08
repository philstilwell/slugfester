#!/usr/bin/env node

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { compileV42211732PublicationPreview } from "./lib/v42211732-hard-route-publication.mjs";
import { V42211735_ROOT } from "./lib/v42211735-hard-route-publication-stability.mjs";

const [preparation, execution, analysis] = await Promise.all(["preparation-manifest.json", "model-execution.json", "analysis.json"].map((file) => readFile(path.resolve(`${V42211735_ROOT}/${file}`), "utf8").then(JSON.parse)));
assertV4(execution.status === "five-hard-route-publication-contexts-passed" && execution.validContexts === 5 && execution.retries === 0 && execution.correctionContexts === 0, "accepted publication execution required before compilation");
assertV4(analysis.status === "hard-route-publication-model-gate-passed" && analysis.authorization.deterministicCompilation, "accepted publication analysis required before compilation");
const auditPath = `${V42211735_ROOT}/compilation-audit.json`;
await access(path.resolve(auditPath)).then(() => { throw new Error(`${auditPath} already exists`); }, () => true);
const compiled = [];
for (const context of preparation.contexts) {
  await access(path.resolve(context.compiled)).then(() => { throw new Error(`${context.compiled} already exists`); }, () => true);
  const [output, packet] = await Promise.all([context.output, context.packet].map((file) => readFile(path.resolve(file), "utf8").then(JSON.parse)));
  const preview = compileV42211732PublicationPreview(output, packet);
  await mkdir(path.dirname(path.resolve(context.compiled)), { recursive: true });
  await writeFile(path.resolve(context.compiled), `${JSON.stringify(preview, null, 2)}\n`);
  compiled.push({ debateNumber: context.debateNumber, output: context.compiled, moves: packet.moves.length, sections: packet.sections.length, overallScores: preview.score, aiExtensionIncluded: Boolean(preview.logicalExtension), byline: preview.assessmentModel && preview.assessmentRubric ? `Assessments made by ${preview.assessmentModel}. — Rubric: ${preview.assessmentRubric}.` : null, modelAuthoredScores: 0 });
}
const audit = { schemaVersion: "4.2.21.17.35-hard-route-publication-compilation-audit", protocolId: preparation.protocolId, status: "passed-five-hard-route-publication-compilations", calibrationOnly: true, productionDebateDataMutated: false, rankingsMutated: false, modelAuthoredScores: 0, outputs: compiled, authorization: { renderingVerification: true, readinessPromotion: false, productionMutation: false, all195Debates: false } };
await writeFile(path.resolve(auditPath), `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify(audit, null, 2));

