#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4, readJson } from "./lib/v41-lean-production.mjs";
import { V416_ADJUDICATION_ROOT } from "./lib/v416-adjudication.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const frozenIndex = process.argv.indexOf("--frozen-at");
const frozenAt = frozenIndex >= 0 ? process.argv[frozenIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)), "--frozen-at requires an ISO timestamp");
const manifestPath = `${V416_ADJUDICATION_ROOT}/schema-preflight/execution-manifest.json`;
const outputPath = `${V416_ADJUDICATION_ROOT}/schema-preflight/output.json`;
const executionPath = `${V416_ADJUDICATION_ROOT}/schema-preflight/model-execution.json`;
const exists = async (file) => access(path.resolve(root, file)).then(() => true, () => false);
if (shouldWrite) for (const future of [manifestPath, outputPath, executionPath]) assertV4(!(await exists(future)), `${future} already exists`);
const preparation = await readJson(`${V416_ADJUDICATION_ROOT}/preparation-audit.json`);
assertV4(preparation.status === "passed-dispute-only-adjudication-preparation" && preparation.authorization.exactSchemaPreflight && !preparation.authorization.adjudicationModelExecution, "adjudication preparation does not authorize preflight");
const inputs = { rubricBase: "docs/reassessment-rubric-v4.0.md", rubricBounded: "docs/reassessment-rubric-v4.1.md", manual: `${V416_ADJUDICATION_ROOT}/manual.md`, packet: `${V416_ADJUDICATION_ROOT}/schema-preflight/packet.json`, schema: preparation.sharedSchema };
const sourceFiles = [...Object.values(inputs), `${V416_ADJUDICATION_ROOT}/preparation-audit.json`, "scripts/lib/v416-adjudication.mjs", "scripts/validate-v416-adjudication-output.mjs", "scripts/preregister-v416-adjudication-preflight.mjs", "scripts/run-v416-adjudication-preflight.mjs", "scripts/lib/v385-transport.mjs"];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const sourceHashes = {};
for (const file of sourceFiles) sourceHashes[file] = sha256(await readFile(path.resolve(root, file)));
const manifest = {
  schemaVersion: "4.1.6-adjudication-schema-preflight-manifest",
  protocolId: "v4.1.6-triggered-pass-b-consensus",
  status: "frozen-one-context-exact-schema-preflight",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  model: { label: "5.6 Sol", slug: "gpt-5.6-sol", reasoningEffort: "high" },
  inputs,
  executionPolicy: { contexts: 1, attempts: 1, retriesMaximum: 0, timeoutMs: 600000, authentication: "ChatGPT subscription", APIKeysRemoved: true, meteredApiCostUsdMaximum: 0 },
  authorization: { modelExecution: true, freezeThreeContextAdjudicationAfterPass: true, adjudicationModelExecution: false, scoreDerivation: false, productionMutation: false },
  outputs: { output: outputPath, execution: executionPath },
  futureOutputPathsExcludedFromSourceHashes: [outputPath, executionPath],
  sourceHashes
};
if (shouldWrite) await writeFile(path.resolve(root, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen" : "preview", manifest: manifestPath, contexts: 1, attempts: 1, retriesMaximum: 0, meteredApiCostUsdMaximum: 0 }, null, 2));
