#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V423_ROOT } from "./lib/v423-chronology-fresh.mjs";

const shouldWrite = process.argv.includes("--write");
const sample = JSON.parse(await readFile(path.resolve(V423_ROOT, "source-only-sample.json"), "utf8"));
assertV4(sample.status === "frozen-before-legacy-score-access" && sample.audit.priorFreshGateOverlap === 0 && !sample.selectionBoundary.legacyAssessmentContentAccessed, "v4.2.3 frozen sample unavailable");
const misclassified = sample.debates.filter((debate) => debate.debateId === "bertuzzi-schieber-evil-evidence-2019" && debate.family === "mind-agency" && /pain|pleasure|horrendous evil|naturalism over theism|soul-building|skeptical theism/i.test(debate.motion));
assertV4(misclassified.length === 1, "expected v4.2.3 semantic family defect unavailable");
const screening = {
  schemaVersion: "4.2.3-source-only-sample-screening",
  protocolId: sample.protocolId,
  status: "sample-rejected-before-packet-preparation",
  modelContextsExecuted: 0,
  legacyAssessmentContentAccessed: false,
  legacyScoresAccessed: false,
  defects: [{ debateNumber: misclassified[0].number, debateId: misclassified[0].debateId, assignedFamily: misclassified[0].family, substantiveFamily: "evil-hiddenness", cause: "the mind-agency regex matched the substring soul in soul-building before the evil-family rule was considered" }],
  gateCoverage: { nominalFamilies: 6, substantiveFamilies: 5, duplicateSubstantiveFamily: "evil-hiddenness", missingSubstantiveFamily: "mind-agency", durationStratificationPassed: true },
  disposition: { v423PacketPreparationAuthorized: false, v423PrimaryExecutionAuthorized: false, retryWithSameSampleAuthorized: false, allSixV423IdentitiesBecomeSourceSelectionExclusions: true, revisedSourceOnlySelectorAuthorized: true, scoringAuthorized: false, legacyComparisonAuthorized: false, productionMutationAuthorized: false },
  correctiveRule: { evilHiddennessEvaluatedBeforeMindAgency: true, bareSoulTokenRemovedFromMindAgency: true, explicitMindAgencyTermsRetained: ["conscious", "mind", "free will", "personal identity", "agency", "mental causation"], sourceOnlyMotionClassificationRetained: true }
};
if (shouldWrite) await writeFile(path.resolve(V423_ROOT, "sample-screening.json"), `${JSON.stringify(screening, null, 2)}\n`);
console.log(JSON.stringify({ status: screening.status, defects: screening.defects, ...screening.gateCoverage, modelContextsExecuted: 0, meteredApiCostUsd: 0, revisedSourceOnlySelectorAuthorized: true }, null, 2));
