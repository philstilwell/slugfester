#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { compoundFields, sameSemantic } from "./lib/v34-conservative-review.mjs";
import { V36_RUBRIC, V36_SCHEMA_VERSION, V36_WORKFLOW, assert, sha256 } from "./lib/v36-decision-cards.mjs";

const root = process.cwd(), gateRoot = "docs/calibration/v3.6/decision-card-development", shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const manifestText = await read(`${gateRoot}/gate-manifest.json`), manifest = JSON.parse(manifestText);
assert(manifest.status === "frozen-before-fixture-build" && manifest.workflowVersion === V36_WORKFLOW && manifest.rubricVersion === V36_RUBRIC, "v3.6 manifest identity invalid");
for (const [file, digest] of Object.entries(manifest.sourceHashes)) assert(sha256(await read(file)) === digest, `decision-source hash mismatch: ${file}`);
const linkKeyText = await read(`${gateRoot}/retired-link-key.json`), linkKey = JSON.parse(linkKeyText);

const text = (span) => span?.text ?? null;
function envelope(excerpt, spans) {
  const active = spans.filter(Boolean);
  const start = Math.min(...active.map((item) => item.startChar)), end = Math.max(...active.map((item) => item.endChar));
  return excerpt.slice(start, end);
}
function targetCard(challengeCase, gold) {
  const anyComponent = gold.componentContacts.some((item) => item.contacted);
  const familyTarget = anyComponent || gold.relevantContraryMaterial || gold.scopeRelation !== "same";
  const directContact = gold.originalTargetContact && !familyTarget;
  return {
    schemaVersion: V36_SCHEMA_VERSION, family: "target-component-example", caseId: gold.caseId, moveId: gold.moveId,
    directTarget: { contact: directContact, evidenceText: directContact ? text(gold.targetEvidence) : null },
    components: gold.componentContacts.map((item) => ({ componentId: item.componentId, contactMode: item.contacted ? "exact-proposition" : "none", evidenceText: text(item.evidence), licenseText: null })),
    example: { classification: gold.connectedExample ? "distinct-connected-example" : "none", evidenceText: text(gold.connectionEvidence) },
    scope: { relation: gold.scopeRelation, evidenceText: text(gold.scopeEvidence) },
    contrary: { classification: gold.relevantContraryMaterial ? "relevant-no-component" : anyComponent ? "component-contact-precludes-contrary" : "none", evidenceText: text(gold.contraryEvidence) },
    rationale: "This retired development card restates the frozen gold target-family semantics as exact-text validator fixtures and is not an independent model judgment."
  };
}
function diagnosticCard(challengeCase, gold) {
  const link = gold.consequenceStated ? linkKey.diagnostic[gold.caseId] : null;
  if (gold.consequenceStated) assert(link, `${gold.caseId}: diagnostic relation key missing`);
  return {
    schemaVersion: V36_SCHEMA_VERSION, family: "diagnostic", caseId: gold.caseId, moveId: gold.moveId,
    defect: { cueText: text(gold.defectCue), type: gold.defectType },
    consequence: {
      cueText: text(gold.consequenceCue),
      linkCueText: link?.linkCueText ?? null,
      relationText: gold.consequenceStated ? envelope(challengeCase.sourceExcerpt, [gold.defectCue, gold.consequenceCue]) : null,
      relationKind: link?.relationKind ?? "none"
    },
    rationale: "This retired development card restates the frozen gold diagnostic bundle and manually adjudicated explicit relation cue solely to test validator behavior."
  };
}
function reframeCard(challengeCase, gold) {
  const both = gold.malformedDemandExplained && gold.replacementDemandStated;
  const link = both ? linkKey.reframe[gold.caseId] : null;
  if (both) assert(link, `${gold.caseId}: reframe relation key missing`);
  return {
    schemaVersion: V36_SCHEMA_VERSION, family: "reframe", caseId: gold.caseId, moveId: gold.moveId,
    malformedCueText: text(gold.malformedDemandCue), replacementCueText: text(gold.replacementDemandCue),
    linkCueText: link?.linkCueText ?? null,
    relationText: both ? envelope(challengeCase.sourceExcerpt, [gold.malformedDemandCue, gold.replacementDemandCue]) : null,
    relationKind: link?.relationKind ?? "none",
    rationale: "This retired development card restates the frozen gold reframe bundle and explicit relation cue solely as a deterministic validator fixture."
  };
}
function burdenCard(challengeCase, fieldPath, candidate1, candidate2, goldValue) {
  const matches1 = sameSemantic(fieldPath, candidate1, goldValue), matches2 = sameSemantic(fieldPath, candidate2, goldValue);
  assert(matches1 !== matches2, `${challengeCase.caseId}.${fieldPath}: gold must match exactly one burden candidate`);
  const selected = matches1 ? candidate1 : candidate2;
  let qualifyingCue, evidenceText;
  if (fieldPath === "burdenAdjustment") {
    qualifyingCue = selected.value === "retained" ? "default-retained" : selected.value === "reassigned" ? "explicit-reassignment" : "explicit-replacement";
    evidenceText = selected.value === "retained" ? null : text(goldValue.evidence);
  } else if (selected.tier === "none") {
    qualifyingCue = "default-no-contact"; evidenceText = null;
  } else {
    const keyed = linkKey.burden[`${challengeCase.caseId}::${fieldPath}`];
    assert(keyed, `${challengeCase.caseId}.${fieldPath}: burden qualifier key missing`);
    qualifyingCue = keyed.qualifyingCue; evidenceText = text(goldValue.evidence);
  }
  return {
    schemaVersion: V36_SCHEMA_VERSION, family: "burden-conflict", caseId: challengeCase.caseId, moveId: challengeCase.moveId, fieldPath,
    candidateSelection: matches1 ? "candidate-1" : "candidate-2", qualifyingCue, evidenceText,
    rationale: "This candidate-bound retired development card selects the one frozen raw burden candidate matching gold and exists only to test the decision-card validator."
  };
}

const debates = [];
let familyCards = 0, burdenCards = 0;
for (const debate of manifest.sample.debates) {
  const sourceTexts = {};
  for (const [key, source] of Object.entries(debate.sources)) {
    sourceTexts[key] = await read(source.path);
    assert(sha256(sourceTexts[key]) === source.sha256, `${debate.debateId}: source hash mismatch for ${key}`);
  }
  const input = JSON.parse(sourceTexts.input), passA = JSON.parse(sourceTexts.passA), passB = JSON.parse(sourceTexts.passB), gold = JSON.parse(sourceTexts.gold);
  const maps = Object.fromEntries(Object.entries({ A: passA.annotations, B: passB.annotations, K: gold.annotations }).map(([key, values]) => [key, new Map(values.map((item) => [item.caseId, item]))]));
  const cases = [];
  for (const challengeCase of input.cases) {
    const K = maps.K.get(challengeCase.caseId), A = maps.A.get(challengeCase.caseId), B = maps.B.get(challengeCase.caseId);
    const fields = Object.fromEntries(["A", "B", "K"].map((key) => [key, new Map(compoundFields({ A, B, K }[key]))]));
    const burdenPackets = [];
    for (const fieldPath of ["burdenAdjustment", "burdenContact"]) {
      const candidate1 = fields.A.get(fieldPath), candidate2 = fields.B.get(fieldPath);
      if (!sameSemantic(fieldPath, candidate1, candidate2)) {
        burdenPackets.push({ fieldPath, candidate1, candidate2, card: burdenCard(challengeCase, fieldPath, candidate1, candidate2, fields.K.get(fieldPath)) });
        burdenCards += 1;
      }
    }
    cases.push({ caseId: challengeCase.caseId, moveId: challengeCase.moveId, targetCard: targetCard(challengeCase, K), diagnosticCard: diagnosticCard(challengeCase, K), reframeCard: reframeCard(challengeCase, K), burdenPackets });
    familyCards += 3;
  }
  debates.push({ debateId: debate.debateId, debateNumber: debate.debateNumber, cases });
}
const artifact = {
  schemaVersion: "3.6-retired-decision-card-fixtures", workflowVersion: V36_WORKFLOW, rubricVersion: V36_RUBRIC,
  builtAt: manifest.frozenAt, calibrationOnly: true, independentModelJudgment: false,
  sources: { manifestSha256: sha256(manifestText), linkKeySha256: sha256(linkKeyText) }, debates,
  audit: { debateCount: debates.length, caseCount: debates.reduce((sum, debate) => sum + debate.cases.length, 0), familyCardCount: familyCards, burdenConflictCardCount: burdenCards, modelContextsExecuted: 0, scoreFieldsPresent: false }
};
const outputText = `${JSON.stringify(artifact, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, manifest.outputs.retiredFixtures), outputText);
else assert(await read(manifest.outputs.retiredFixtures) === outputText, "retired fixture artifact is stale or nondeterministic");
console.log(JSON.stringify({ status: shouldWrite ? "written" : "matched", ...artifact.audit, sha256: sha256(outputText) }, null, 2));
