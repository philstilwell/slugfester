#!/usr/bin/env node
import { createHash } from "node:crypto"; import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises"; import path from "node:path";
import { POST_CANARY_BATCH_07_DEBATE_80_REPAIR_PROTOCOL_ID,
  POST_CANARY_BATCH_07_DEBATE_80_REPAIR_ROOT } from
  "./lib/assessment-production-post-canary-batch-07-publication-resumption-repair.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write"); const atIndex = process.argv.indexOf("--activated-at");
const activatedAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)), "--activated-at requires ISO");
const ROOT = POST_CANARY_BATCH_07_DEBATE_80_REPAIR_ROOT;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`; const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} already exists`);
const preparationBytes = await readFile(path.resolve(PREPARATION)); const p = JSON.parse(preparationBytes);
assertV4(p.protocolId === POST_CANARY_BATCH_07_DEBATE_80_REPAIR_PROTOCOL_ID &&
  p.status === "frozen-three-context-batch-07-debate-80-publication-repair-prepared-not-activated" &&
  p.contexts?.length === 3 && canonicalJson(p.contexts.map((row) => row.writableFieldCount)) === canonicalJson([2, 2, 1]) &&
  p.model?.slug === "gpt-5.6-sol" && p.model?.reasoningEffort === "low" &&
  p.model?.authentication === "ChatGPT subscription" &&
  p.executionPolicy?.attemptsPerContext === 1 && p.executionPolicy?.retriesMaximum === 0 &&
  p.executionPolicy?.timeoutExtensionsMaximum === 0 &&
  canonicalJson(p.executionPolicy?.schedulerRamp) === canonicalJson([1, 2]),
"the Debate 80 repair is not prepared");
assertV4(execFileSync(p.executionEnvironment.codexPath, ["--version"], { encoding: "utf8" }).trim() ===
  p.executionEnvironment.codexCliVersion, "the frozen Codex version changed");
for (const [file, digest] of Object.entries(p.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: repair source drifted`);
for (const future of p.futureOutputPathsExcludedFromSourceHashes) if (future !== ACTIVATION)
  assertV4(!(await exists(future)), `future repair output exists: ${future}`);
const activation = { schemaVersion: "1.0-assessment-production-post-canary-batch-07-debate-80-repair-activation",
  protocolId: p.protocolId, status: "frozen-three-context-batch-07-debate-80-publication-repair-authorized",
  activatedAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 7, stagingOnly: true, AIOnly: true,
  userAuthorization: p.userAuthorization, preparation: { path: PREPARATION, sha256: sha256(preparationBytes) },
  model: p.model, contexts: p.contexts, modelInputs: p.modelInputs, isolation: p.isolation,
  repairContract: p.repairContract, executionEnvironment: p.executionEnvironment,
  executionPolicy: p.executionPolicy, stopRules: p.stopRules,
  sourceHashes: { ...p.sourceHashes, [PREPARATION]: sha256(preparationBytes) },
  futureOutputPathsExcludedFromSourceHashes:
    p.futureOutputPathsExcludedFromSourceHashes.filter((file) => file !== ACTIVATION),
  artifacts: p.artifacts,
  authorization: { repairModelExecution: true, deterministicOutputValidation: true,
    deterministicMergeAndValidation: true, eightContextResumptionPreparation: true,
    retry: false, timeoutExtension: false, recursiveCorrection: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false },
  nextAuthorizedAction: "execute-exactly-three-frozen-debate-80-repair-contexts" };
if (shouldWrite) await writeFile(path.resolve(ACTIVATION), `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({ status: activation.status, contextsAuthorized: 3,
  writableFieldsAuthorized: 5, model: activation.model, attemptsPerContext: 1,
  retriesMaximum: 0, directIncrementalCostUsdMaximum: 0,
  nextAuthorizedAction: activation.nextAuthorizedAction }, null, 2));
