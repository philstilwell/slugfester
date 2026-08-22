#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_PROTOCOL_ID,
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_ROOT } from
  "./lib/assessment-production-post-canary-batch-05-publication-resumption-2.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--activated-at");
const activatedAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)), "--activated-at requires ISO");
const ROOT = POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_ROOT;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
const preparationBytes = await readFile(path.resolve(PREPARATION)); const p = JSON.parse(preparationBytes);
assertV4(p.protocolId === POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_2_PROTOCOL_ID &&
  p.status === "frozen-four-unattempted-batch-05-publication-resumption-2-contexts-prepared-and-authorized" &&
  p.contexts?.length === 4 && p.totals?.resumptionMoves === 75 && p.totals?.cohortMoves === 187 &&
  p.model?.slug === "gpt-5.6-sol" && p.model?.reasoningEffort === "low" &&
  p.model?.authentication === "ChatGPT subscription" &&
  p.executionPolicy?.attemptsPerContext === 1 && p.executionPolicy?.retriesMaximum === 0 &&
  p.executionPolicy?.timeoutExtensionsMaximum === 0 && p.executionPolicy?.maximumParallelContexts === 2 &&
  canonicalJson(p.executionPolicy?.schedulerRamp) === canonicalJson([1, 2]) &&
  Object.values(p.stopRules).every(Boolean), "the four-context resumption-2 is not prepared");
assertV4(execFileSync(p.executionEnvironment.codexPath, ["--version"], { encoding: "utf8" }).trim() ===
  p.executionEnvironment.codexCliVersion, "the frozen Codex version changed");
for (const [file, digest] of Object.entries(p.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: resumption-2 source drifted`);
for (const future of p.futureOutputPathsExcludedFromSourceHashes) if (future !== ACTIVATION)
  assertV4(!(await exists(future)), `future resumption-2 output exists: ${future}`);
const activation = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-resumption-2-activation",
  protocolId: p.protocolId,
  status: "frozen-four-unattempted-batch-05-publication-resumption-2-contexts-authorized",
  activatedAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 5, stagingOnly: true, AIOnly: true,
  userAuthorization: p.userAuthorization,
  preparationManifest: PREPARATION, preparationManifestSha256: sha256(preparationBytes),
  model: p.model, costBoundary: p.costEstimate, executionEnvironment: p.executionEnvironment,
  modelInputs: p.modelInputs, inputs: p.inputs, acceptedDebates: p.acceptedDebates,
  contexts: p.contexts, isolation: p.isolation, publicationContract: p.publicationContract,
  executionPolicy: p.executionPolicy, acceptanceContract: p.acceptanceContract,
  stopRules: p.stopRules, sourceHashes: { ...p.sourceHashes, [PREPARATION]: sha256(preparationBytes) },
  authorization: { modelContexts: true, publicationModelExecution: true,
    deterministicOutputValidation: true, deterministicCohortReplay: true,
    retry: false, timeoutExtension: false, repairPacketPreparation: false,
    paidServices: false, publicationCompilation: false,
    productionMutation: false, nextBatchSelection: false },
  artifacts: p.artifacts,
  futureOutputPathsExcludedFromSourceHashes:
    p.futureOutputPathsExcludedFromSourceHashes.filter((file) => file !== ACTIVATION),
  nextRequiredAction: "execute-exactly-four-unattempted-batch-05-publication-contexts-once" };
if (shouldWrite) await writeFile(path.resolve(ACTIVATION), `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({ status: activation.status,
  debates: activation.contexts.map((row) => row.debateNumber), contextsAuthorized: 4,
  model: activation.model, schedulerRamp: [1, 2], attemptsPerContext: 1,
  retriesMaximum: 0, directIncrementalCostUsdMaximum: 0,
  nextRequiredAction: activation.nextRequiredAction }, null, 2));
