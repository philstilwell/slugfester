#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { access, copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";

const ROOT = "docs/calibration/v4.2.21.17.2/independent-judgment-schema-recovery";
const preparation = JSON.parse(await readFile(`${ROOT}/preparation-manifest.json`, "utf8"));
assertV4(preparation.status === "six-corrected-independent-judgment-contexts-prepared-schema-preflight-required" && preparation.authorization.schemaDialectPreflight, "schema preflight unauthorized");
const outputPath = `${ROOT}/schema-dialect-preflight.json`;
await access(outputPath).then(() => { throw new Error(`${outputPath} already exists`); }, () => true);
const context = preparation.contexts.find((item) => item.debateNumber === "133" && item.reviewerPass === "A");
const schemaBytes = await readFile(context.schema);
assertV4(!schemaBytes.includes(Buffer.from('"uniqueItems"')), "corrected schema still contains uniqueItems");
const temporary = await mkdtemp(path.join(os.tmpdir(), "slugfester-schema-preflight-"));
const codexHome = await mkdtemp(path.join(os.tmpdir(), "slugfester-schema-preflight-home-"));
const codex = "/Applications/ChatGPT.app/Contents/Resources/codex";
const authSource = path.join(os.homedir(), ".codex", "auth.json");
await copyFile(context.schema, path.join(temporary, "schema.json"));
await copyFile(authSource, path.join(codexHome, "auth.json"));
const env = { ...process.env, CODEX_HOME: codexHome };
for (const key of ["OPENAI_API_KEY", "OPENAI_ORG_ID", "CODEX_API_KEY"]) delete env[key];
const args = ["exec", "--ephemeral", "--skip-git-repo-check", "--ignore-user-config", "--ignore-rules", "--model", preparation.model.slug, "-c", `model_reasoning_effort="${preparation.model.reasoningEffort}"`, "--disable", "plugins", "--disable", "remote_plugin", "--disable", "skill_search", "--disable", "apps", "--disable", "memories", "--disable", "multi_agent", "--disable", "browser_use", "--disable", "computer_use", "--disable", "workspace_dependencies", "--sandbox", "read-only", "--output-schema", "schema.json", "--output-last-message", "result.json", "Return exactly one schema-conforming JSON object."];
const started = Date.now();
const invocation = await new Promise((resolve) => {
  const child = spawn(codex, args, { cwd: temporary, env, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "", stderr = "", capped = false;
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const timer = setTimeout(() => { capped = true; child.kill("SIGKILL"); }, 12000);
  child.on("close", (code, signal) => { clearTimeout(timer); resolve({ code, signal, capped, stdout, stderr }); });
});
const invalidJsonSchemaDetected = invocation.stderr.includes("invalid_json_schema") || invocation.stderr.includes("Invalid schema for response_format");
const passed = !invalidJsonSchemaDetected && (invocation.capped || invocation.code === 0);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const result = {
  schemaVersion: "4.2.21.17.2-schema-dialect-preflight",
  protocolId: preparation.protocolId,
  status: passed ? "corrected-response-schema-accepted-execution-manifest-authorized" : "corrected-response-schema-preflight-failed",
  calibrationOnly: true,
  schema: context.schema,
  schemaSha256: sha256(schemaBytes),
  elapsedMs: Date.now() - started,
  process: { exitCode: invocation.code, signal: invocation.signal, cappedAfterMs: invocation.capped ? 12000 : null, invalidJsonSchemaDetected, stderrSha256: sha256(invocation.stderr), stdoutSha256: sha256(invocation.stdout) },
  interpretation: { responseFormatValidationPassed: passed, debateInputsDelivered: false, debateJudgmentProduced: false, smokeGenerationDiscarded: true, meteredApiCostUsd: 0, transcriptionCostUsd: 0, scoresDerived: 0 },
  authorization: { executionManifest: passed, modelExecution: false, disagreementExtraction: false, audioVerification: false, adjudication: false, scoreDerivation: false, productionMutation: false, all195Debates: false }
};
await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
await rm(temporary, { recursive: true, force: true });
await rm(codexHome, { recursive: true, force: true });
console.log(JSON.stringify(result, null, 2));
if (!passed) process.exitCode = 1;
