#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { compoundFields } from "./lib/v34-conservative-review.mjs";
import { assert, sha256 } from "./lib/v36-decision-cards.mjs";
import { occurrenceCount, uniqueEvidenceText } from "./lib/v361-evidence-context.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.6.1/decision-card-development", shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`), manifest = JSON.parse(manifestText);
assert(manifest.status === "frozen-before-normalization", "v3.6.1 manifest identity invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `decision-source hash mismatch: ${file}`);
const priorFixturePath = "docs/calibration/v3.6/decision-card-development/retired-fixtures.json";
const priorFixtureText = await read(priorFixturePath), prior = JSON.parse(priorFixtureText), normalized = structuredClone(prior);
normalized.schemaVersion = "3.6.1-retired-decision-card-fixtures";
normalized.workflowVersion = manifest.workflowVersion;
normalized.rubricVersion = manifest.rubricVersion;
normalized.builtAt = manifest.frozenAt;
normalized.sources = { manifestSha256: sha256(manifestText), priorRetiredFixturesSha256: sha256(priorFixtureText) };
let expandedEvidenceFields = 0, activeEvidenceFields = 0;
function normalizedText(excerpt, span) {
  if (!span) return null;
  activeEvidenceFields += 1;
  const value = uniqueEvidenceText(excerpt, span, manifest.maximumEvidenceWindowCharacters);
  if (value !== span.text) expandedEvidenceFields += 1;
  assert(occurrenceCount(excerpt, value) === 1, "normalized evidence remains ambiguous");
  return value;
}
for (const debate of manifest.sample.debates) {
  const input = JSON.parse(await read(debate.sources.input.path)), gold = JSON.parse(await read(debate.sources.gold.path));
  const challengeById = new Map(input.cases.map((item) => [item.caseId, item])), goldById = new Map(gold.annotations.map((item) => [item.caseId, item]));
  const artifactDebate = normalized.debates.find((item) => item.debateId === debate.debateId);
  for (const fixture of artifactDebate.cases) {
    const challengeCase = challengeById.get(fixture.caseId), expected = goldById.get(fixture.caseId), excerpt = challengeCase.sourceExcerpt;
    fixture.targetCard.directTarget.evidenceText = fixture.targetCard.directTarget.contact ? normalizedText(excerpt, expected.targetEvidence) : null;
    fixture.targetCard.components.forEach((component, index) => { component.evidenceText = expected.componentContacts[index].contacted ? normalizedText(excerpt, expected.componentContacts[index].evidence) : null; });
    fixture.targetCard.example.evidenceText = expected.connectedExample ? normalizedText(excerpt, expected.connectionEvidence) : null;
    fixture.targetCard.scope.evidenceText = expected.scopeRelation === "same" ? null : normalizedText(excerpt, expected.scopeEvidence);
    fixture.targetCard.contrary.evidenceText = expected.relevantContraryMaterial ? normalizedText(excerpt, expected.contraryEvidence) : null;
    fixture.diagnosticCard.defect.cueText = expected.defectType === "none" ? null : normalizedText(excerpt, expected.defectCue);
    fixture.diagnosticCard.consequence.cueText = expected.consequenceStated ? normalizedText(excerpt, expected.consequenceCue) : null;
    fixture.reframeCard.malformedCueText = expected.malformedDemandExplained ? normalizedText(excerpt, expected.malformedDemandCue) : null;
    fixture.reframeCard.replacementCueText = expected.replacementDemandStated ? normalizedText(excerpt, expected.replacementDemandCue) : null;
    const goldFields = new Map(compoundFields(expected));
    for (const packet of fixture.burdenPackets) {
      const value = goldFields.get(packet.fieldPath);
      const active = packet.fieldPath === "burdenAdjustment" ? value.value !== "retained" : value.tier !== "none";
      packet.card.evidenceText = active ? normalizedText(excerpt, value.evidence) : null;
    }
  }
}
function collectEvidenceStrings(value, output = []) {
  if (!value || typeof value !== "object") return output;
  for (const [key, child] of Object.entries(value)) {
    if (["evidenceText", "cueText", "malformedCueText", "replacementCueText", "linkCueText", "relationText"].includes(key) && typeof child === "string") output.push(child);
    else collectEvidenceStrings(child, output);
  }
  return output;
}
let ambiguousEvidenceFields = 0;
for (const debate of manifest.sample.debates) {
  const input = JSON.parse(await read(debate.sources.input.path)), challengeById = new Map(input.cases.map((item) => [item.caseId, item]));
  const artifactDebate = normalized.debates.find((item) => item.debateId === debate.debateId);
  for (const fixture of artifactDebate.cases) for (const value of collectEvidenceStrings(fixture)) if (occurrenceCount(challengeById.get(fixture.caseId).sourceExcerpt, value) !== 1) ambiguousEvidenceFields += 1;
}
normalized.audit = { ...normalized.audit, activeGoldEvidenceFieldsNormalized: activeEvidenceFields, expandedEvidenceFields, ambiguousEvidenceFields, maximumEvidenceWindowCharacters: manifest.maximumEvidenceWindowCharacters, modelContextsExecuted: 0, scoreFieldsPresent: false };
const outputText = `${JSON.stringify(normalized, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, manifest.outputs.normalizedRetiredFixtures), outputText);
else assert(await read(manifest.outputs.normalizedRetiredFixtures) === outputText, "normalized retired fixtures are stale or nondeterministic");
console.log(JSON.stringify({ status: shouldWrite ? "written" : "matched", ...normalized.audit, sha256: sha256(outputText) }, null, 2));
