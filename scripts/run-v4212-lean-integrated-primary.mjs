#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { classifyTransportEventCount, extractTransportEvents } from "./lib/v385-transport.mjs";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { compileAndValidateV4212, V4212_ROOT } from "./lib/v4212-lean-integrated-primary.mjs";

const manifest = JSON.parse(await readFile(`${V4212_ROOT}/execution-manifest.json`, "utf8")), codex = "/Applications/ChatGPT.app/Contents/Resources/codex", auth = path.join(os.homedir(), ".codex", "auth.json"), sha256 = (value) => createHash("sha256").update(value).digest("hex");
assertV4(manifest.status === "frozen-one-lean-integrated-primary-authorized" && manifest.authorization.modelExecution, "v4.2.12 unauthorized");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(file)) === digest, `source hash mismatch: ${file}`);
for (const file of manifest.futureOutputPathsExcludedFromSourceHashes) await access(file).then(() => { throw new Error(`${file} already exists`); }, () => true);
await access(codex); await access(auth);
function run(command, args, options, timeoutMs) { return new Promise((resolve) => { const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "pipe"] }); let stdout = "", stderr = "", timedOut = false, force = null; child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; }); const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); force = setTimeout(() => child.kill("SIGKILL"), 5000); }, timeoutMs); child.on("close", (code, signal) => { clearTimeout(timer); if (force) clearTimeout(force); resolve({ code, signal, stdout, stderr, timedOut }); }); }); }
const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-v4212-")), home = await mkdtemp(path.join(os.tmpdir(), "slugfester-v4212-home-")), startedAt = new Date().toISOString(), started = Date.now(); let record;
try {
  const names = { rubricBase: "rubric-base.md", rubricDerivedScores: "rubric-derived.md", rubricBounded: "rubric-bounded.md", manual: "manual.md", schema: "schema.json", packet: "packet.json", candidateBundle: "candidate-bundle.json", candidateContextLedger: "candidate-context-ledger.jsonl" };
  for (const [key, source] of Object.entries(manifest.inputs)) await copyFile(source, path.join(temporary, names[key]));
  await copyFile(auth, path.join(home, "auth.json")); const env = { ...process.env, CODEX_HOME: home }; delete env.OPENAI_API_KEY; delete env.OPENAI_ORG_ID; delete env.CODEX_API_KEY;
  const prompt = "Read rubric-base.md, rubric-derived.md, rubric-bounded.md, manual.md, packet.json, candidate-bundle.json, candidate-context-ledger.jsonl, and schema.json; read nothing else. Act only as the v4.2.12 lean integrated-primary judge for Debate 99. Select and judge the minimum complete candidate-grounded inventory, order all selected moves canonically, and verify every response, burden, charity, calibration, and rating rule. Return exactly one schema-conforming JSON object.";
  process.stdout.write("[v4.2.12-lean-integrated] starting 5.6 Sol/low Debate 99\n");
  const invocation = await run(codex, ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", manifest.model.slug, "-c", `model_reasoning_effort="${manifest.model.reasoningEffort}"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", prompt], { cwd: temporary, env }, manifest.executionPolicy.timeoutMs);
  const transportEvents = extractTransportEvents(invocation.stderr), transportClassification = classifyTransportEventCount(transportEvents.length, 2, 8), exists = await access(path.join(temporary, "result.json")).then(() => true, () => false);
  const base = { debateNumber: "99", startedAt, completedAt: new Date().toISOString(), elapsedMs: Date.now() - started, model: manifest.model.label, reasoningEffort: manifest.model.reasoningEffort, attemptCount: 1, retryCount: 0, recoverableStreamEvents: transportEvents.length, transportClassification, timedOut: invocation.timedOut, commandExitCode: invocation.code, terminationSignal: invocation.signal, authentication: "ChatGPT subscription", apiKeysRemoved: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, stdoutSha256: sha256(invocation.stdout), stderrSha256: sha256(invocation.stderr) };
  if (invocation.timedOut || invocation.code !== 0 || invocation.signal !== null || !exists) record = { ...base, status: invocation.timedOut ? "timed-out" : !exists ? "result-missing" : "transport-failed", accepted: false, proposalWritten: false };
  else {
    await copyFile(path.join(temporary, "result.json"), manifest.outputs.proposal);
    const [proposal, bundle, packet, eventsBytes, ledgerBytes] = await Promise.all([readFile(manifest.outputs.proposal, "utf8").then(JSON.parse), readFile(manifest.inputs.candidateBundle, "utf8").then(JSON.parse), readFile(manifest.inputs.packet, "utf8").then(JSON.parse), readFile(manifest.source.originalEvents), readFile(manifest.source.fullLedger)]);
    try {
      const replay = compileAndValidateV4212(proposal, bundle, packet, JSON.parse(eventsBytes), eventsBytes, ledgerBytes), accepted = transportClassification !== "invalid";
      if (accepted) { await writeFile(manifest.outputs.primary, `${JSON.stringify(replay.output, null, 2)}\n`); await writeFile(manifest.outputs.compiled, `${JSON.stringify(replay.compiled, null, 2)}\n`); }
      record = { ...base, status: accepted ? "completed-valid" : "transport-event-limit-exceeded", accepted, proposalWritten: true, proposalSha256: sha256(await readFile(manifest.outputs.proposal)), primaryWritten: accepted, primarySha256: accepted ? sha256(await readFile(manifest.outputs.primary)) : null, compiledWritten: accepted, compiledSha256: accepted ? sha256(await readFile(manifest.outputs.compiled)) : null, validation: accepted ? replay.validation : null, provenance: accepted ? replay.provenance : null };
    } catch (error) { record = { ...base, status: "proposal-validation-failed", accepted: false, proposalWritten: true, proposalSha256: sha256(await readFile(manifest.outputs.proposal)), validationMessage: error.stack }; }
  }
} finally { await rm(temporary, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
const execution = { schemaVersion: "4.2.12-lean-integrated-primary-model-execution", protocolId: manifest.protocolId, status: record.accepted ? "lean-integrated-primary-execution-passed" : "lean-integrated-primary-execution-failed", attempts: 1, retries: 0, result: record, meteredApiCostUsd: 0, transcriptionCostUsd: 0, authorization: { analysis: true, retry: false, scoreDerivation: false } };
await writeFile(manifest.artifacts.execution, `${JSON.stringify(execution, null, 2)}\n`);
console.log(JSON.stringify({ status: execution.status, elapsedMinutes: Number((record.elapsedMs / 60000).toFixed(2)), accepted: record.accepted, attempts: 1, retries: 0, meteredApiCostUsd: 0 }, null, 2));
