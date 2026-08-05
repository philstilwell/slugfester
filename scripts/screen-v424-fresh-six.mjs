#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v41-lean-production.mjs";
import { V424_TOPIC_FAMILIES, classifyV424Motion } from "./lib/v424-source-classification.mjs";
import { V424_ROOT } from "./lib/v424-screened-chronology-fresh.mjs";

const shouldWrite = process.argv.includes("--write");
const sample = JSON.parse(await readFile(path.resolve(V424_ROOT, "source-only-sample.json"), "utf8"));
assertV4(sample.status === "frozen-pending-source-only-semantic-screening" && sample.authorization.sourceOnlySemanticScreening && sample.audit.priorFreshGateOverlap === 0 && !sample.selectionBoundary.legacyAssessmentContentAccessed, "v4.2.4 frozen sample unavailable");
const strongAnchors = {
  "resurrection-history": /resurrection|historical person|historical jesus|gospel|new testament|early christian/i,
  "evil-hiddenness": /problem of evil|\bevil\b|suffering|hiddenness|\bhell\b|damnation/i,
  "morality-ethics": /objective moral|moral values|moral duties|moral realism|\bethic/i,
  "mind-agency": /consciousness|\bmind\b|free will|personal identity|mental causation|volitional agency/i,
  "science-origins": /fine-tun|origin of life|evolution|cosmolog|\bphysics\b|big bang/i,
  "general-theism-religion": /\bgod\b|religion|christian turn|atheist|theism/i
};
const decisions = sample.debates.map((debate) => ({ debateNumber: debate.number, debateId: debate.debateId, assignedFamily: debate.family, correctedClassifierReplays: classifyV424Motion(debate.motion) === debate.family, substantiveAnchorPresent: strongAnchors[debate.family].test(debate.motion), v423BareSoulFalsePositiveAbsent: !(debate.family === "mind-agency" && /soul-building/i.test(debate.motion)) }));
const passed = sample.debates.length === 6 && new Set(sample.debates.map((debate) => debate.family)).size === V424_TOPIC_FAMILIES.length && decisions.every((decision) => decision.correctedClassifierReplays && decision.substantiveAnchorPresent && decision.v423BareSoulFalsePositiveAbsent);
assertV4(passed, "v4.2.4 source-only semantic screening failed");
const screening = {
  schemaVersion: "4.2.4-source-only-semantic-screening",
  protocolId: sample.protocolId,
  status: "sample-screened-packet-preparation-authorized",
  AIOnly: true,
  sourceBoundary: { motionMetadataOnly: true, transcriptContentAccessed: false, legacyAssessmentContentAccessed: false, legacyScoresAccessed: false, priorJudgmentsAccessed: false, candidateRanksReoptimized: false },
  decisions,
  audit: { debates: decisions.length, substantiveFamilies: new Set(sample.debates.map((debate) => debate.family)).size, classifierReplayPassed: decisions.filter((decision) => decision.correctedClassifierReplays).length, substantiveAnchorPassed: decisions.filter((decision) => decision.substantiveAnchorPresent).length, v423RegressionAbsent: decisions.filter((decision) => decision.v423BareSoulFalsePositiveAbsent).length },
  authorization: { compactChronologySourcePacketPreparation: true, primaryModelExecution: false, scoreDerivation: false, legacyComparison: false, productionMutation: false, all195Debates: false }
};
if (shouldWrite) await writeFile(path.resolve(V424_ROOT, "sample-screening.json"), `${JSON.stringify(screening, null, 2)}\n`);
console.log(JSON.stringify({ status: screening.status, decisions, ...screening.audit, compactChronologySourcePacketPreparation: true, modelContextsExecuted: 0, meteredApiCostUsd: 0 }, null, 2));
