#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import {
  V383_AUDIO_REQUIRED,
  V383_DEBATES,
  V383_GATE_MANIFEST,
  V383_INVENTORY,
  V383_PASSES,
  V383_ROOT,
  V383_SOURCE_ANALYSIS,
  V383_SOURCE_AUDIT,
  assert,
  buildV383CandidateUniverse,
  canonicalJson,
  makeV383Schema,
  rotateV383Candidates,
  v383BundleId
} from "./lib/v383-burden-contact.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const readJson = async (file) => JSON.parse(await read(file));
const tokenize = (value) => value.toLowerCase().match(/[a-z0-9]+/g) ?? [];

function locateUniqueTokenSpan(events, excerpt, label) {
  const tokens = [];
  for (let eventIndex = 0; eventIndex < events.length; eventIndex += 1) {
    for (const token of tokenize(events[eventIndex].text)) tokens.push({ token, eventIndex });
  }
  const query = tokenize(excerpt);
  const matches = [];
  outer: for (let index = 0; index <= tokens.length - query.length; index += 1) {
    for (let offset = 0; offset < query.length; offset += 1) if (tokens[index + offset].token !== query[offset]) continue outer;
    matches.push(index);
  }
  assert(matches.length === 1, `${label}: normalized atomic excerpt must occur exactly once in local events`);
  const startEvent = tokens[matches[0]].eventIndex;
  const endEvent = tokens[matches[0] + query.length - 1].eventIndex;
  return {
    matchCount: matches.length,
    startEvent,
    endEvent,
    startMs: events[startEvent].startMs,
    endMs: events[endEvent].startMs + events[endEvent].durationMs
  };
}

const inventoryText = await read(V383_INVENTORY);
const inventory = JSON.parse(inventoryText);
const analysisText = await read(V383_SOURCE_ANALYSIS);
const analysis = JSON.parse(analysisText);
const audioText = await read(V383_AUDIO_REQUIRED);
const audio = JSON.parse(audioText);
const sourceAuditText = await read(V383_SOURCE_AUDIT);
const sourceAudit = JSON.parse(sourceAuditText);
const gateText = await read(V383_GATE_MANIFEST);
const gate = JSON.parse(gateText);

assert(inventory.status === "locked-source-inventory" && inventory.selectedMoveCount === 12, "source inventory is not locked and complete");
assert(analysis.sourcePreparationPassed === true && analysis.decision?.classificationPacketConstructionPreregistrationAuthorized === true, "source analysis did not authorize packet construction preregistration");
assert(analysis.decision?.burdenContactClassificationModelExecutionAuthorized === false, "upstream source stage unexpectedly authorized classification execution");
assert(audio.pendingCount === 0, "pending source audio verification blocks packet construction");

const mapping = {
  schemaVersion: "3.8.3-heldout-sealed-burden-contact-option-map",
  status: "sealed-from-model-contexts",
  warning: "Provisional source-preparation contacts are AI selection aids, not truth keys or benchmark labels.",
  passes: {}
};
const moveAudits = [];
const sourceChains = {};
let globalIndex = 0;

for (const debateNumber of V383_DEBATES) {
  const debate = inventory.debates.find((item) => item.debateNumber === debateNumber);
  const selected = gate.sample.debates.find((item) => item.number === debateNumber);
  const source = sourceAudit.debateSources[debateNumber];
  assert(debate && selected && source, `${debateNumber}: debate metadata missing`);
  assert(debate.debateId === selected.debateId && debate.debateId === source.debateId, `${debateNumber}: debate identity mismatch`);
  assert(debate.moves.length === 4 && debate.routes.length === 2, `${debateNumber}: inventory shape invalid`);
  const transcriptText = await read(source.transcriptPath);
  const eventsText = await read(source.eventsPath);
  const localManifestText = await read(source.localManifestPath);
  assert(sha256(transcriptText) === source.transcriptSha256, `${debateNumber}: transcript hash mismatch`);
  assert(sha256(eventsText) === source.eventsSha256, `${debateNumber}: events hash mismatch`);
  assert(sha256(localManifestText) === source.localManifestSha256, `${debateNumber}: local manifest hash mismatch`);
  const events = JSON.parse(eventsText);
  sourceChains[debateNumber] = {
    transcriptPath: source.transcriptPath,
    transcriptSha256: source.transcriptSha256,
    eventsPath: source.eventsPath,
    eventsSha256: source.eventsSha256,
    localManifestPath: source.localManifestPath,
    localManifestSha256: source.localManifestSha256
  };
  for (const move of debate.moves) {
    assert(move.accepted === true && move.attributionConfidence === "high", `${move.moveId}: only accepted high-confidence moves may enter packets`);
    assert(move.audioVerificationRequired === false, `${move.moveId}: unresolved audio requirement`);
    const located = locateUniqueTokenSpan(events, move.atomicExcerpt, move.moveId);
    assert(located.startEvent === move.sourceSpan.startEvent && located.endEvent === move.sourceSpan.endEvent, `${move.moveId}: source event span mismatch`);
    assert(located.startMs === move.sourceSpan.startMs && located.endMs === move.sourceSpan.endMs, `${move.moveId}: source time span mismatch`);
    moveAudits.push({ debateNumber, moveId: move.moveId, atomicExcerptSha256: sha256(move.atomicExcerpt), normalizedEventMatchCount: 1, sourceSpan: move.sourceSpan, attributionConfidence: move.attributionConfidence, audioVerificationRequired: false });
  }
}

for (const reviewerPass of V383_PASSES) {
  mapping.passes[reviewerPass] = {};
  globalIndex = 0;
  for (const debateNumber of V383_DEBATES) {
    const debate = inventory.debates.find((item) => item.debateNumber === debateNumber);
    const selected = gate.sample.debates.find((item) => item.number === debateNumber);
    const bundles = debate.moves.map((move) => {
      const universe = buildV383CandidateUniverse(debate.routes);
      const shiftA = globalIndex % universe.length;
      const shift = reviewerPass === "pass-a" ? shiftA : (shiftA + 11) % universe.length;
      globalIndex += 1;
      const ordered = rotateV383Candidates(universe, shift);
      const bundleId = v383BundleId(debateNumber, move.moveId);
      mapping.passes[reviewerPass][bundleId] = {
        debateNumber,
        moveId: move.moveId,
        options: ordered.map((semanticTuple, index) => ({
          optionId: `option-${String(index + 1).padStart(2, "0")}`,
          semanticTuple,
          matchesProvisionalAid: canonicalJson(semanticTuple.burdenContact) === canonicalJson(move.provisionalBurdenContact)
        }))
      };
      return {
        bundleId,
        family: "burden-contact",
        moveId: move.moveId,
        sourceSpan: move.sourceSpan,
        atomicExcerpt: move.atomicExcerpt,
        speakerAttributionConfidence: move.attributionConfidence,
        decisionContext: {
          motion: selected.motion,
          speaker: { name: move.speaker, side: move.side },
          routes: debate.routes
        },
        independentFields: ["burdenContact"],
        candidates: ordered.map((values, index) => ({ optionId: `option-${String(index + 1).padStart(2, "0")}`, values }))
      };
    });
    const packet = {
      schemaVersion: "3.8.3-heldout-burden-contact-packet",
      debateNumber,
      debateId: debate.debateId,
      reviewerPass,
      verifiedSourceChain: sourceChains[debateNumber],
      allSpeakerAttributionConfidenceHigh: true,
      bundles
    };
    const schema = makeV383Schema(packet);
    if (shouldWrite) {
      const packetPath = path.resolve(root, V383_ROOT, "packets", reviewerPass, `debate-${debateNumber}.json`);
      const schemaPath = path.resolve(root, V383_ROOT, "schemas", reviewerPass, `debate-${debateNumber}.schema.json`);
      await mkdir(path.dirname(packetPath), { recursive: true });
      await mkdir(path.dirname(schemaPath), { recursive: true });
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`);
      await writeFile(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
    }
  }
}

const audit = {
  schemaVersion: "3.8.3-heldout-classification-packet-construction-audit",
  status: "passed",
  sourceInventory: { path: V383_INVENTORY, sha256: sha256(inventoryText) },
  sourceAnalysis: { path: V383_SOURCE_ANALYSIS, sha256: sha256(analysisText) },
  audioRequirement: { path: V383_AUDIO_REQUIRED, sha256: sha256(audioText), pendingCount: audio.pendingCount },
  sourceAudit: { path: V383_SOURCE_AUDIT, sha256: sha256(sourceAuditText) },
  parentGateManifest: { path: V383_GATE_MANIFEST, sha256: sha256(gateText) },
  sourceChains,
  moves: moveAudits,
  totals: {
    debateCount: 3,
    moveCount: 12,
    modelContextCount: 6,
    candidatesPerMove: 21,
    uniqueLocalEventMatches: 12,
    highConfidenceAttributions: 12,
    requiredAudioVerifications: 0,
    pendingAudioVerifications: 0,
    scoringFields: 0,
    modelContextsExecuted: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0
  }
};

if (shouldWrite) {
  await mkdir(path.resolve(root, V383_ROOT), { recursive: true });
  await writeFile(path.resolve(root, V383_ROOT, "sealed-option-map.json"), `${JSON.stringify(mapping, null, 2)}\n`);
  await writeFile(path.resolve(root, V383_ROOT, "packet-construction-audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
}

console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", debateCount: 3, moveCount: 12, initialContextCount: 6, candidatesPerMove: 21, sourceSpansVerified: 12, requiredAudioVerifications: 0, modelContextsExecuted: 0 }, null, 2));
