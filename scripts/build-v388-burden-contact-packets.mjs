#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  V388_CONTACT_DEBATES,
  V388_CONTACT_INVENTORY,
  V388_CONTACT_PASSES,
  V388_CONTACT_PRIOR_ANALYSIS,
  V388_CONTACT_PRIOR_INVENTORY,
  V388_CONTACT_ROOT,
  V388_CONTACT_SECTION_ANALYSIS,
  V388_CONTACT_SOURCE_AUDIT,
  assert,
  buildV388ContactUniverse,
  canonicalJson,
  makeV388ContactSchema,
  rotateV388ContactUniverse,
  v388ContactBundleId
} from "./lib/v388-burden-contact.mjs";

const root = process.cwd();
const shouldWrite = process.argv.includes("--write");
const readBytes = (file) => readFile(path.resolve(root, file));
const readJson = async (file) => JSON.parse((await readBytes(file)).toString("utf8"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const tokenize = (value) => value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
const routeSemantics = (routes) => routes.map((route) => ({ routeId: route.routeId, side: route.side, description: route.description, successCriteria: route.successCriteria, bridges: route.bridges.map((bridge) => ({ bridgeId: bridge.bridgeId, tier: bridge.tier, description: bridge.description })) }));
const inheritedMoveSemantics = (move) => ({ sourceSpan: move.sourceSpan, atomicExcerpt: move.atomicExcerpt, proposition: move.proposition, speaker: move.speaker, side: move.side });

function locateUniqueTokenSpan(events, excerpt, label) {
  const tokens = [];
  for (let eventIndex = 0; eventIndex < events.length; eventIndex += 1) for (const token of tokenize(events[eventIndex].text)) tokens.push({ token, eventIndex });
  const query = tokenize(excerpt);
  assert(query.length > 0, `${label}: empty normalized excerpt`);
  const matches = [];
  outer: for (let index = 0; index <= tokens.length - query.length; index += 1) {
    for (let offset = 0; offset < query.length; offset += 1) if (tokens[index + offset].token !== query[offset]) continue outer;
    matches.push(index);
  }
  assert(matches.length === 1, `${label}: normalized atomic excerpt must occur exactly once in local events`);
  const startEvent = tokens[matches[0]].eventIndex;
  const endEvent = tokens[matches[0] + query.length - 1].eventIndex;
  return { startEvent, endEvent, startMs: events[startEvent].startMs, endMs: events[endEvent].startMs + events[endEvent].durationMs };
}

const [inventory, sectionAnalysis, priorAnalysis, priorInventory, sourceAudit] = await Promise.all([
  readJson(V388_CONTACT_INVENTORY),
  readJson(V388_CONTACT_SECTION_ANALYSIS),
  readJson(V388_CONTACT_PRIOR_ANALYSIS),
  readJson(V388_CONTACT_PRIOR_INVENTORY),
  readJson(V388_CONTACT_SOURCE_AUDIT)
]);
assert(inventory.status === "locked-score-free-coverage-inventory" && inventory.selectedMoveCount === 81 && inventory.debateCount === 3, "v3.8.8 coverage inventory invalid");
assert(sectionAnalysis.passed && sectionAnalysis.decision.burdenContactPreregistrationAuthorized && !sectionAnalysis.decision.burdenContactModelExecutionAuthorized, "section lock did not authorize burden-contact preregistration");
assert(priorAnalysis.status === "heldout-burden-contact-classification-pass" && priorAnalysis.results.final.resolved === 12, "prior contact consensus unavailable");

const oldDecisionByMove = new Map();
for (const decision of priorAnalysis.results.final.decisions) {
  assert(decision.supportingVotes === 2 && decision.resolved, `${decision.bundleId}: prior decision lacks two votes`);
  const priorDebate = priorInventory.debates.find((debate) => debate.debateNumber === decision.debateNumber);
  const coordinate = decision.bundleId.match(/-(\d+)$/)?.[1];
  const priorMove = priorDebate?.moves.find((move) => move.moveId.includes(`candidate-${coordinate}-`));
  assert(priorMove, `${decision.bundleId}: prior move unavailable`);
  oldDecisionByMove.set(priorMove.moveId, { decision, priorMove, priorDebate });
}

const inherited = [];
const excludedPrior = [];
const sourceChains = {};
const moveAudits = [];
const newMovesByDebate = new Map();
for (const debateNumber of V388_CONTACT_DEBATES) {
  const debate = inventory.debates.find((item) => item.debateNumber === debateNumber);
  const source = sourceAudit.debateSources[debateNumber];
  assert(debate && source && debate.debateId === source.debateId, `${debateNumber}: debate source mismatch`);
  const [transcriptBytes, eventBytes, manifestBytes] = await Promise.all([readBytes(source.transcriptPath), readBytes(source.eventsPath), readBytes(source.localManifestPath)]);
  assert(sha256(transcriptBytes) === source.transcriptSha256 && sha256(eventBytes) === source.eventsSha256 && sha256(manifestBytes) === source.localManifestSha256, `${debateNumber}: local source hash mismatch`);
  const events = JSON.parse(eventBytes.toString("utf8"));
  sourceChains[debateNumber] = { transcriptPath: source.transcriptPath, transcriptSha256: source.transcriptSha256, eventsPath: source.eventsPath, eventsSha256: source.eventsSha256, localManifestPath: source.localManifestPath, localManifestSha256: source.localManifestSha256 };
  const newMoves = [];
  for (let moveIndex = 0; moveIndex < debate.moves.length; moveIndex += 1) {
    const move = debate.moves[moveIndex];
    assert(move.attributionConfidence === "high", `${move.moveId}: audio verification required before classification`);
    const located = locateUniqueTokenSpan(events, move.atomicExcerpt, move.moveId);
    assert(canonicalJson(located) === canonicalJson(move.sourceSpan), `${move.moveId}: locked source span differs from local events`);
    moveAudits.push({ debateNumber, moveId: move.moveId, atomicExcerptSha256: sha256(move.atomicExcerpt), normalizedEventMatchCount: 1, sourceSpan: move.sourceSpan, attributionConfidence: "high", audioVerificationPending: false });
    const prior = oldDecisionByMove.get(move.moveId);
    if (prior) {
      assert(canonicalJson(inheritedMoveSemantics(prior.priorMove)) === canonicalJson(inheritedMoveSemantics(move)), `${move.moveId}: inherited move semantics changed`);
      assert(canonicalJson(routeSemantics(prior.priorDebate.routes)) === canonicalJson(routeSemantics(debate.routes)), `${move.moveId}: inherited route semantics changed`);
      const contact = prior.decision.finalSemanticTuple.burdenContact;
      if (contact) {
        const bridge = debate.routes.flatMap((route) => route.bridges).find((item) => item.bridgeId === contact.bridgeId);
        assert(bridge && bridge.tier === contact.tier, `${move.moveId}: inherited bridge unavailable`);
      }
      inherited.push({ debateNumber, debateId: debate.debateId, moveId: move.moveId, sourceSpan: move.sourceSpan, atomicExcerptSha256: sha256(move.atomicExcerpt), finalSemanticTuple: prior.decision.finalSemanticTuple, supportingVotes: 2, priorBundleId: prior.decision.bundleId, provenance: { analysis: V388_CONTACT_PRIOR_ANALYSIS, passAOutput: `docs/calibration/v3.8.3/held-out-burden-contact-classification-gate/outputs/pass-a/debate-${debateNumber}.json`, passBOutput: `docs/calibration/v3.8.3/held-out-burden-contact-classification-gate/outputs/pass-b/debate-${debateNumber}.json` } });
    } else newMoves.push({ move, moveIndex });
  }
  newMovesByDebate.set(debateNumber, newMoves);
}
for (const [moveId, prior] of oldDecisionByMove) if (!inventory.debates.some((debate) => debate.moves.some((move) => move.moveId === moveId))) excludedPrior.push({ debateNumber: prior.decision.debateNumber, moveId, priorBundleId: prior.decision.bundleId, disposition: "not-inherited-move-identity-does-not-survive-v3.8.8-inventory" });
assert(inherited.length === 9 && excludedPrior.length === 3, "expected nine exact inherited tuples and three excluded prior tuples");
assert(V388_CONTACT_DEBATES.every((number) => inherited.filter((item) => item.debateNumber === number).length === 3), "expected three inherited tuples per debate");
assert([...newMovesByDebate.values()].reduce((sum, moves) => sum + moves.length, 0) === 72, "expected 72 new move classifications");

const sealedMap = { schemaVersion: "3.8.8-sealed-burden-contact-option-map", status: "sealed-from-model-contexts", warning: "This map and the inherited ledger are never available to initial classifier contexts.", passes: {} };
let globalNewIndex = 0;
for (const reviewerPass of V388_CONTACT_PASSES) {
  sealedMap.passes[reviewerPass] = {};
  globalNewIndex = 0;
  for (const debateNumber of V388_CONTACT_DEBATES) {
    const debate = inventory.debates.find((item) => item.debateNumber === debateNumber);
    const bundles = newMovesByDebate.get(debateNumber).map(({ move, moveIndex }) => {
      const universe = buildV388ContactUniverse(debate.routes);
      const shiftA = globalNewIndex % universe.length;
      const shift = reviewerPass === "pass-a" ? shiftA : (shiftA + 11) % universe.length;
      globalNewIndex += 1;
      const ordered = rotateV388ContactUniverse(universe, shift);
      const bundleId = v388ContactBundleId(debateNumber, moveIndex);
      sealedMap.passes[reviewerPass][bundleId] = { debateNumber, moveId: move.moveId, options: ordered.map((semanticTuple, optionIndex) => ({ optionId: `option-${String(optionIndex + 1).padStart(2, "0")}`, semanticTuple })) };
      return {
        bundleId,
        family: "burden-contact",
        moveId: move.moveId,
        sourceSpan: move.sourceSpan,
        atomicExcerpt: move.atomicExcerpt,
        speakerAttributionConfidence: move.attributionConfidence,
        decisionContext: { motion: debate.motion, speaker: { name: move.speaker, side: move.side }, routes: routeSemantics(debate.routes) },
        independentFields: ["burdenContact"],
        candidates: ordered.map((values, optionIndex) => ({ optionId: `option-${String(optionIndex + 1).padStart(2, "0")}`, values }))
      };
    });
    const packet = { schemaVersion: "3.8.8-burden-contact-packet", protocolId: "v3.8.8-burden-contact-consensus", debateNumber, debateId: debate.debateId, reviewerPass, verifiedSourceChain: sourceChains[debateNumber], inheritedTuplesVisible: false, bundles };
    const schema = makeV388ContactSchema(packet);
    if (shouldWrite) {
      const packetPath = path.resolve(root, `${V388_CONTACT_ROOT}/packets/${reviewerPass}/debate-${debateNumber}.json`);
      const schemaPath = path.resolve(root, `${V388_CONTACT_ROOT}/schemas/${reviewerPass}/debate-${debateNumber}.schema.json`);
      await mkdir(path.dirname(packetPath), { recursive: true });
      await mkdir(path.dirname(schemaPath), { recursive: true });
      await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`);
      await writeFile(schemaPath, `${JSON.stringify(schema, null, 2)}\n`);
    }
  }
}

const inheritedLedger = { schemaVersion: "3.8.8-inherited-burden-contact-ledger", status: "locked-exact-identity-carry-forward", sourceAnalysis: V388_CONTACT_PRIOR_ANALYSIS, inheritedCount: inherited.length, excludedPriorCount: excludedPrior.length, inherited, excludedPrior };
const audit = {
  schemaVersion: "3.8.8-burden-contact-packet-construction-audit",
  status: "passed",
  sources: { coverageInventory: V388_CONTACT_INVENTORY, sectionAnalysis: V388_CONTACT_SECTION_ANALYSIS, priorAnalysis: V388_CONTACT_PRIOR_ANALYSIS, priorInventory: V388_CONTACT_PRIOR_INVENTORY, sourceAudit: V388_CONTACT_SOURCE_AUDIT },
  sourceChains,
  moveAudits,
  totals: { debates: 3, finalMoves: 81, inheritedTwoVoteTuples: 9, excludedPriorTuples: 3, newMoveClassifications: 72, newByDebate: Object.fromEntries(V388_CONTACT_DEBATES.map((number) => [number, newMovesByDebate.get(number).length])), initialContexts: 6, candidatesPerMove: 21, highConfidenceAttributions: 81, pendingAudioVerifications: 0, scoringFields: 0, modelContextsExecuted: 0, meteredApiCostUsd: 0, transcriptionCostUsd: 0 }
};
if (shouldWrite) {
  await mkdir(path.resolve(root, V388_CONTACT_ROOT), { recursive: true });
  await writeFile(path.resolve(root, `${V388_CONTACT_ROOT}/sealed-option-map.json`), `${JSON.stringify(sealedMap, null, 2)}\n`);
  await writeFile(path.resolve(root, `${V388_CONTACT_ROOT}/inherited-consensus-ledger.json`), `${JSON.stringify(inheritedLedger, null, 2)}\n`);
  await writeFile(path.resolve(root, `${V388_CONTACT_ROOT}/packet-construction-audit.json`), `${JSON.stringify(audit, null, 2)}\n`);
}
console.log(JSON.stringify({ status: shouldWrite ? "written" : "preview", debates: 3, finalMoves: 81, inheritedTwoVoteTuples: 9, newMoveClassifications: 72, newByDebate: audit.totals.newByDebate, initialContexts: 6, candidatesPerMove: 21, pendingAudioVerifications: 0, scoringAuthorized: false }, null, 2));
