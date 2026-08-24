#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_2_PROTOCOL_ID,
  POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_2_ROOT } from
  "./lib/assessment-production-post-canary-batch-08-publication-resumption-2.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--activated-at");
const activatedAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)), "--activated-at requires ISO");
const ROOT = POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_2_ROOT;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`;
const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
const preparationBytes = await readFile(path.resolve(PREPARATION));
const p = JSON.parse(preparationBytes);
assertV4(p.protocolId === POST_CANARY_BATCH_08_PUBLICATION_RESUMPTION_2_PROTOCOL_ID &&
  p.status === "frozen-six-untouched-post-canary-batch-08-publication-resumption-2-contexts-prepared-not-authorized" &&
  canonicalJson(p.contexts?.map((row) => row.debateNumber)) ===
    canonicalJson(["65", "140", "156", "120", "118", "145"]) &&
  p.model?.slug === "gpt-5.6-sol" && p.model?.reasoningEffort === "low" &&
  p.model?.authentication === "ChatGPT subscription" &&
  p.executionPolicy?.contexts === 6 && p.executionPolicy?.attemptsPerContext === 1 &&
  p.executionPolicy?.retriesMaximum === 0 && p.executionPolicy?.timeoutExtensionsMaximum === 0 &&
  canonicalJson(p.executionPolicy?.schedulerRamp) === canonicalJson([1, 2]),
"the six-context Batch 8 publication resumption is not prepared");
assertV4(execFileSync(p.executionEnvironment.codexPath, ["--version"], { encoding: "utf8" }).trim() ===
  p.executionEnvironment.codexCliVersion, "the frozen Codex version changed");
for (const [file, digest] of Object.entries(p.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: resumption source drifted`);
for (const future of p.futureOutputPathsExcludedFromSourceHashes)
  if (future !== ACTIVATION) assertV4(!(await exists(future)), `future resumption output exists: ${future}`);
const activation = { schemaVersion:
    "1.0-assessment-production-post-canary-batch-08-publication-resumption-2-execution-activation",
  protocolId: p.protocolId,
  status: "frozen-six-untouched-post-canary-batch-08-publication-resumption-2-contexts-authorized",
  activatedAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 8, stagingOnly: true, AIOnly: true,
  userAuthorization: p.userAuthorization,
  preparation: { path: PREPARATION, sha256: sha256(preparationBytes) },
  model: p.model, executionEnvironment: p.executionEnvironment, inputs: p.inputs,
  modelInputs: p.modelInputs, sourceHashes: { ...p.sourceHashes, [PREPARATION]: sha256(preparationBytes) },
  acceptedDebates: p.acceptedDebates, contexts: p.contexts, isolation: p.isolation,
  publicationContract: p.publicationContract, transport: p.transport,
  executionPolicy: p.executionPolicy, deterministicValidation: p.deterministicValidation,
  acceptanceContract: p.acceptanceContract, stopRules: p.stopRules, totals: p.totals,
  artifacts: p.artifacts,
  futureOutputPathsExcludedFromSourceHashes:
    p.futureOutputPathsExcludedFromSourceHashes.filter((file) => file !== ACTIVATION),
  authorization: { modelContexts: true, publicationModelExecution: true,
    deterministicOutputValidation: true, deterministicCohortAnalysis: true,
    retry: false, timeoutExtension: false, repairPacketPreparation: false,
    correctionModelExecution: false, publicationCompilation: false,
    publicationFinalization: false, paidServices: false, productionMutation: false,
    nextBatchSelection: false },
  nextAuthorizedAction: "execute-exactly-six-frozen-batch-08-publication-resumption-2-contexts-once" };
if (shouldWrite) await writeFile(path.resolve(ACTIVATION), `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({ status: activation.status,
  debates: activation.contexts.map((row) => row.debateNumber), contextsAuthorized: 6,
  model: activation.model, attemptsPerContext: 1, retriesMaximum: 0,
  directIncrementalCostUsdMaximum: 0, nextAuthorizedAction: activation.nextAuthorizedAction }, null, 2));
