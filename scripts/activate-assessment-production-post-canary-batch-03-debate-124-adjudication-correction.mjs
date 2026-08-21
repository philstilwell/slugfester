#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { loadAndValidateRecoveryAuthorization } from
  "./lib/assessment-production-post-canary-batch-03-failure-recovery-standing-authorization.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--authorized-at");
const authorizedAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(authorizedAt && !Number.isNaN(Date.parse(authorizedAt)), "invalid --authorized-at");
const root = "docs/assessment-production/post-canary-continuation-v1/batch-03/dispute-only-adjudication/failure-recovery";
const prepPath = `${root}/correction-preparation-manifest.json`;
const activationPath = `${root}/correction-execution-activation.json`;
const exists = (file) => access(file).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(!(await exists(activationPath)), "correction activation already exists");
const { record: recovery, bytes: recoveryBytes } = await loadAndValidateRecoveryAuthorization();
const prepBytes = await readFile(prepPath);
const prep = JSON.parse(prepBytes);
assertV4(
  recovery.authorization.boundedFirstCorrection === true &&
    prep.status === "frozen-two-batch-03-debate-124-field-disjoint-adjudication-correction-contexts-prepared" &&
    prep.contexts.length === 2 &&
    prep.contexts.reduce((sum, item) => sum + item.candidateSelections, 0) === 67 &&
    prep.executionPolicy.attemptsPerContext === 1 &&
    prep.executionPolicy.retriesMaximum === 0 &&
    prep.executionPolicy.timeoutExtensionsMaximum === 0 &&
    prep.model.slug === "gpt-5.6-sol" && prep.model.reasoningEffort === "low" &&
    prep.model.authentication === "ChatGPT subscription" && prep.model.scoreBlind === true,
  "Debate 124 correction is not prepared"
);
for (const [file, digest] of Object.entries(prep.sourceHashes))
  assertV4(sha256(await readFile(file)) === digest, `source drift: ${file}`);
for (const future of prep.futureOutputPathsExcludedFromSourceHashes)
  assertV4(!(await exists(future)), `future output exists: ${future}`);
const activation = {
  ...prep,
  schemaVersion: "1.0-assessment-production-post-canary-batch-03-debate-124-adjudication-correction-activation",
  status: "frozen-two-batch-03-debate-124-field-disjoint-adjudication-correction-contexts-authorized",
  authorizedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  preparationManifest: { path: prepPath, sha256: sha256(prepBytes) },
  recoveryAuthorizationSha256: sha256(recoveryBytes),
  authorization: {
    executionActivation: false, adjudicationModelContexts: true,
    deterministicMergeAndValidation: true, judgmentModelContexts: false,
    paidServices: false, finalLedgerAssembly: false, scoreDerivation: false,
    productionMutation: false
  },
  futureOutputPathsExcludedFromSourceHashes:
    prep.futureOutputPathsExcludedFromSourceHashes.filter((file) => file !== activationPath),
  nextAuthorizedAction: "execute-two-debate-124-field-disjoint-correction-contexts-once"
};
if (shouldWrite) await writeFile(activationPath, `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? "frozen-authorized" : "preview-authorized",
  contexts: 2, schedulerRamp: [1,2], attemptsPerContext: 1, retriesMaximum: 0,
  timeoutExtensionsMaximum: 0, model: activation.model,
  directIncrementalCostUsdMaximum: 0 }, null, 2));
