#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v36-decision-cards.mjs";
import { V376_CASES } from "./lib/v376-burden-contact.mjs";
import { V376D_CASES, V376D_CORPUS_AUDIT, V376D_DEBATES, V376D_PASSES, V376D_ROOT, V376D_SOURCE, assert, canonicalJson, makeV376DSchema, v376dCoordinate } from "./lib/v376d-burden-contact.mjs";

const root = process.cwd(), shouldWrite = process.argv.includes("--write"), read = (file) => readFile(path.resolve(root, file), "utf8"), readJson = async (file) => JSON.parse(await read(file));
const sourceText = await read(V376D_SOURCE), source = JSON.parse(sourceText), corpusAuditText = await read(V376D_CORPUS_AUDIT), corpusAudit = JSON.parse(corpusAuditText);
const sourceCases = new Map(source.cases.map((item) => [item.caseId, item]));
const priorCoordinates = new Set(V376_CASES.map((item) => item.caseId.replace(/^v291-dev-/, "")));
const tokenize = (value) => value.toLowerCase().match(/[a-z0-9]+/g) ?? [];

function locateUniqueTokenSpan(events, excerpt, label) {
  const tokens = [];
  for (let eventIndex = 0; eventIndex < events.length; eventIndex += 1) for (const token of tokenize(events[eventIndex].text)) tokens.push({ token, eventIndex });
  const query = tokenize(excerpt), matches = [];
  outer: for (let index = 0; index <= tokens.length - query.length; index += 1) {
    for (let offset = 0; offset < query.length; offset += 1) if (tokens[index + offset].token !== query[offset]) continue outer;
    matches.push(index);
  }
  assert(matches.length === 1, `${label}: normalized excerpt must occur exactly once in local events`);
  const startEvent = tokens[matches[0]].eventIndex, endEvent = tokens[matches[0] + query.length - 1].eventIndex;
  return { startMs: events[startEvent].startMs, endMs: events[endEvent].startMs + events[endEvent].durationMs, startEvent, endEvent };
}

const debateSources = {}, auditedCases = [];
for (const debateNumber of V376D_DEBATES) {
  const entry = corpusAudit.entries.find((item) => item.debateNumber === debateNumber);
  assert(entry?.status === "available" && entry.transcriptStorage && entry.eventsStorage, `${debateNumber}: local transcript unavailable`);
  const transcriptText = await read(entry.transcriptStorage), eventsText = await read(entry.eventsStorage), events = JSON.parse(eventsText);
  assert(sha256(transcriptText) === entry.transcriptSha256 && sha256(eventsText) === entry.normalizedEventsSha256, `${debateNumber}: local transcript hash mismatch`);
  debateSources[debateNumber] = { debateId: entry.debateId, videoId: entry.videoId, transcriptPath: entry.transcriptStorage, transcriptSha256: entry.transcriptSha256, eventsPath: entry.eventsStorage, eventsSha256: entry.normalizedEventsSha256, captionKind: entry.track.kind, wordCount: entry.wordCount, eventCount: entry.eventCount };
  for (const definition of V376D_CASES.filter((item) => item.debateNumber === debateNumber)) {
    const sourceCase = sourceCases.get(definition.sourceCaseId), coordinate = v376dCoordinate(definition.sourceCaseId);
    assert(sourceCase && sourceCase.debateNumber === debateNumber && sourceCase.lane === "dyadic", `${definition.sourceCaseId}: retired dyadic source invalid`);
    assert(!priorCoordinates.has(coordinate), `${definition.sourceCaseId}: overlaps v3.7.6 development coordinate`);
    const span = locateUniqueTokenSpan(events, sourceCase.sourceExcerpt, definition.sourceCaseId);
    auditedCases.push({ sourceCaseId: definition.sourceCaseId, caseCoordinate: coordinate, debateNumber, debateId: sourceCase.debateId, moveId: sourceCase.moveId, speaker: sourceCase.speaker, side: sourceCase.side, sourceExcerptSha256: sha256(sourceCase.sourceExcerpt), normalizedEventMatchCount: 1, sourceSpan: span, speakerAttributionConfidence: "high", attributionBasis: "Retired speaker label, uninterrupted dyadic turn, and position-specific content; the normalized excerpt matched one local timestamped span.", audioChecked: false, audioVerification: null });
  }
}

const sourceAudit = {
  schemaVersion: "3.7.6-disjoint-source-audit",
  status: "passed-local-transcript-and-case-disjointness",
  sourceFixture: { path: V376D_SOURCE, sha256: sha256(sourceText), retired: true },
  corpusAudit: { path: V376D_CORPUS_AUDIT, sha256: sha256(corpusAuditText) },
  debateSources,
  cases: auditedCases,
  totals: { debateCount: V376D_DEBATES.length, caseCount: auditedCases.length, dyadicDebates: V376D_DEBATES.length, multiSpeakerDebates: 0, developmentOverlapCoordinates: 0, uniqueLocalEventMatches: auditedCases.length, highConfidenceAttributions: auditedCases.length, mediumOrLowAttributions: 0, requiredAudioVerifications: 0, completedAudioVerifications: 0, paidTranscriptionCalls: 0 }
};

const built = V376D_CASES.map((definition) => {
  const sourceCase = sourceCases.get(definition.sourceCaseId), options = [{ burdenContact: null }, ...definition.route.bridges.flatMap((bridge) => ["support", "attack"].map((polarity) => ({ burdenContact: { polarity, tier: bridge.tier, bridgeId: bridge.id } })))];
  const reference = definition.fixture === null ? options[0] : options.find((item) => item.burdenContact?.polarity === definition.fixture.polarity && item.burdenContact?.bridgeId === definition.fixture.bridgeId);
  assert(reference, `${definition.sourceCaseId}: provisional reference absent from candidate universe`);
  return { definition, sourceCase, audit: auditedCases.find((item) => item.sourceCaseId === definition.sourceCaseId), options, reference };
});
const mapping = { schemaVersion: "3.7.6-disjoint-sealed-burden-contact-option-map", status: "sealed-from-model-contexts", warning: "Retired provisional references are AI-authored design checks, not human ground truth or a benchmark.", passes: {} };

for (const reviewerPass of V376D_PASSES) {
  mapping.passes[reviewerPass] = {};
  let globalIndex = 0;
  for (const debateNumber of V376D_DEBATES) {
    const bundles = built.filter((item) => item.definition.debateNumber === debateNumber).map((item) => {
      const shiftA = globalIndex % item.options.length, shift = reviewerPass === "pass-a" ? shiftA : (shiftA + Math.ceil(item.options.length / 2)) % item.options.length;
      globalIndex += 1;
      const ordered = [...item.options.slice(shift), ...item.options.slice(0, shift)], bundleId = `burden-contact-disjoint-${v376dCoordinate(item.definition.sourceCaseId)}`;
      mapping.passes[reviewerPass][bundleId] = { debateNumber, sourceCaseId: item.definition.sourceCaseId, caseCoordinate: v376dCoordinate(item.definition.sourceCaseId), options: ordered.map((value, index) => ({ optionId: `option-${index + 1}`, semanticTuple: value, matchesProvisionalReference: canonicalJson(value) === canonicalJson(item.reference) })) };
      return { bundleId, family: "burden-contact", sourceCaseId: item.definition.sourceCaseId, caseCoordinate: v376dCoordinate(item.definition.sourceCaseId), sourceExcerpt: item.sourceCase.sourceExcerpt, speakerAttributionConfidence: item.audit.speakerAttributionConfidence, sourceSpan: { startMs: item.audit.sourceSpan.startMs, endMs: item.audit.sourceSpan.endMs }, decisionContext: { speaker: { name: item.sourceCase.speaker, side: item.sourceCase.side }, lockedTarget: item.sourceCase.targetPacket.claim, route: item.definition.route }, independentFields: ["burdenContact"], candidates: ordered.map((values, index) => ({ optionId: `option-${index + 1}`, values })) };
    });
    const packet = { schemaVersion: "3.7.6-disjoint-burden-contact-packet", debateNumber, reviewerPass, allSpeakerAttributionConfidenceHigh: bundles.every((item) => item.speakerAttributionConfidence === "high"), bundles }, schema = makeV376DSchema(packet);
    if (shouldWrite) {
      const packetPath = path.resolve(root, V376D_ROOT, "packets", reviewerPass, `debate-${debateNumber}.json`), schemaPath = path.resolve(root, V376D_ROOT, "schemas", reviewerPass, `debate-${debateNumber}.schema.json`);
      await mkdir(path.dirname(packetPath), { recursive: true }); await mkdir(path.dirname(schemaPath), { recursive: true });
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`); await writeFile(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
    }
  }
}

if (shouldWrite) {
  await mkdir(path.resolve(root, V376D_ROOT), { recursive: true });
  await writeFile(path.resolve(root, V376D_ROOT, "source-audit.json"), `${JSON.stringify(sourceAudit, null, 2)}\n`);
  await writeFile(path.resolve(root, V376D_ROOT, "sealed-option-map.json"), `${JSON.stringify(mapping, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", debateCount: V376D_DEBATES.length, caseCount: built.length, casesPerDebate: Object.fromEntries(V376D_DEBATES.map((debate) => [debate, built.filter((item) => item.definition.debateNumber === debate).length])), candidateCountPerCase: 9, developmentOverlapCoordinates: 0, localTranscriptMatches: auditedCases.length, mediumOrLowAttributions: 0 }, null, 2));
