#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--authorized-at");
const authorizedAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(authorizedAt && !Number.isNaN(Date.parse(authorizedAt)), "invalid --authorized-at");
const root = "docs/assessment-production/post-canary-continuation-v1/batch-04/dispute-only-adjudication/failure-recovery/debate-185-correction";
const prepPath = `${root}/execution-preparation-manifest.json`;
const activationPath = `${root}/execution-activation.json`;
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(!(await exists(activationPath)), "Debate 185 correction activation already exists");
const prepBytes = await readFile(prepPath);
const prep = JSON.parse(prepBytes);
assertV4(prep.status ===
  "frozen-one-batch-04-debate-185-full-packet-adjudication-correction-context-prepared" &&
  prep.contexts.length === 1 && prep.contexts[0].candidateSelections === 60 &&
  prep.executionPolicy.attemptsPerContext === 1 && prep.executionPolicy.retriesMaximum === 0 &&
  prep.model.slug === "gpt-5.6-sol" && prep.model.reasoningEffort === "low",
  "Debate 185 correction not prepared");
for (const [file, digest] of Object.entries(prep.sourceHashes))
  assertV4(sha256(await readFile(file)) === digest, `source drift: ${file}`);
const activation = {
  ...prep,
  schemaVersion: "1.0-assessment-production-post-canary-batch-04-debate-185-adjudication-correction-activation",
  status: "frozen-one-batch-04-debate-185-full-packet-adjudication-correction-context-authorized",
  authorizedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  preparationManifest: { path: prepPath, sha256: sha256(prepBytes) },
  authorization: {
    executionActivation: false, adjudicationModelContexts: true,
    deterministicMergeAndCohortReplay: true, judgmentModelContexts: false,
    paidServices: false, finalLedgerAssembly: false, scoreDerivation: false,
    productionMutation: false
  },
  futureOutputPathsExcludedFromSourceHashes:
    prep.futureOutputPathsExcludedFromSourceHashes.filter((file) =>
      file !== activationPath && file !== prep.failedOutput.preservedCopy),
  nextAuthorizedAction: "execute-one-fresh-debate-185-full-packet-adjudication-correction-context"
};
if (shouldWrite) await writeFile(activationPath, `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen-authorized" : "preview",
  contexts: 1, candidateSelections: 60, attemptsPerContext: 1,
  retriesMaximum: 0, directIncrementalCostUsdMaximum: 0 }, null, 2));
