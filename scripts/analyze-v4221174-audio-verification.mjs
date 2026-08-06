#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { bagOfWordsRecall, lexicalTokens } from "./lib/v416-audio-verification.mjs";

const shouldWrite = process.argv.includes("--write");
const stageRoot = "docs/calibration/v4.2.21.17.4/medium-confidence-audio-verification";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const [manifest, execution] = await Promise.all(["execution-manifest.json", "model-execution.json"].map((file) => readFile(`${stageRoot}/${file}`, "utf8").then(JSON.parse)));
assertV4(manifest.status === "frozen-two-paid-audio-transcriptions-authorized" && execution.retries === 0, "audio-verification execution is unavailable");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assertV4(sha256(await readFile(file)) === digest, `source hash mismatch during audio analysis: ${file}`);

const moves = [];
for (const call of manifest.calls) {
  const result = execution.results.find((item) => item.moveId === call.moveId);
  let deterministicEvidence = null;
  if (result.status === "completed") {
    const transcriptBytes = await readFile(call.transcriptPath);
    assertV4(sha256(transcriptBytes) === result.transcriptSha256, `${call.moveId}: transcript hash mismatch`);
    const transcriptText = transcriptBytes.toString("utf8").trim();
    const excerptRecall = bagOfWordsRecall(call.verificationExcerpt, transcriptText);
    deterministicEvidence = {
      status: excerptRecall >= manifest.deterministicThresholds.minimumFullClipExcerptRecall ? "verified" : "unresolved",
      excerptRecall,
      minimumRequiredRecall: manifest.deterministicThresholds.minimumFullClipExcerptRecall,
      referenceTokenCount: lexicalTokens(call.verificationExcerpt).length,
      audioTranscriptTokenCount: lexicalTokens(transcriptText).length,
      audioTranscriptNonempty: transcriptText.length > 0,
      clipHashMatched: true,
      transcriptHashMatched: true
    };
  }
  moves.push({
    debateNumber: call.debateNumber,
    debateId: call.debateId,
    moveId: call.moveId,
    expectedSpeaker: call.expectedSpeaker,
    status: deterministicEvidence?.status ?? "unresolved",
    clip: { path: call.clipPath, sha256: call.clipSha256, durationSeconds: call.durationSeconds },
    transcript: { path: call.transcriptPath, sha256: result.transcriptSha256, model: call.model },
    deterministicEvidence
  });
}
const verified = moves.filter((move) => move.status === "verified").length;
const unresolved = moves.length - verified;
const passed = verified === moves.length;
const audit = {
  schemaVersion: "4.2.21.17.4-medium-confidence-audio-verification-audit",
  protocolId: manifest.protocolId,
  status: passed ? "passed-all-two-medium-assessment-moves-audio-verified" : "medium-confidence-audio-verification-unresolved",
  debates: [{ debateNumber: "178", debateId: moves[0].debateId, moves }],
  thresholds: manifest.deterministicThresholds,
  totals: { requiredMoves: moves.length, verified, unresolved, paidTranscriptionCallsAttempted: execution.attempts, paidTranscriptionCallsCompleted: execution.callsCompleted, retries: 0, corrections: 0, clipMinutes: manifest.costEstimate.clipMinutes, estimatedSuccessfulProcessingCostUsd: execution.estimatedSuccessfulProcessingCostUsd, maximumAuthorizedCostUsd: execution.maximumAuthorizedCostUsd, judgmentModelApiCostUsd: 0, scoresDerived: 0 },
  authorization: { adjudicationPacketPreparation: passed, adjudicationModelExecution: false, finalLedgerAssembly: false, scoreDerivation: false, productionMutation: false }
};
const analysis = {
  schemaVersion: "4.2.21.17.4-medium-confidence-audio-analysis",
  protocolId: manifest.protocolId,
  status: audit.status,
  gate: { passed, requiredMoves: moves.length, verified, unresolved, deterministicThresholdApplied: true, locallySavedTranscripts: moves.every((move) => move.transcript.path.startsWith("output/transcribe/")) },
  costs: { paidTranscriptionCallsAttempted: execution.attempts, paidTranscriptionCallsCompleted: execution.callsCompleted, retries: 0, estimatedSuccessfulProcessingCostUsd: execution.estimatedSuccessfulProcessingCostUsd, maximumAuthorizedCostUsd: execution.maximumAuthorizedCostUsd, ChatGPTSubscriptionApplicable: false, judgmentModelApiCostUsd: 0 },
  authorization: audit.authorization
};
if (shouldWrite) {
  await writeFile(manifest.artifacts.audit, `${JSON.stringify(audit, null, 2)}\n`);
  await writeFile(manifest.artifacts.analysis, `${JSON.stringify(analysis, null, 2)}\n`);
}
console.log(JSON.stringify({ status: analysis.status, verified, unresolved, excerptRecalls: moves.map((move) => ({ moveId: move.moveId, recall: move.deterministicEvidence?.excerptRecall ?? null })), paidTranscriptionCallsAttempted: execution.attempts, retries: 0, estimatedSuccessfulProcessingCostUsd: execution.estimatedSuccessfulProcessingCostUsd, judgmentModelApiCostUsd: 0, scoresDerived: 0, nextAuthorized: passed ? "adjudication-packet-preparation" : "audio-failure-diagnosis-only" }, null, 2));
