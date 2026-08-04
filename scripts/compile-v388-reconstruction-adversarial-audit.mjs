#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const write = process.argv.includes("--write");
const auditRoot = "docs/calibration/v3.8.8/reconstruction/adversarial-audit";
const readJson = async (relativePath) => JSON.parse(await readFile(path.resolve(root, relativePath), "utf8"));
const manifest = await readJson(`${auditRoot}/execution-manifest.json`);
const execution = await readJson(`${auditRoot}/model-execution.json`);
const verdicts = [];
for (const context of manifest.contexts) {
  const validation = spawnSync(process.execPath, ["scripts/validate-v388-reconstruction-adversarial-audit.mjs", context.output, context.packet], { cwd: root, encoding: "utf8" });
  if (validation.status !== 0) throw new Error(`${context.debateNumber}: ${validation.stderr || validation.stdout}`);
  const output = await readJson(context.output);
  verdicts.push({ debateNumber: context.debateNumber, debateId: context.debateId, verdict: output.verdict, concerns: output.concerns });
}
const allConcerns = verdicts.flatMap((item) => item.concerns.map((concern) => ({ debateNumber: item.debateNumber, ...concern })));
const summary = {
  schemaVersion: "3.8.8-reconstruction-adversarial-audit-summary",
  protocolId: manifest.protocolId,
  status: execution.validContexts === 3 ? "passed-supplemental-audit-execution" : "failed-closed",
  calibrationOnly: true,
  assessmentModel: manifest.model.label,
  contexts: execution.validContexts,
  verdicts: Object.fromEntries(verdicts.map((item) => [item.debateNumber, item.verdict])),
  concernCounts: { total: allConcerns.length, high: allConcerns.filter((item) => item.severity === "high").length, medium: allConcerns.filter((item) => item.severity === "medium").length, low: allConcerns.filter((item) => item.severity === "low").length },
  concerns: allConcerns,
  reconstructionMutationAuthorized: false,
  productionMutationAuthorized: false,
  tenDebateGateAuthorized: false,
  all195DebatesAuthorized: false,
  meteredModelApiCostUsd: 0,
  transcriptionCostUsd: 0
};
if (write) await writeFile(path.resolve(root, manifest.artifacts.summary), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
