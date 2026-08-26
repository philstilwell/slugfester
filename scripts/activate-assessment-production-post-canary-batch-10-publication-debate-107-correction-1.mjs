#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PROTOCOL_ID, ROOT, TARGETS } from
  "./lib/assessment-production-post-canary-batch-10-publication-debate-107-correction-1.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--activated-at");
const activatedAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)),
  "--activated-at requires an ISO timestamp");
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(ACTIVATION)), "Debate 107 correction activation already exists");
const preparationBytes = await readFile(path.resolve(PREPARATION));
const preparation = JSON.parse(preparationBytes);
assertV4(
  preparation.protocolId === PROTOCOL_ID &&
    preparation.status === "frozen-one-context-three-field-debate-107-publication-correction-prepared-not-activated" &&
    preparation.context?.writableFieldCount === 3 &&
    canonicalJson(preparation.context.writableFields) ===
      canonicalJson(TARGETS.map((target) => target.field)) &&
    preparation.userAuthorization?.explicitThreeWritableFieldException === true,
  "Debate 107 three-field correction is not prepared"
);
assertV4(
  preparation.model?.slug === "gpt-5.6-sol" &&
    preparation.model?.reasoningEffort === "low" &&
    preparation.model?.authentication === "ChatGPT subscription" &&
    preparation.executionPolicy?.attemptsPerContext === 1 &&
    preparation.executionPolicy?.retriesMaximum === 0 &&
    preparation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
    preparation.executionPolicy?.furtherCorrectionsMaximum === 0,
  "correction model or execution controls changed"
);
assertV4(
  execFileSync(preparation.executionEnvironment.codexPath, ["--version"], {
    encoding: "utf8"
  }).trim() === preparation.executionEnvironment.codexCliVersion,
  "Codex command-line version changed"
);
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `source hash mismatch: ${file}`);
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  if (future !== ACTIVATION) assertV4(!(await exists(future)), `future output exists: ${future}`);
}
const activation = {
  ...preparation,
  schemaVersion: "1.0-assessment-production-post-canary-batch-10-publication-debate-107-correction-activation",
  status: "frozen-one-context-three-field-debate-107-publication-correction-activated",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  preparation: { path: PREPARATION, sha256: sha256(preparationBytes) },
  sourceHashes: { ...preparation.sourceHashes, [PREPARATION]: sha256(preparationBytes) },
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter((file) => file !== ACTIVATION),
  authorization: {
    ...preparation.authorization,
    preparation: false,
    activation: false,
    modelExecution: true,
    deterministicMergeAndValidation: true,
    sixContextResumptionAfterPass: true
  },
  nextAuthorizedAction: "execute-exactly-one-frozen-three-field-debate-107-correction-context"
};
delete activation.frozenAt;
if (shouldWrite) await writeFile(path.resolve(ACTIVATION), `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({
  status: shouldWrite ? activation.status : "preview",
  debate: "107",
  contextsAuthorized: 1,
  writableFields: activation.context.writableFields,
  explicitThreeFieldException: true,
  attempts: 1,
  retries: 0,
  timeoutExtensions: 0,
  furtherCorrections: 0,
  directIncrementalCostUsdMaximum: 0
}, null, 2));
