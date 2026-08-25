#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";

import { assertV4 } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const shouldActivate = process.argv.includes("--activate");
assertV4(!(shouldWrite && shouldActivate), "choose either --write or --activate");

const root =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/disagreement-extraction";
const recoveryRoot = `${root}/audio-source-alternate-recovery-10`;
const priorDiagnosisPath = `${root}/audio-source-transport-recovery-9/failure-diagnosis.json`;
const basePlanPath = `${root}/audio-source-transport-recovery-8/correction-plan.json`;
const workPath = `${root}/audio-work-items.json`;
const standingPath =
  "docs/assessment-production/post-canary-continuation-v1/batch-09/standing-authorization.json";
const alternateManifestPath = ".assessment-cache/captions/qA7qBtNMayQ/manifest.json";
const alternateEventsPath = ".assessment-cache/captions/qA7qBtNMayQ/events.json";
const alternateTranscriptPath = ".assessment-cache/captions/qA7qBtNMayQ/transcript.txt";
const preparePath =
  "scripts/prepare-assessment-production-post-canary-batch-09-alternate-source-recovery-10.mjs";
const testPath =
  "scripts/test-assessment-production-post-canary-batch-09-alternate-source-recovery-10.mjs";
const runnerPath =
  "scripts/run-assessment-production-post-canary-batch-09-alternate-source-recovery-10.mjs";
const planPath = `${recoveryRoot}/correction-plan.json`;
const activationPath = `${recoveryRoot}/execution-activation.json`;
const executionPath = `${recoveryRoot}/execution.json`;
const analysisPath = `${recoveryRoot}/analysis.json`;
const preparationPath = `${root}/audio-source-preparation.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(file).then(() => true, () => false);

const inputPaths = [
  priorDiagnosisPath,
  basePlanPath,
  workPath,
  standingPath,
  alternateManifestPath,
  alternateEventsPath,
  alternateTranscriptPath
];
const inputBytes = Object.fromEntries(
  await Promise.all(inputPaths.map(async (file) => [file, await readFile(file)]))
);
const diagnosis = JSON.parse(inputBytes[priorDiagnosisPath]);
const basePlan = JSON.parse(inputBytes[basePlanPath]);
const alternateManifest = JSON.parse(inputBytes[alternateManifestPath]);
const alternateEvents = JSON.parse(inputBytes[alternateEventsPath]);
assertV4(
  diagnosis.status ===
    "preserved-final-batch-09-debate-170-redirect-proven-followup-http-403-failure-diagnosed" &&
    diagnosis.stopDisposition.finalRecoveryConsumed === true,
  "preserved canonical-source failure changed"
);
assertV4(
  alternateManifest.videoId === "qA7qBtNMayQ" &&
    alternateManifest.durationSeconds === 6310 &&
    alternateManifest.sourceUrl === "https://www.youtube.com/watch?v=qA7qBtNMayQ" &&
    alternateManifest.normalizedEventsSha256 === sha256(inputBytes[alternateEventsPath]) &&
    alternateManifest.transcriptSha256 === sha256(inputBytes[alternateTranscriptPath]),
  "alternate source chain changed"
);
assertV4(
  alternateEvents[1918]?.startMs === 4469760 &&
    alternateEvents[1918]?.text.includes("Bible") &&
    alternateEvents[2005]?.startMs === 4683040 &&
    alternateEvents[2005]?.text.startsWith("is true"),
  "alternate clip boundary anchors changed"
);
assertV4(!(await exists(preparationPath)), "audio-source preparation already exists");
for (const source of basePlan.exactCohort.sources) {
  assertV4(!(await exists(source.finalSourcePath)), `${source.debateNumber}: source already exists`);
}

const sourceHashes = {};
for (const file of [preparePath, testPath, runnerPath]) {
  sourceHashes[file] = sha256(await readFile(file));
}
const authenticatedInputs = Object.fromEntries(
  inputPaths.map((file) => [file, sha256(inputBytes[file])])
);
const androidClient = {
  clientName: "ANDROID",
  clientVersion: "20.10.38",
  androidSdkVersion: 30,
  hl: "en",
  gl: "US"
};
const sources = basePlan.exactCohort.sources.map((source) => {
  if (source.debateNumber !== "170") return structuredClone(source);
  const payload = {
    context: { client: androidClient },
    videoId: "qA7qBtNMayQ",
    contentCheckOk: true,
    racyCheckOk: true
  };
  return {
    ...structuredClone(source),
    sourceVideoId: "qA7qBtNMayQ",
    canonicalSourceVideoId: "HoTILnpd3q8",
    mode: "user-supplied-alternate-upload-audio-verification-only",
    expectedDurationSeconds: 6310,
    manifestPath: alternateManifestPath,
    manifestSha256: authenticatedInputs[alternateManifestPath],
    payload,
    payloadSha256: sha256(JSON.stringify(payload)),
    alternateAudioVerificationOnly: true
  };
});
const configHeaders = {
  "accept-language": "en-US,en;q=0.9",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36"
};
const androidHeaders = {
  "accept-language": "en-US,en;q=0.9",
  "user-agent":
    "com.google.android.youtube/20.10.38 (Linux; U; Android 11; en_US)",
  "x-youtube-client-name": "3",
  "x-youtube-client-version": "20.10.38"
};
const authorizationText =
  "Try this Youtube link for the debate: https://www.youtube.com/watch?v=qA7qBtNMayQ. I'm also using a different YouTube account.";

const plan = {
  schemaVersion:
    "1.0-assessment-production-post-canary-batch-09-alternate-source-recovery-10-plan",
  status:
    "frozen-one-shot-batch-09-user-supplied-alternate-debate-170-source-and-three-source-recovery-ready",
  batchNumber: 9,
  checkpointCommit: "4f22d134",
  userAuthorization: {
    instruction: authorizationText,
    directIncrementalCostUsdMaximum: 0,
    alternateDebate170UrlAuthorizedForVerificationAndOneSourceAttempt: true,
    resumeUntouchedDebate19And183AfterSuccess: true,
    browserSessionIdentifierPersisted: false,
    browserSessionInspected: false,
    browserSessionUsedByThisPass: false,
    credentialsMode: "omit",
    retriesMaximum: 0,
    audioPlaybackAuthorized: false,
    semanticAudioEvaluationAuthorized: false,
    modelExecutionAuthorized: false,
    paidServicesAuthorized: false,
    judgmentsOrScoresChangeAuthorized: false
  },
  authenticatedInputs,
  sourceHashes,
  alternateSourceVerification: {
    proposedVideoId: "qA7qBtNMayQ",
    proposedUrl: "https://www.youtube.com/watch?v=qA7qBtNMayQ",
    title: alternateManifest.title,
    channel: alternateManifest.channel,
    durationSeconds: alternateManifest.durationSeconds,
    playabilityStatus: "OK",
    publicPlayerResponseSha256: "426c8e31287dab030f52094f7dd83abe3a34388f4e6ec1d6998d4f5d3bad1323",
    captionChain: {
      manifestPath: alternateManifestPath,
      manifestSha256: authenticatedInputs[alternateManifestPath],
      eventsPath: alternateEventsPath,
      eventsSha256: authenticatedInputs[alternateEventsPath],
      transcriptPath: alternateTranscriptPath,
      transcriptSha256: authenticatedInputs[alternateTranscriptPath]
    },
    canonicalComparison: {
      canonicalVideoId: "HoTILnpd3q8",
      canonicalDurationSeconds: 6365,
      durationDifferenceSeconds: -55,
      fullClipCanonicalEvents: [1654, 1721],
      fullClipAlternateEvents: [1918, 2004],
      fullClipCanonicalTokens: 527,
      fullClipAlternateTokens: 528,
      fullClipLcsTokens: 503,
      fullClipLcsOverCanonical: 0.954459,
      keyPassageCanonicalEvents: [1687, 1698],
      keyPassageAlternateEvents: [1962, 1977],
      keyPassageCanonicalTokens: 99,
      keyPassageAlternateTokens: 107,
      keyPassageLcsTokens: 96,
      keyPassageLcsOverCanonical: 0.969697,
      sameDebateAndTargetPassageAcceptedForAudioVerificationOnly: true
    }
  },
  debate170AudioOnlyOverlay: {
    canonicalSourceVideoId: "HoTILnpd3q8",
    alternateAudioSourceVideoId: "qA7qBtNMayQ",
    canonicalClipWindow: { startMs: 4508900, endMs: 4722770, durationMs: 213870 },
    alternateClipWindow: { startMs: 4469720, endMs: 4682720, durationMs: 213000 },
    startAnchor: {
      canonicalEvent: 1654,
      canonicalStartMs: 4508940,
      alternateEvent: 1918,
      alternateStartMs: 4469760
    },
    endAnchor: {
      canonicalNextEvent: 1722,
      canonicalNextStartMs: 4723090,
      alternateNextEvent: 2005,
      alternateNextStartMs: 4683040
    },
    canonicalTranscriptPacketsChanged: false,
    canonicalJudgmentEvidenceChanged: false,
    alternateUploadUsedOnlyForSpeakerAndWordingAudioVerification: true
  },
  exactCohort: {
    sources,
    sourceOrder: ["170", "19", "183"],
    clipOrder: basePlan.exactCohort.clipOrder,
    sourceCount: 3,
    clipCount: 4
  },
  publicRequestRoute: {
    configBootstrap: {
      method: "GET",
      url: "https://www.youtube.com/watch?v=qA7qBtNMayQ",
      credentials: "omit",
      redirect: "error",
      headers: configHeaders,
      maximumRequests: 1
    },
    playerMetadata: {
      method: "POST",
      endpointTemplate: "https://www.youtube.com/youtubei/v1/player?key=<public-api-key>",
      credentials: "omit",
      redirect: "error",
      headers: { ...androidHeaders, "content-type": "application/json" },
      maximumRequests: 3
    },
    mediaDownload: {
      method: "GET",
      credentials: "omit",
      redirect: "follow",
      headers: { ...androidHeaders, range: "bytes=0-" },
      maximumRequests: 3,
      retriesMaximum: 0
    }
  },
  deterministicFormatSelection: basePlan.deterministicFormatSelection,
  mediaEncoding: basePlan.mediaEncoding,
  executionPolicy: {
    attemptsMaximum: 1,
    configBootstrapGetsMaximum: 1,
    playerMetadataPostsMaximum: 3,
    mediaDownloadAttemptsMaximum: 3,
    retriesMaximum: 0,
    rerunsMaximum: 0,
    timeoutExtensionsMaximum: 0,
    audioPlaybackCallsMaximum: 0,
    semanticAudioEvaluationsMaximum: 0,
    modelContextsMaximum: 0,
    paidServiceCallsMaximum: 0,
    directIncrementalCostUsdMaximum: 0,
    stopOnAnyFailure: true
  },
  outputs: { activationPath, executionPath, analysisPath, preparationPath },
  nextActionAfterPassingCohort:
    "prepare-validate-freeze-and-report-batch-09-four-clip-audio-verification-manifest-and-cost-estimate"
};

if (shouldActivate) {
  assertV4(await exists(planPath), "frozen alternate-source recovery plan is missing");
  const planBytes = await readFile(planPath);
  const frozenPlan = JSON.parse(planBytes);
  assertV4(
    frozenPlan.status === plan.status &&
      frozenPlan.userAuthorization.instruction === authorizationText &&
      JSON.stringify(frozenPlan.sourceHashes) === JSON.stringify(sourceHashes) &&
      frozenPlan.alternateSourceVerification.captionChain.eventsSha256 ===
        authenticatedInputs[alternateEventsPath],
    "frozen alternate-source recovery plan changed"
  );
  assertV4(!(await exists(activationPath)), "alternate-source recovery already activated");
  await mkdir(recoveryRoot, { recursive: true });
  const activation = {
    schemaVersion:
      "1.0-assessment-production-post-canary-batch-09-alternate-source-recovery-10-activation",
    status:
      "active-for-exactly-one-batch-09-user-supplied-alternate-debate-170-source-and-three-source-recovery-pass",
    batchNumber: 9,
    plan: { path: planPath, sha256: sha256(planBytes) },
    authenticatedInputs,
    sourceHashes,
    sourceOrder: plan.exactCohort.sourceOrder,
    clipOrder: plan.exactCohort.clipOrder,
    debate170AlternateWindow: plan.debate170AudioOnlyOverlay.alternateClipWindow,
    credentialsMode: "omit",
    browserSessionUsed: false,
    retriesMaximum: 0,
    audioPlaybackMaximumSeconds: 0,
    directIncrementalCostUsdMaximum: 0
  };
  await writeFile(activationPath, `${JSON.stringify(activation, null, 2)}\n`);
  console.log(JSON.stringify({ status: activation.status, plan: activation.plan }, null, 2));
  process.exit(0);
}

if (shouldWrite) {
  assertV4(!(await exists(planPath)), "alternate-source recovery plan already exists");
  await mkdir(recoveryRoot, { recursive: true });
  await writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      status: plan.status,
      wroteArtifact: shouldWrite,
      alternateVideoId: "qA7qBtNMayQ",
      fullClipLcsOverCanonical: 0.954459,
      keyPassageLcsOverCanonical: 0.969697,
      sources: 3,
      clips: 4,
      retries: 0,
      browserSessionUsed: false,
      audioPlaybackMaximumSeconds: 0,
      directIncrementalCostUsd: 0
    },
    null,
    2
  )
);
