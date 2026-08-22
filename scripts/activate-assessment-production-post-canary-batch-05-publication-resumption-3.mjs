#!/usr/bin/env node
import { createHash } from "node:crypto"; import { execFileSync } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises"; import path from "node:path";
import { POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_3_PROTOCOL_ID,
  POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_3_ROOT } from
  "./lib/assessment-production-post-canary-batch-05-publication-resumption-3.mjs";
import { assertV4 } from "./lib/v4-lean-production.mjs";
const shouldWrite = process.argv.includes("--write"); const i = process.argv.indexOf("--activated-at");
const activatedAt = i >= 0 ? process.argv[i + 1] : null;
assertV4(activatedAt && !Number.isNaN(Date.parse(activatedAt)), "--activated-at requires ISO");
const ROOT = POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_3_ROOT;
const PREPARATION = `${ROOT}/execution-preparation-manifest.json`; const ACTIVATION = `${ROOT}/execution-activation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
assertV4(!(await exists(ACTIVATION)), `${ACTIVATION} exists`);
const preparationBytes = await readFile(path.resolve(PREPARATION)); const p = JSON.parse(preparationBytes);
assertV4(p.protocolId === POST_CANARY_BATCH_05_PUBLICATION_RESUMPTION_3_PROTOCOL_ID &&
  p.status === "frozen-one-unattempted-batch-05-debate-59-publication-context-prepared-and-authorized" &&
  p.contexts?.length === 1 && p.contexts[0].debateNumber === "59" &&
  p.model?.slug === "gpt-5.6-sol" && p.model?.reasoningEffort === "low" &&
  p.executionPolicy?.attemptsPerContext === 1 && p.executionPolicy?.retriesMaximum === 0 &&
  p.executionPolicy?.timeoutExtensionsMaximum === 0 && Object.values(p.stopRules).every(Boolean),
"Debate 59 resumption is not prepared");
assertV4(execFileSync(p.executionEnvironment.codexPath, ["--version"], { encoding: "utf8" }).trim() ===
  p.executionEnvironment.codexCliVersion, "Codex version changed");
for (const [file, digest] of Object.entries(p.sourceHashes)) assertV4(
  sha256(await readFile(path.resolve(file))) === digest, `${file}: Debate 59 source drifted`);
for (const future of p.futureOutputPathsExcludedFromSourceHashes) if (future !== ACTIVATION)
  assertV4(!(await exists(future)), `future output exists: ${future}`);
const activation = { schemaVersion: "1.0-assessment-production-post-canary-batch-05-publication-resumption-3-activation",
  protocolId: p.protocolId, status: "frozen-one-unattempted-batch-05-debate-59-publication-context-authorized",
  activatedAt, checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false, batchNumber: 5, stagingOnly: true, AIOnly: true,
  userAuthorization: p.userAuthorization, preparation: { path: PREPARATION, sha256: sha256(preparationBytes) },
  model: p.model, contexts: p.contexts, modelInputs: p.modelInputs,
  isolation: p.isolation, executionEnvironment: p.executionEnvironment,
  executionPolicy: p.executionPolicy, acceptanceContract: p.acceptanceContract,
  stopRules: p.stopRules, acceptedDebates: p.acceptedDebates,
  sourceHashes: { ...p.sourceHashes, [PREPARATION]: sha256(preparationBytes) },
  futureOutputPathsExcludedFromSourceHashes:
    p.futureOutputPathsExcludedFromSourceHashes.filter((file) => file !== ACTIVATION),
  artifacts: p.artifacts,
  authorization: { publicationModelExecution: true, deterministicOutputValidation: true,
    deterministicCohortReplay: true, retry: false, timeoutExtension: false,
    repairPacketPreparation: false, paidServices: false,
    publicationCompilation: false, productionMutation: false, nextBatchSelection: false },
  nextRequiredAction: "execute-exactly-one-unattempted-debate-59-publication-context-once" };
if (shouldWrite) await writeFile(path.resolve(ACTIVATION), `${JSON.stringify(activation, null, 2)}\n`);
console.log(JSON.stringify({ status: activation.status, debate: "59", contextsAuthorized: 1,
  model: activation.model, attemptsPerContext: 1, retriesMaximum: 0,
  directIncrementalCostUsdMaximum: 0, nextRequiredAction: activation.nextRequiredAction }, null, 2));
