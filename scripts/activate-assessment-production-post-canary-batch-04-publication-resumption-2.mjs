#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  POST_CANARY_BATCH_04_PUBLICATION_RESUMPTION_2_PROTOCOL_ID,
  POST_CANARY_BATCH_04_PUBLICATION_RESUMPTION_2_ROOT
} from "./lib/assessment-production-post-canary-batch-04-publication-resumption-2.mjs";
import { loadAndValidatePostCanaryBatch04StandingAuthorization } from "./lib/assessment-production-post-canary-batch-04-standing-authorization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const index = process.argv.indexOf("--activated-at");
const activatedAt = index >= 0 ? process.argv[index + 1] : null;
assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)),
  "--activated-at requires an ISO timestamp");
const ROOT = POST_CANARY_BATCH_04_PUBLICATION_RESUMPTION_2_ROOT;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const standing = await loadAndValidatePostCanaryBatch04StandingAuthorization();
assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
const preparationBytes = await readFile(path.resolve(PREPARATION));
const preparation = JSON.parse(preparationBytes);
assertV4(preparation.protocolId === POST_CANARY_BATCH_04_PUBLICATION_RESUMPTION_2_PROTOCOL_ID &&
  preparation.status ===
    "frozen-six-untouched-post-canary-batch-04-publication-resumption-2-contexts-prepared-under-standing-authorization" &&
  preparation.batchNumber === 4 && preparation.contexts?.length === 6 &&
  preparation.totals?.resumptionMoves === 118 && preparation.totals?.cohortMoves === 203 &&
  preparation.model?.slug === "gpt-5.6-sol" && preparation.model?.reasoningEffort === "low" &&
  preparation.executionPolicy?.attemptsPerContext === 1 &&
  preparation.executionPolicy?.retriesMaximum === 0 &&
  preparation.executionPolicy?.timeoutExtensionsMaximum === 0 &&
  preparation.executionPolicy?.maximumParallelContexts === 2 &&
  canonicalJson(preparation.executionPolicy?.schedulerRamp) === canonicalJson([1,2]) &&
  preparation.authorization?.standingAuthorizationPermitsActivation === true &&
  preparation.authorization?.publicationModelExecution === false &&
  preparation.userAuthorization?.standingAuthorizationSha256 === standing.sha256 &&
  Object.values(preparation.stopRules).every(Boolean),
"the Batch 4 publication resumption-2 is not prepared");
assertV4(execFileSync(preparation.executionEnvironment.codexPath, ["--version"],
  { encoding: "utf8" }).trim() === preparation.executionEnvironment.codexCliVersion,
"the frozen Codex command-line version changed");
for (const [file, digest] of Object.entries(preparation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `${file}: frozen resumption-2 source drifted`);
}
for (const future of preparation.futureOutputPathsExcludedFromSourceHashes) {
  if (future !== ACTIVATION) assertV4(!(await exists(future)), `future output exists: ${future}`);
}
const activation = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-04-publication-resumption-2-execution-activation",
  protocolId: preparation.protocolId,
  status:
    "frozen-six-untouched-post-canary-batch-04-publication-resumption-2-contexts-authorized-under-standing-authorization",
  activatedAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 4, stagingOnly: true, AIOnly: true,
  userAuthorization: { ...structuredClone(preparation.userAuthorization),
    publicationModelContexts: 6, publicationModelExecution: true },
  preparationManifest: PREPARATION,
  preparationManifestSha256: sha256(preparationBytes),
  model: structuredClone(preparation.model),
  costBoundary: structuredClone(preparation.costEstimate),
  executionEnvironment: structuredClone(preparation.executionEnvironment),
  modelInputs: structuredClone(preparation.modelInputs),
  inputs: structuredClone(preparation.inputs),
  acceptedCohort: structuredClone(preparation.acceptedCohort),
  contexts: structuredClone(preparation.contexts),
  isolation: structuredClone(preparation.isolation),
  publicationContract: structuredClone(preparation.publicationContract),
  executionPolicy: structuredClone(preparation.executionPolicy),
  acceptanceContract: structuredClone(preparation.acceptanceContract),
  stopRules: structuredClone(preparation.stopRules),
  authorization: { modelContexts: true, publicationModelExecution: true,
    deterministicOutputValidation: true, deterministicCohortAnalysis: true,
    retry: false, timeoutExtension: false, repairPacketPreparation: false,
    publicationCompilation: false, paidServices: false,
    productionMutation: false, nextBatchSelection: false },
  artifacts: structuredClone(preparation.artifacts),
  futureOutputPathsExcludedFromSourceHashes:
    preparation.futureOutputPathsExcludedFromSourceHashes.filter((file) => file !== ACTIVATION),
  sourceHashes: structuredClone(preparation.sourceHashes),
  nextRequiredAction: "execute-the-six-frozen-batch-04-publication-resumption-2-contexts-once"
};
if (shouldWrite) await writeFile(path.resolve(ACTIVATION), `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({ status: shouldWrite ? activation.status : "preview",
  debates: activation.contexts.map((context) => context.debateNumber), contexts: 6,
  resumptionMoves: 118, model: activation.model, schedulerRamp: [1,2],
  attemptsPerContext: 1, retriesMaximum: 0, directIncrementalCostUsdMaximum: 0,
  publicationModelContextsAuthorized: true, repairPacketPreparationAuthorized: false,
  nextRequiredAction: activation.nextRequiredAction }, null, 2));
