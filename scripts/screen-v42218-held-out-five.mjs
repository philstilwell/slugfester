#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertV4 } from "./lib/v4-lean-production.mjs";
import { classifyV4219PrimaryRoute } from "./lib/v4219-primary-recovery.mjs";
import { classifyV4220Motion } from "./lib/v4220-source-classification.mjs";

const shouldWrite = process.argv.includes("--write");
const root = "docs/calibration/v4.2.21.8/held-out-five";
const sample = JSON.parse(await readFile(path.resolve(`${root}/source-only-sample.json`), "utf8"));
assertV4(
  sample.status === "frozen-pending-route-metadata-screening" &&
    sample.authorization.routeMetadataScreening &&
    sample.audit.priorOrRejectedSampleOverlap === 0 &&
    !sample.selectionBoundary.transcriptContentSemanticallyInspected &&
    !sample.selectionBoundary.legacyAssessmentContentAccessed,
  "v4.2.21.8 frozen sample unavailable"
);
const decisions = sample.debates.map((debate) => ({
  debateNumber: debate.number,
  debateId: debate.debateId,
  assignedFamily: debate.family,
  classifierReplays: classifyV4220Motion(debate.motion) === debate.family,
  route: debate.route,
  routeReplays: classifyV4219PrimaryRoute(debate).route === debate.route,
  dyadic:
    debate.speakerCount === 2 &&
    debate.sides.pro.speakers.length === 1 &&
    debate.sides.con.speakers.length === 1,
  transcriptChainPresent: debate.transcriptChainPresentAtSelection,
  durationBin: debate.durationBin,
  captionKind: debate.captionKind,
  partitionSeverity: debate.partitionSeverity
}));
const direct = decisions.filter((decision) => decision.route === "direct").length;
const partition = decisions.filter((decision) => decision.route === "partition").length;
const passed =
  decisions.length === 5 &&
  direct === 2 &&
  partition === 3 &&
  new Set(decisions.map((decision) => decision.assignedFamily)).size >= 4 &&
  decisions.every(
    (decision) =>
      decision.classifierReplays &&
      decision.routeReplays &&
      decision.dyadic &&
      decision.transcriptChainPresent
  );
assertV4(passed, "v4.2.21.8 route metadata screening failed");
const screening = {
  schemaVersion: "4.2.21.8-route-stratified-held-out-five-screening",
  protocolId: sample.protocolId,
  status: "held-out-five-screened-lane-preparation-authorized",
  calibrationOnly: true,
  AIOnly: true,
  sourceBoundary: {
    motionAndRouteMetadataOnly: true,
    transcriptContentSemanticallyInspected: false,
    audioAccessed: false,
    legacyAssessmentContentAccessed: false,
    legacyScoresAccessed: false,
    priorJudgmentsAccessed: false,
    candidateRanksReoptimized: false
  },
  decisions,
  audit: {
    debates: decisions.length,
    direct,
    partition,
    distinctFamilies: new Set(decisions.map((decision) => decision.assignedFamily)).size,
    distinctDurationBins: new Set(decisions.map((decision) => decision.durationBin)).size,
    distinctCaptionKinds: new Set(decisions.map((decision) => decision.captionKind)).size,
    classifierReplayPassed: decisions.filter((decision) => decision.classifierReplays).length,
    routeReplayPassed: decisions.filter((decision) => decision.routeReplays).length,
    dyadic: decisions.filter((decision) => decision.dyadic).length,
    transcriptChainsPresent: decisions.filter((decision) => decision.transcriptChainPresent).length
  },
  authorization: {
    directLanePacketPreparation: true,
    partitionLaneDesign: true,
    partitionLanePacketPreparation: false,
    primaryModelExecution: false,
    passBModelExecution: false,
    audioExecution: false,
    adjudicationModelExecution: false,
    scoreDerivation: false,
    publicationFinalization: false,
    productionMutation: false,
    all195Debates: false
  }
};
if (shouldWrite) {
  await writeFile(path.resolve(`${root}/sample-screening.json`), `${JSON.stringify(screening, null, 2)}\n`);
}
console.log(
  JSON.stringify(
    {
      status: screening.status,
      debates: decisions.length,
      routeMix: { direct, partition },
      distinctFamilies: screening.audit.distinctFamilies,
      distinctDurationBins: screening.audit.distinctDurationBins,
      distinctCaptionKinds: screening.audit.distinctCaptionKinds,
      partitionLaneDesignAuthorized: true,
      modelContextsExecuted: 0,
      audioCalls: 0,
      scoresDerived: 0,
      meteredApiCostUsd: 0
    },
    null,
    2
  )
);
