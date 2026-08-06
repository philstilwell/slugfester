#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { classifyV4219PrimaryRoute } from "./lib/v4219-primary-recovery.mjs";
import { classifyV4220Motion } from "./lib/v4220-source-classification.mjs";

const shouldWrite = process.argv.includes("--write");
const ROOT = "docs/calibration/v4.2.21.17.13/replacement-held-out-five";
const sample = JSON.parse(await readFile(`${ROOT}/source-only-sample.json`, "utf8"));
if (sample.status !== "frozen-pending-route-metadata-screening" || !sample.authorization.routeMetadataScreening) throw new Error("replacement sample screening unauthorized");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
for (const [file, digest] of Object.entries(sample.sourceHashes)) {
  if (sha256(await readFile(path.resolve(file))) !== digest) throw new Error(`source hash mismatch: ${file}`);
}
const decisions = sample.debates.map((debate) => {
  const route = classifyV4219PrimaryRoute({ sourceLedgerEvents: debate.sourceLedgerEvents, compactCopiedInputBytes: debate.compactCopiedInputBytes });
  return {
    debateNumber: debate.number,
    debateId: debate.debateId,
    assignedFamily: classifyV4220Motion(debate.motion),
    classifierReplays: classifyV4220Motion(debate.motion) === debate.family,
    route: debate.route,
    routeReplays: route.route === debate.route,
    dyadic: debate.speakerCount === 2,
    transcriptChainPresent: debate.transcriptChainPresentAtSelection,
    durationBin: debate.durationBin,
    captionKind: debate.captionKind,
    partitionSeverity: debate.partitionSeverity,
  };
});
const passed = decisions.length === 5
  && decisions.filter((item) => item.route === "direct").length === 2
  && decisions.filter((item) => item.route === "partition").length === 3
  && decisions.every((item) => item.classifierReplays && item.routeReplays && item.dyadic && item.transcriptChainPresent)
  && sample.audit.failedFiveOverlap === 0;
const screening = {
  schemaVersion: "4.2.21.17.13-replacement-held-out-five-screening",
  protocolId: sample.protocolId,
  status: passed ? "replacement-held-out-five-screened-source-preparation-authorized" : "replacement-held-out-five-screening-failed",
  calibrationOnly: true,
  AIOnly: true,
  sourceBoundary: {
    motionAndRouteMetadataOnly: true,
    transcriptContentSemanticallyInspected: false,
    audioAccessed: false,
    legacyAssessmentContentAccessed: false,
    legacyScoresAccessed: false,
    priorJudgmentsAccessed: false,
    candidateRanksReoptimized: false,
  },
  decisions,
  audit: {
    debates: decisions.length,
    direct: decisions.filter((item) => item.route === "direct").length,
    partition: decisions.filter((item) => item.route === "partition").length,
    distinctFamilies: new Set(decisions.map((item) => item.assignedFamily)).size,
    distinctDurationBins: new Set(decisions.map((item) => item.durationBin)).size,
    distinctCaptionKinds: new Set(decisions.map((item) => item.captionKind)).size,
    distinctPartitionSeverityBins: new Set(decisions.filter((item) => item.route === "partition").map((item) => item.partitionSeverity)).size,
    classifierReplayPassed: decisions.filter((item) => item.classifierReplays).length,
    routeReplayPassed: decisions.filter((item) => item.routeReplays).length,
    dyadic: decisions.filter((item) => item.dyadic).length,
    transcriptChainsPresent: decisions.filter((item) => item.transcriptChainPresent).length,
    failedFiveOverlap: sample.audit.failedFiveOverlap,
  },
  authorization: {
    sourcePacketPreparation: passed,
    candidateDiscoveryPreparation: false,
    modelExecution: false,
    audioExecution: false,
    adjudicationExecution: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    all195Debates: false,
  },
};
if (shouldWrite) await writeFile(`${ROOT}/sample-screening.json`, `${JSON.stringify(screening, null, 2)}\n`);
console.log(JSON.stringify({
  status: screening.status,
  debates: screening.audit.debates,
  direct: screening.audit.direct,
  partition: screening.audit.partition,
  distinctFamilies: screening.audit.distinctFamilies,
  distinctDurationBins: screening.audit.distinctDurationBins,
  distinctCaptionKinds: screening.audit.distinctCaptionKinds,
  distinctPartitionSeverityBins: screening.audit.distinctPartitionSeverityBins,
  failedFiveOverlap: screening.audit.failedFiveOverlap,
  semanticTranscriptInspection: false,
  nextAuthorized: passed ? "source-packet-preparation" : "selection-failure-analysis",
}, null, 2));
