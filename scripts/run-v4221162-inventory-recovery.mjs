#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { V422116_ROOT } from "./lib/v422116-decomposed-consensus.mjs";

const manifest = JSON.parse(await readFile(`${V422116_ROOT}/inventory-recovery-execution-manifest.json`, "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(manifest.status === "frozen-debate-182-inventory-transport-recovery-authorized" && manifest.authorization.modelContext, "Debate 182 inventory recovery unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
for (const future of manifest.futureOutputPathsExcludedFromSourceHashes) await access(future).then(() => { throw new Error(`future output exists: ${future}`); }, () => true);
await access(codex);
await access(authSource);

function run(command, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "", stderr = "", timedOut = false, forceTimer = null;
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); forceTimer = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs);
    child.on("close", (code, signal) => { clearTimeout(timer); if (forceTimer) clearTimeout(forceTimer); resolve({ code, signal, stdout, stderr, timedOut }); });
  });
}

const context = manifest.context;
const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-inventory-recovery-182-"));
const codexHome = await mkdtemp(path.join(os.tmpdir(), "slugfester-inventory-recovery-home-182-"));
const startedAt = new Date().toISOString();
const started = Date.now();
let record;
try {
  for (const [source, target] of [[manifest.modelInputs.manual, "manual.md"], [context.packet, "packet.json"], [context.modelCandidateTransport, "candidate-evidence-bundle.json"], [context.schema, "schema.json"]]) await copyFile(source, path.join(temporary, target));
  await copyFile(authSource, path.join(codexHome, "auth.json"));
  const env = { ...process.env, CODEX_HOME: codexHome };
  for (const key of ["OPENAI_API_KEY", "OPENAI_ORG_ID", "CODEX_API_KEY"]) delete env[key];
  const prompt = "Read manual.md, packet.json, candidate-evidence-bundle.json, and schema.json; read nothing else. Act only as the fresh score-blind inventory curator for Debate 182 under the inventory-transport recovery protocol. All 49 candidates remain present with source-exact excerpts. Produce four to six weighted issue sections totaling exactly 100%, with one or two pro and one or two con selections in every section and no candidate used twice. Define one route per side and its burden bridges. Author only each selected candidate ID, a unique move ID, a global constructive-or-reply classification, and a source-faithful proposition. A reply must have an earlier selected opposing move in source chronology, but do not name targets. Ratings, response topology, burden contact, scores, winners, Overall Commentary, AI Extension, and publication prose are prohibited. Return exactly one schema-conforming JSON object.";
  process.stdout.write(`[v4.2.21.16.2-inventory-recovery] starting ${manifest.model.label}/${manifest.model.reasoningEffort} Debate 182\n`);
  const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort="${manifest.model.reasoningEffort}"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env }, manifest.executionPolicy.timeoutMs);
  const resultExists = await access(path.join(temporary, "result.json")).then(() => true, () => false);
  const base = { debateNumber: "182", model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, authentication: "ChatGPT subscription", apiKeysRemoved: true, copiedInputBytes: context.copiedInputBytes, meteredApiCostUsd: 0, transcriptionCostUsd: 0, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
  if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) record = { ...base, status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed", accepted: false, proposalWritten: false };
  else {
    await mkdir(path.dirname(context.proposalOutput), { recursive: true });
    await copyFile(path.join(temporary, "result.json"), context.proposalOutput);
    const validation = await run(process.execPath, ["scripts/validate-v4221162-inventory-recovery.mjs", context.proposalOutput, manifest.preparation, "--write"], { cwd: process.cwd(), env: process.env }, 180000);
    const valid = validation.code === 0;
    record = { ...base, status: valid ? "completed-valid" : "output-validation-failed", accepted: valid, proposalWritten: true, proposalSha256: sha256(await readFile(context.proposalOutput)), validationSummary: valid ? JSON.parse(validation.stdout) : null, validationMessage: valid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-8000), lockedInventorySha256: valid ? sha256(await readFile(context.lockedInventoryOutput)) : null, validationSha256: valid ? sha256(await readFile(context.validationOutput)) : null, provenanceSha256: valid ? sha256(await readFile(context.provenanceOutput)) : null };
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
  await rm(codexHome, { recursive: true, force: true });
}
const execution = { schemaVersion: "4.2.21.16.2-inventory-transport-recovery-model-execution", protocolId: manifest.protocolId, status: record.accepted ? "debate-182-inventory-transport-recovery-passed" : "debate-182-inventory-transport-recovery-failed", contextsPlanned: 1, contextsAttempted: 1, validContexts: record.accepted ? 1 : 0, invalidContexts: record.accepted ? 0 : 1, attempts: 1, retries: 0, totalElapsedMs: record.elapsedMs, results: [record], meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoresDerived: 0, authorization: { combinedAnalysis: true, retry: false, semanticCorrection: false, independentJudgmentPreparation: false, independentJudgmentExecution: false, scoreDerivation: false } };
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, debateNumber: "182", validContexts: execution.validContexts, invalidContexts: execution.invalidContexts, elapsedMinutes: Number((execution.totalElapsedMs / 60000).toFixed(2)), retries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoresDerived: 0 }, null, 2));
