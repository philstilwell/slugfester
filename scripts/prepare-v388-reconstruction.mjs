#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { debates as productionDebates } from "../src/data/debates.js";
import {
  V388_RECON_MODEL, V388_RECON_PROTOCOL, V388_RECON_ROOT,
  assertV388Recon, buildV388ReconstructionSchema, readBytes, readJson, sha256
} from "./lib/v388-reconstruction.mjs";

const root = process.cwd();
const write = process.argv.includes("--write");
const perfRoot = "docs/calibration/v3.8.8/performance-judgment-consensus";
const ledgerPath = `${perfRoot}/final-ledger.json`;
const scoresPath = `${perfRoot}/calculated-scores.json`;
const audioAuditPath = `${perfRoot}/audio-verification.json`;
const ledger = await readJson(root, ledgerPath);
const scores = await readJson(root, scoresPath);
const audioAudit = await readJson(root, audioAuditPath);

const selected = [
  { debateNumber: "55", side: "pro", sourceMoveId: "craig-malpass-kalam-nothing-2026-candidate-03-v381", text: "the series of events must have begun to exist", localTranscriptPath: "output/transcribe/v388-reconstruction-quote-verification/craig-malpass-kalam-nothing-2026/transcripts/craig-candidate-03.txt", localClipPath: "output/transcribe/v388-reconstruction-quote-verification/craig-malpass-kalam-nothing-2026/clips/craig-candidate-03.mp3", model: "gpt-4o-mini-transcribe", durationMinutes: 1.172 },
  { debateNumber: "55", side: "con", sourceMoveId: "craig-malpass-kalam-nothing-2026-coverage-10-v384", text: "I don't see why I should make a big metaphysical concession" },
  { debateNumber: "103", side: "pro", sourceMoveId: "woodford-edwards-rational-belief-god-2023-coverage-02-v384", text: "they don't agree on what's necessary to avoid it" },
  { debateNumber: "103", side: "con", sourceMoveId: "woodford-edwards-rational-belief-god-2023-coverage-06-v384", text: "our minds primarily serve truth" },
  { debateNumber: "161", side: "pro", sourceMoveId: "craig-millican-does-god-exist-2011-coverage-20-v384", text: "the three facts that I mentioned are agreed upon by the majority of historians today" },
  { debateNumber: "161", side: "con", sourceMoveId: "craig-millican-does-god-exist-2011-candidate-07-v381", text: "the world we see just doesn't match up to what you'd expect from a perfect God" }
];

const quoteRecords = [];
for (const q of selected) {
  const packet = await readJson(root, `${perfRoot}/packets/debate-${q.debateNumber}.json`);
  const move = packet.moves.find((item) => item.moveId === q.sourceMoveId);
  assertV388Recon(move && move.side === q.side && move.atomicExcerpt.includes(q.text), `${q.sourceMoveId}: caption quote mismatch`);
  let audioTranscript, transcriptPath, transcriptSha256, clipPath, clipSha256, model, inheritedVerification;
  if (q.localTranscriptPath) {
    audioTranscript = (await readBytes(root, q.localTranscriptPath)).toString("utf8");
    transcriptPath = q.localTranscriptPath;
    transcriptSha256 = sha256(await readBytes(root, transcriptPath));
    clipPath = q.localClipPath;
    clipSha256 = sha256(await readBytes(root, clipPath));
    model = q.model;
    inheritedVerification = false;
  } else {
    const inherited = audioAudit.debateAudits.flatMap((item) => item.moves).find((item) => item.moveId === q.sourceMoveId);
    assertV388Recon(inherited, `${q.sourceMoveId}: inherited audio verification missing`);
    audioTranscript = inherited.audioDerivedTranscript;
    transcriptPath = inherited.transcriptPath;
    transcriptSha256 = inherited.transcriptSha256;
    clipPath = inherited.clipPath;
    clipSha256 = inherited.clipSha256;
    model = audioAudit.transcription.model;
    inheritedVerification = true;
  }
  assertV388Recon(audioTranscript.includes(q.text), `${q.sourceMoveId}: audio quote mismatch`);
  quoteRecords.push({
    debateNumber: q.debateNumber, debateId: packet.debateId, side: q.side, speaker: move.speaker,
    sourceMoveId: q.sourceMoveId, text: q.text, sourceSpan: move.sourceSpan,
    captionExactMatch: true, audioTranscriptExactMatch: true, audioVerified: true,
    inheritedVerification, model, transcriptPath, transcriptSha256, clipPath, clipSha256
  });
}

const quoteVerification = {
  schemaVersion: "3.8.8-reconstruction-quote-verification",
  protocolId: V388_RECON_PROTOCOL,
  status: "passed-six-representative-quotes-audio-verified",
  quotes: quoteRecords,
  cost: {
    inheritedPerformanceVerificationEstimatedUsd: audioAudit.transcription.estimatedTranscriptionCostUsd,
    additionalDurationMinutes: 1.172,
    additionalModel: "gpt-4o-mini-transcribe",
    additionalOfficialEstimatedCostUsdPerMinute: 0.003,
    additionalEstimatedCostUsd: 0.003516,
    additionalAuthorizedCapUsd: 0.01,
    totalV388EstimatedTranscriptionCostUsd: audioAudit.transcription.estimatedTranscriptionCostUsd + 0.003516,
    exactBilledCostAvailable: false
  }
};

const packets = [], schemas = [];
for (const debateLedger of ledger.debates) {
  const debateScores = scores.debates.find((item) => item.debateNumber === debateLedger.debateNumber);
  const sourcePacketPath = `${perfRoot}/packets/debate-${debateLedger.debateNumber}.json`;
  const sourcePacket = await readJson(root, sourcePacketPath);
  const production = productionDebates.find((item) => item.number === debateLedger.debateNumber);
  assertV388Recon(production && production.id === debateLedger.debateId, `${debateLedger.debateNumber}: neutral metadata missing`);
  const quotes = Object.fromEntries(quoteRecords.filter((q) => q.debateNumber === debateLedger.debateNumber).map((q) => [q.side, q]));
  const metadata = { title: production.title, label: production.label, date: "2026-08-04", duration: production.duration, youtubeUrl: production.youtubeUrl, motion: sourcePacket.motion };
  const packet = {
    schemaVersion: "3.8.8-reconstruction-packet", protocolId: V388_RECON_PROTOCOL,
    debateNumber: debateLedger.debateNumber, debateId: debateLedger.debateId,
    metadata, sides: sourcePacket.sides, sourceChain: sourcePacket.sourceChain,
    routes: debateLedger.routes, sections: debateLedger.sections,
    moves: debateLedger.moves.map((move) => ({
      ...move,
      displayTime: `${Math.floor(move.sourceSpan.startMs / 60000)}:${String(Math.floor((move.sourceSpan.startMs % 60000) / 1000)).padStart(2, "0")}`
    })),
    calculatedScores: debateScores, representativeQuotes: quotes,
    prohibitedInputs: ["legacy scores", "legacy critiques", "legacy tags", "legacy Overall Commentary", "legacy AI Extension", "rankings", "winner labels"]
  };
  const schema = buildV388ReconstructionSchema({ ...debateLedger, sections: debateLedger.sections }, quotes);
  packets.push({ path: `${V388_RECON_ROOT}/packets/debate-${debateLedger.debateNumber}.json`, value: packet });
  schemas.push({ path: `${V388_RECON_ROOT}/schemas/debate-${debateLedger.debateNumber}.schema.json`, value: schema });
}

const plannedFiles = [
  { path: `${V388_RECON_ROOT}/quote-verification.json`, value: quoteVerification },
  ...packets, ...schemas
];
if (write) {
  for (const file of plannedFiles) {
    await mkdir(path.dirname(path.resolve(root, file.path)), { recursive: true });
    await writeFile(path.resolve(root, file.path), `${JSON.stringify(file.value, null, 2)}\n`);
  }
}

const sourceHashes = {};
for (const relativePath of [
  "docs/assessment-workflow-v3.8.4.md", "docs/reassessment-rubric-v3.8.4.md",
  `${V388_RECON_ROOT}/preregistration.md`, `${V388_RECON_ROOT}/manual.md`,
  ledgerPath, scoresPath, audioAuditPath,
  ...packets.map((x) => x.path), ...schemas.map((x) => x.path), `${V388_RECON_ROOT}/quote-verification.json`,
  ...ledger.debates.flatMap((d) => {
    const p = packets.find((x) => x.value.debateNumber === d.debateNumber).value.sourceChain;
    return [p.transcriptPath, p.eventsPath, p.localManifestPath];
  })
]) sourceHashes[relativePath] = sha256(await readBytes(root, relativePath));

const contexts = ledger.debates.map((d) => {
  const sourceChain = packets.find((x) => x.value.debateNumber === d.debateNumber).value.sourceChain;
  return {
    debateNumber: d.debateNumber, debateId: d.debateId,
    packet: `${V388_RECON_ROOT}/packets/debate-${d.debateNumber}.json`,
    schema: `${V388_RECON_ROOT}/schemas/debate-${d.debateNumber}.schema.json`,
    transcript: sourceChain.transcriptPath, events: sourceChain.eventsPath, sourceManifest: sourceChain.localManifestPath,
    output: `${V388_RECON_ROOT}/outputs/debate-${d.debateNumber}.json`
  };
});
const manifest = {
  schemaVersion: "3.8.8-reconstruction-execution-manifest", protocolId: V388_RECON_PROTOCOL,
  status: "frozen-three-context-recovered-diagnostic-authorized", createdAt: new Date().toISOString(),
  governance: { cleanV384GatePassPossible: false, diagnosticOnly: true, productionMutationAuthorized: false, tenDebateGateAuthorized: false, all195DebatesAuthorized: false },
  model: V388_RECON_MODEL,
  cost: { meteredModelApiCostUsd: 0, additionalTranscriptionEstimatedCostUsd: 0.003516, additionalTranscriptionCapUsd: 0.01 },
  executionPolicy: { contexts: 3, perInvocationTimeoutMs: 1200000, retriesAuthorized: 0, apiKeysRemoved: true, ephemeralCodexHome: true },
  sourceHashes, contexts,
  futureOutputs: contexts.map((x) => x.output),
  artifacts: { execution: `${V388_RECON_ROOT}/model-execution.json`, audit: `${V388_RECON_ROOT}/audit.json` },
  authorization: { reconstructionModelExecution: true, deterministicAudit: true, calibrationPreview: false, productionMutation: false, tenDebateGate: false, all195Debates: false }
};
if (write) await writeFile(path.resolve(root, `${V388_RECON_ROOT}/execution-manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({ status: "passed-reconstruction-preparation", quotes: quoteRecords.length, packets: packets.length, schemas: schemas.length, manifest: `${V388_RECON_ROOT}/execution-manifest.json`, written: write }, null, 2));
