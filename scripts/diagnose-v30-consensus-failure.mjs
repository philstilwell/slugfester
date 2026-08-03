#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sha256 } from "./lib/v30-consensus.mjs";

const root = process.cwd();
const gateRoot = "docs/calibration/v3.0/retired-three-debate-test";
const manifestPath = `${gateRoot}/gate-manifest.json`;
const analysisPath = `${gateRoot}/reliability-analysis.json`;
const outputPath = `${gateRoot}/failure-diagnostics.json`;
const shouldWrite = process.argv.includes("--write");
const read = (file) => readFile(path.resolve(root, file), "utf8");
const [manifestText, analysisText] = await Promise.all([read(manifestPath), read(analysisPath)]);
const manifest = JSON.parse(manifestText);
const semanticFields = (annotation) => [
  ["targetContact", annotation.originalTargetContact],
  ["connectedExample", annotation.connectedExample],
  ["scope", annotation.scopeRelation],
  ["burdenAdjustment", annotation.burdenAdjustment],
  ...annotation.componentContacts.map((item) => [`component:${item.componentId}`, item.contacted]),
  ["contrary", annotation.relevantContraryMaterial],
  ["defect", annotation.defectType],
  ["consequence", annotation.consequenceStated],
  ["malformed", annotation.malformedDemandExplained],
  ["replacement", annotation.replacementDemandStated],
  ["burdenContact", JSON.stringify([annotation.burdenContact.tier, annotation.burdenContact.bridgeId])]
];
const blank = () => ({ agreedCorrect: 0, agreedWrong: 0, disputedFinalCorrect: 0, disputedFinalWrong: 0, correctCandidateAvailable: 0, neitherCandidateCorrect: 0, total: 0 });
const totals = blank();
const byField = {};
let compoundDisputeCount = 0;
for (const debate of manifest.sample.debates) {
  const outputs = manifest.outputs[debate.debateId];
  const [inputText, passAText, passBText, goldText, finalLockText, packetText] = await Promise.all([read(debate.path), read(outputs.passA), read(outputs.passB), read(debate.gold.path), read(outputs.finalLock), read(outputs.disputePacket)]);
  const input = JSON.parse(inputText);
  const artifacts = {
    A: new Map(JSON.parse(passAText).annotations.map((item) => [item.caseId, item])),
    B: new Map(JSON.parse(passBText).annotations.map((item) => [item.caseId, item])),
    K: new Map(JSON.parse(goldText).annotations.map((item) => [item.caseId, item])),
    F: new Map(JSON.parse(finalLockText).cases.map((item) => [item.caseId, item.annotation]))
  };
  compoundDisputeCount += JSON.parse(packetText).disputeCount;
  for (const challengeCase of input.cases) {
    const maps = Object.fromEntries(Object.entries(artifacts).map(([name, artifact]) => [name, new Map(semanticFields(artifact.get(challengeCase.caseId)))]));
    for (const [fieldPath, goldValue] of maps.K) {
      const group = fieldPath.startsWith("component:") ? "component" : fieldPath;
      byField[group] ??= blank();
      totals.total += 1;
      byField[group].total += 1;
      const a = JSON.stringify(maps.A.get(fieldPath));
      const b = JSON.stringify(maps.B.get(fieldPath));
      const k = JSON.stringify(goldValue);
      const f = JSON.stringify(maps.F.get(fieldPath));
      const agreed = a === b;
      const finalCorrect = f === k;
      const bucket = agreed ? (finalCorrect ? "agreedCorrect" : "agreedWrong") : (finalCorrect ? "disputedFinalCorrect" : "disputedFinalWrong");
      totals[bucket] += 1;
      byField[group][bucket] += 1;
      if (!agreed) {
        const oracle = a === k || b === k;
        const oracleBucket = oracle ? "correctCandidateAvailable" : "neitherCandidateCorrect";
        totals[oracleBucket] += 1;
        byField[group][oracleBucket] += 1;
      }
    }
  }
}
const semanticDisputeCount = totals.disputedFinalCorrect + totals.disputedFinalWrong;
const diagnostic = {
  schemaVersion: "3.0-retired-consensus-failure-diagnostics",
  createdAt: new Date().toISOString(),
  sources: { manifestPath, manifestSha256: sha256(manifestText), analysisPath, analysisSha256: sha256(analysisText) },
  counts: {
    semanticJudgmentCount: totals.total,
    compoundDisputeCount,
    semanticDisputeCount,
    evidenceOnlyDisputeCount: compoundDisputeCount - semanticDisputeCount,
    rawAgreedSemanticCount: totals.agreedCorrect + totals.agreedWrong,
    rawAgreedButWrongCount: totals.agreedWrong,
    disputedFinalCorrectCount: totals.disputedFinalCorrect,
    disputedFinalWrongCount: totals.disputedFinalWrong,
    disputedCorrectCandidateAvailableCount: totals.correctCandidateAvailable,
    disputedNeitherCandidateCorrectCount: totals.neitherCandidateCorrect
  },
  rates: {
    sharedErrorAmongAgreements: totals.agreedWrong / (totals.agreedCorrect + totals.agreedWrong),
    adjudicatorSemanticAccuracy: totals.disputedFinalCorrect / semanticDisputeCount,
    correctCandidateAvailabilityOnSemanticDisputes: totals.correctCandidateAvailable / semanticDisputeCount,
    evidenceOnlyShareOfCompoundDisputes: (compoundDisputeCount - semanticDisputeCount) / compoundDisputeCount
  },
  byField,
  diagnosis: [
    "Dispute-only adjudication cannot repair correlated same-model errors when both raw passes agree on the same wrong semantic value.",
    "The adjudicator selected the gold-matching candidate on only 7 of 25 semantic disputes even though one raw candidate matched gold on 23 of 25.",
    "Exact evidence-span differences created 46 of 71 adjudication items and likely diluted attention from the 25 semantic conflicts.",
    "Target contact and burden-route tier remained fully accurate; overclassification concentrated in connected examples, scope changes, component contact, defect typing, consequences, and reframes."
  ],
  postHocRecommendations: [
    "Separate semantic disputes from evidence-span canonicalization; adjudicate semantics first and select the shortest valid evidence span mechanically afterward.",
    "Add a conservative verification stage for high-risk positive fields even when A and B agree, because shared agreement is not an accuracy guarantee.",
    "Use explicit per-field adjudication questions and default-presumption reminders instead of one long mixed dispute list.",
    "Retain target-contact and burden-tier rules, which passed, and do not remove multi-speaker debates based on this result."
  ]
};
const outputText = `${JSON.stringify(diagnostic, null, 2)}\n`;
if (shouldWrite) await writeFile(path.resolve(root, outputPath), outputText);
console.log(outputText);

