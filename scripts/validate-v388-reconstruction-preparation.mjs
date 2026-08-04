#!/usr/bin/env node

import { access } from "node:fs/promises";
import path from "node:path";
import {
  V388_RECON_PROTOCOL, V388_RECON_ROOT, assertV388Recon, readBytes, readJson, sha256
} from "./lib/v388-reconstruction.mjs";

const root = process.cwd();
const manifest = await readJson(root, `${V388_RECON_ROOT}/execution-manifest.json`);
assertV388Recon(manifest.protocolId === V388_RECON_PROTOCOL, "protocol mismatch");
assertV388Recon(manifest.status === "frozen-three-context-recovered-diagnostic-authorized", "manifest status mismatch");
assertV388Recon(manifest.governance.cleanV384GatePassPossible === false && manifest.governance.diagnosticOnly === true, "diagnostic governance missing");
assertV388Recon(manifest.authorization.reconstructionModelExecution && !manifest.authorization.productionMutation && !manifest.authorization.tenDebateGate && !manifest.authorization.all195Debates, "authorization boundary mismatch");
assertV388Recon(manifest.model.label === "5.6 Sol" && manifest.model.slug === "gpt-5.6-sol" && manifest.model.reasoningEffort === "high", "model lock mismatch");
assertV388Recon(manifest.executionPolicy.contexts === 3 && manifest.executionPolicy.retriesAuthorized === 0 && manifest.executionPolicy.apiKeysRemoved, "execution policy mismatch");
for (const [relativePath, digest] of Object.entries(manifest.sourceHashes)) {
  assertV388Recon(sha256(await readBytes(root, relativePath)) === digest, `${relativePath}: hash mismatch`);
}
for (const relativePath of manifest.futureOutputs) {
  try { await access(path.resolve(root, relativePath)); throw new Error(`${relativePath}: future output already exists`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
const quotes = await readJson(root, `${V388_RECON_ROOT}/quote-verification.json`);
assertV388Recon(quotes.status === "passed-six-representative-quotes-audio-verified" && quotes.quotes.length === 6, "quote verification incomplete");
assertV388Recon(quotes.quotes.every((q) => q.audioVerified && q.captionExactMatch && q.audioTranscriptExactMatch), "quote verification failure");
assertV388Recon(quotes.cost.additionalEstimatedCostUsd <= quotes.cost.additionalAuthorizedCapUsd, "quote verification cost cap exceeded");
for (const context of manifest.contexts) {
  const packet = await readJson(root, context.packet);
  assertV388Recon(packet.protocolId === V388_RECON_PROTOCOL && packet.debateNumber === context.debateNumber && packet.debateId === context.debateId, `${context.debateNumber}: packet identity mismatch`);
  assertV388Recon(packet.moves.every((m) => /^\d+:\d{2}$/.test(m.displayTime)), `${context.debateNumber}: display time missing`);
  assertV388Recon(packet.representativeQuotes.pro.audioVerified && packet.representativeQuotes.con.audioVerified, `${context.debateNumber}: quotes not locked`);
  assertV388Recon(packet.prohibitedInputs.length === 7, `${context.debateNumber}: prohibited input lock mismatch`);
}
console.log(JSON.stringify({ status: "passed", contexts: 3, sourceHashes: Object.keys(manifest.sourceHashes).length, representativeQuotes: 6, additionalTranscriptionEstimatedCostUsd: quotes.cost.additionalEstimatedCostUsd, meteredModelApiCostUsd: manifest.cost.meteredModelApiCostUsd, reconstructionModelExecutionAuthorized: true, diagnosticOnly: true }, null, 2));
