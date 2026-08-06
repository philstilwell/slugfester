#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = process.env.SLUGFESTER_JUDGMENT_ROOT ?? "docs/calibration/v4.2.21.17/independent-judgment-three";
const manifest = JSON.parse(await readFile(`${ROOT}/execution-manifest.json`, "utf8"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(["frozen-six-independent-judgment-contexts-authorized", "frozen-six-corrected-independent-judgment-contexts-authorized"].includes(manifest.status) && manifest.authorization.modelContexts, "independent judgment execution unauthorized");
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

const results = [];
for (const context of manifest.contexts) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), `slugfester-judgment-${context.debateNumber}-${context.reviewerPass.toLowerCase()}-`));
  const codexHome = await mkdtemp(path.join(os.tmpdir(), `slugfester-judgment-home-${context.debateNumber}-${context.reviewerPass.toLowerCase()}-`));
  const startedAt = new Date().toISOString();
  const started = Date.now();
  let record;
  try {
    for (const [source, target] of [[manifest.modelInputs.rubricBase, "rubric-base.md"], [manifest.modelInputs.rubricDerived, "rubric-derived.md"], [manifest.modelInputs.rubricBounded, "rubric-bounded.md"], [manifest.modelInputs.manual, "manual.md"], [context.sourcePacket, "source-packet.json"], [context.judgmentPacket, "judgment-packet.json"], [context.schema, "schema.json"]]) await copyFile(source, path.join(temporary, target));
    await copyFile(authSource, path.join(codexHome, "auth.json"));
    const env = { ...process.env, CODEX_HOME: codexHome };
    for (const key of ["OPENAI_API_KEY", "OPENAI_ORG_ID", "CODEX_API_KEY"]) delete env[key];
    const prompt = `Read rubric-base.md, rubric-derived.md, rubric-bounded.md, manual.md, source-packet.json, judgment-packet.json, and schema.json; read nothing else. Act only as isolated independent performance Judge ${context.reviewerPass} for Debate ${context.debateNumber}. Judge every locked move exactly once. The score-blind inventory, chronology, source evidence, routes, sections, and propositions are immutable. Use only legal earlier-opposing targets exposed by the schema. Apply the response-component, partial-answer, burden-relevance, charity, confidence, and strict burden-residual anchors. Do not calculate scores, name a winner, claim audio review, alter candidate selection, or write Overall Commentary, AI Extension, or publication prose. The other independent judgment is unavailable. Return exactly one schema-conforming JSON object.`;
    process.stdout.write(`[v4.2.21.17.1-judgment] starting ${manifest.model.label}/${manifest.model.reasoningEffort} Debate ${context.debateNumber} Pass ${context.reviewerPass}\n`);
    const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort="${manifest.model.reasoningEffort}"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env }, manifest.executionPolicy.timeoutMs);
    const resultExists = await access(path.join(temporary, "result.json")).then(() => true, () => false);
    const base = { debateNumber: context.debateNumber, reviewerPass: context.reviewerPass, reviewerRole: context.reviewerRole, model: manifest.model.label, modelSlug: manifest.model.slug, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, authentication: "ChatGPT subscription", apiKeysRemoved: true, copiedInputBytes: context.copiedInputBytes, lockedInventorySha256: context.lockedInventoryCanonicalSha256, meteredApiCostUsd: 0, transcriptionCostUsd: 0, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
    if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !resultExists) record = { ...base, status: invocation.timedOut ? "timed-out" : !resultExists ? "result-missing" : "transport-failed", accepted: false, judgmentWritten: false };
    else {
      await mkdir(path.dirname(context.judgmentOutput), { recursive: true });
      await copyFile(path.join(temporary, "result.json"), context.judgmentOutput);
      const validation = await run(process.execPath, ["scripts/validate-v422117-independent-judgment.mjs", context.judgmentOutput, manifest.preparation, context.debateNumber, context.reviewerPass, "--write"], { cwd: process.cwd(), env: process.env }, 180000);
      const valid = validation.code === 0;
      record = { ...base, status: valid ? "completed-valid" : "output-validation-failed", accepted: valid, judgmentWritten: true, judgmentSha256: sha256(await readFile(context.judgmentOutput)), validationSummary: valid ? JSON.parse(validation.stdout) : null, validationMessage: valid ? null : `${validation.stdout}\n${validation.stderr}`.trim().slice(-10000), rawOutputSha256: valid ? sha256(await readFile(context.rawOutput)) : null, validationSha256: valid ? sha256(await readFile(context.validationOutput)) : null, provenanceSha256: valid ? sha256(await readFile(context.provenanceOutput)) : null };
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await rm(codexHome, { recursive: true, force: true });
  }
  results.push(record);
  process.stdout.write(`[v4.2.21.17.1-judgment] Debate ${context.debateNumber} Pass ${context.reviewerPass} ${record.status} in ${(record.elapsedMs / 60000).toFixed(2)}m\n`);
}
const validContexts = results.filter((result) => result.accepted).length;
const execution = { schemaVersion: "4.2.21.17.1-independent-judgment-model-execution", protocolId: manifest.protocolId, status: validContexts === 6 ? "six-independent-judgment-contexts-passed" : "independent-judgment-gate-complete-with-failure", contextsPlanned: 6, contextsAttempted: results.length, validContexts, invalidContexts: results.length - validContexts, attempts: results.length, retries: 0, totalElapsedMs: results.reduce((sum, result) => sum + result.elapsedMs, 0), results, meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoresDerived: 0, authorization: { deterministicAnalysis: true, retry: false, semanticCorrection: false, disagreementExtraction: validContexts === 6, audioVerification: false, adjudication: false, scoreDerivation: false } };
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, contextsAttempted: results.length, validContexts, invalidContexts: execution.invalidContexts, totalElapsedMinutes: Number((execution.totalElapsedMs / 60000).toFixed(2)), retries: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoresDerived: 0 }, null, 2));
