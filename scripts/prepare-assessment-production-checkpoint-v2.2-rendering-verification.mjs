#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  CHECKPOINT_V22_RENDERING_VERIFICATION_MODEL,
  CHECKPOINT_V22_RENDERING_VERIFICATION_ORDER,
  CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID,
  CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT,
  CHECKPOINT_V22_RENDERING_VERIFICATION_VIEWPORTS,
  buildCheckpointV22RenderingVerificationPacket
} from "./lib/assessment-production-checkpoint-v2.2-rendering-verification.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const frozenAtIndex = process.argv.indexOf("--frozen-at");
const frozenAt =
  frozenAtIndex >= 0 ? process.argv[frozenAtIndex + 1] : new Date().toISOString();
assertV4(!Number.isNaN(Date.parse(frozenAt)), "--frozen-at must be an ISO timestamp");

const finalizationRoot =
  "docs/assessment-production/production-checkpoint-v2.2-1/publication-finalization";
const finalizationActivationPath = `${finalizationRoot}/execution-activation.json`;
const finalizationExecutionPath = `${finalizationRoot}/execution.json`;
const finalizationAnalysisPath = `${finalizationRoot}/analysis.json`;
const finalizationAuditPath =
  `${finalizationRoot}/output-bundle/finalization-audit.json`;
const compatibilityPath = `${finalizationRoot}/compatibility-analysis.json`;
const preparationPath =
  `${CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT}/preparation-manifest.json`;
const packetsRoot =
  `${CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT}/packets`;
const activationPath =
  `${CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT}/execution-activation.json`;
const executionPath =
  `${CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT}/execution.json`;
const analysisPath =
  `${CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT}/analysis.json`;
const renderingAuditPath =
  `${CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT}/rendering-audit.json`;
const evidenceRoot =
  `${CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT}/evidence`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);

if (shouldWrite) {
  assertV4(
    !(await exists(CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT)),
    `${CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT} already exists; preparation is immutable`
  );
}

const [activation, execution, analysis, audit, compatibility] = await Promise.all([
  parse(finalizationActivationPath),
  parse(finalizationExecutionPath),
  parse(finalizationAnalysisPath),
  parse(finalizationAuditPath),
  parse(compatibilityPath)
]);
assertV4(
  activation.status ===
      "publication-finalization-execution-authorized-and-frozen" &&
    execution.status === "ten-debate-publication-finalization-passed" &&
    execution.outputBundlePublished === true &&
    execution.failureMessage === null &&
    analysis.status === "ten-debate-publication-finalization-passed" &&
    analysis.authorization.renderingVerificationPlanPreparation === true &&
    analysis.authorization.renderingVerification === false &&
    analysis.authorization.productionMutation === false &&
    analysis.nextAuthorizedAction ===
      "user-decision-on-rendering-verification-plan-preparation" &&
    audit.status === "passed-ten-debate-publication-finalization" &&
    canonicalJson(audit.explicitOrder) ===
      canonicalJson(CHECKPOINT_V22_RENDERING_VERIFICATION_ORDER) &&
    audit.rows.length === 10 &&
    audit.totals.sections === 51 &&
    audit.totals.moves === 188 &&
    audit.totals.displayFieldsChanged === 0 &&
    audit.totals.participantScoresChanged === false &&
    audit.totals.modelContexts === 0 &&
    audit.totals.scorePasses === 0 &&
    audit.renderingVerificationPerformed === false &&
    audit.productionMutationPerformed === false &&
    compatibility.findings.length === 2 &&
    compatibility.findings.every(
      (finding) =>
        finding.blocksRenderingVerification === false &&
        finding.blocksProductionMutation === true
    ),
  "passing publication finalization evidence required"
);

const previewPath = audit.preview.path;
const previewBytes = await readFile(path.resolve(previewPath));
assertV4(
  sha256(previewBytes) === audit.preview.sha256 &&
    audit.preview.localOnly === true &&
    audit.preview.noindex === true &&
    audit.preview.publicationStagingBanner === true &&
    audit.preview.defaultCollapsedExpected === true,
  "frozen publication preview changed"
);

const packets = [];
for (const debateNumber of CHECKPOINT_V22_RENDERING_VERIFICATION_ORDER) {
  const auditRow = audit.rows.find((item) => item.debateNumber === debateNumber);
  assertV4(auditRow, `${debateNumber}: finalization audit row missing`);
  const [candidateBytes, provenanceBytes] = await Promise.all([
    readFile(path.resolve(auditRow.finalCandidate)),
    readFile(path.resolve(auditRow.provenance))
  ]);
  assertV4(
    sha256(candidateBytes) === auditRow.finalCandidateSha256 &&
      sha256(provenanceBytes) === auditRow.provenanceSha256,
    `${debateNumber}: frozen finalization artifact changed`
  );
  const packet = buildCheckpointV22RenderingVerificationPacket({
    auditRow,
    candidate: JSON.parse(candidateBytes),
    provenance: JSON.parse(provenanceBytes),
    previewPath,
    previewSha256: audit.preview.sha256
  });
  const packetPath = `${packetsRoot}/debate-${debateNumber}.json`;
  const packetBytes = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`);
  packets.push({
    debateNumber,
    debateId: auditRow.debateId,
    path: packetPath,
    sha256: sha256(packetBytes),
    bytes: packetBytes.length,
    packet,
    packetBytes
  });
}

const toolingPaths = [
  "scripts/lib/assessment-production-checkpoint-v2.2-rendering-verification.mjs",
  "scripts/prepare-assessment-production-checkpoint-v2.2-rendering-verification.mjs",
  "scripts/preregister-assessment-production-checkpoint-v2.2-rendering-verification.mjs",
  "scripts/validate-assessment-production-checkpoint-v2.2-rendering-evidence.mjs",
  "scripts/test-assessment-production-checkpoint-v2.2-rendering-verification-preparation.mjs"
];
const sourceFiles = [
  finalizationActivationPath,
  finalizationExecutionPath,
  finalizationAnalysisPath,
  finalizationAuditPath,
  compatibilityPath,
  previewPath,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "docs/reassessment-rubric-v2.1.md",
  "docs/assessment-production/manifest-v1.json",
  "docs/assessment-production/production-checkpoint-v2.2-1/master-manifest.json",
  "src/app.js",
  "src/styles.css",
  "src/data/debates.js",
  "src/data/references.js",
  "scripts/validate-debates.mjs",
  "scripts/validate-assessment-production-checkpoint-v2.2-scores.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-finalization.mjs",
  ...toolingPaths,
  ...audit.rows.flatMap((row) => [row.finalCandidate, row.provenance])
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}

const futureOutputPaths = [
  activationPath,
  executionPath,
  analysisPath,
  renderingAuditPath,
  evidenceRoot
];
for (const file of futureOutputPaths) {
  assertV4(
    !(await exists(file)),
    `future rendering-verification output already exists: ${file}`
  );
}

const manifest = {
  schemaVersion:
    "1.0-production-checkpoint-v2.2-rendering-verification-preparation",
  protocolId: CHECKPOINT_V22_RENDERING_VERIFICATION_PROTOCOL_ID,
  status: "rendering-verification-plan-prepared-and-frozen",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8"
  }).trim(),
  productionCanary: true,
  stagingOnly: true,
  model: {
    ...CHECKPOINT_V22_RENDERING_VERIFICATION_MODEL,
    participantJudgmentWasScoreBlind: true,
    modelExecutionPlanned: false
  },
  costEstimate: {
    directCostUsd: 0,
    meteredApiCostUsd: 0,
    transcriptionCostUsd: 0,
    modelContexts: 0,
    expectedExecutionWallMinutes: [10, 25]
  },
  inputs: {
    finalizationActivation: finalizationActivationPath,
    finalizationExecution: finalizationExecutionPath,
    finalizationAnalysis: finalizationAnalysisPath,
    finalizationAudit: finalizationAuditPath,
    compatibilityAnalysis: compatibilityPath,
    preview: previewPath
  },
  explicitOrder: CHECKPOINT_V22_RENDERING_VERIFICATION_ORDER,
  viewports: CHECKPOINT_V22_RENDERING_VERIFICATION_VIEWPORTS,
  packets: packets.map(({ packetBytes: _packetBytes, packet: _packet, ...row }) => row),
  browserPlan: {
    controller: "Codex in-app Browser",
    browserFamily: "Chromium",
    exactBrowserNameAndVersionRecordedAtExecution: true,
    localhostOnly: true,
    localServer: {
      command: ["python3", "-m", "http.server", "4174", "--bind", "127.0.0.1"],
      workingDirectory: ".",
      baseUrl: "http://127.0.0.1:4174",
      externalNetworkNavigationPermitted: false
    },
    serialExecution: true,
    iterateExplicitOrderArrayDirectly: true,
    viewportOrder: ["desktop", "mobile"],
    freshPagePerViewport: true,
    screenshotsPerViewport: ["collapsed", "open"],
    browserTabsOpenedDuringExecutionMustClose: true,
    localServerMustStopAfterExecution: true
  },
  gateExpectations: {
    debates: 10,
    sections: 51,
    moves: 188,
    pageLoads: 20,
    viewportResults: 20,
    screenshots: 40,
    pointerInteractionTests: 20,
    keyboardEnterTests: 20,
    keyboardSpaceTests: 20,
    consoleErrorMaximum: 0,
    consoleWarningMaximum: 0,
    pageErrorMaximum: 0,
    failedRequestMaximum: 0,
    horizontalOverflowMaximumPixels: 0,
    displayFieldsChanged: 0,
    participantScoresChanged: false,
    modelContexts: 0,
    directCostUsd: 0
  },
  failurePolicy: {
    anySourceHashMismatchFailsEntireGate: true,
    anyPacketHashMismatchFailsEntireGate: true,
    anyPageLoadFailureFailsEntireGate: true,
    anyRequiredBooleanCheckFailureFailsEntireGate: true,
    anyNonzeroRuntimeCountFailsEntireGate: true,
    anyHorizontalOverflowFailsEntireGate: true,
    anyMissingOrHashInvalidScreenshotFailsEntireGate: true,
    renderingDefectStopsForDiagnosisOnly: true,
    automaticStyleRepairPermitted: false,
    automaticApplicationRepairPermitted: false,
    retryPermitted: false,
    partialPassPromotionPermitted: false,
    productionMutationPermitted: false
  },
  compatibilityBoundary: {
    renderingVerificationBlocked: false,
    productionMutationBlocked: true,
    validatorMigrationAuthorized: false,
    productionLedgerPublicationAuthorized: false,
    blockers: compatibility.findings.map((finding) => finding.id)
  },
  artifacts: {
    preparation: preparationPath,
    packetsRoot,
    packets: packets.map((item) => item.path),
    activation: activationPath,
    execution: executionPath,
    analysis: analysisPath,
    renderingAudit: renderingAuditPath,
    evidenceRoot,
    evidence: packets.flatMap((item) =>
      Object.values(item.packet.viewports).flatMap((viewport) =>
        Object.values(viewport.evidence)
      )
    )
  },
  futureOutputPathsExcludedFromSourceHashes: futureOutputPaths,
  sourceHashes,
  authorization: {
    renderingVerificationExecutionActivation: false,
    browserControl: false,
    screenshotCapture: false,
    renderingVerification: false,
    renderingRepair: false,
    compatibilityRemedyPlanPreparation: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction:
    "user-decision-on-rendering-verification-execution-activation"
};

if (shouldWrite) {
  const parent = path.resolve(path.dirname(CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT));
  await mkdir(parent, { recursive: true });
  const tempRoot = await mkdtemp(path.join(parent, ".rendering-verification-prep-"));
  try {
    await mkdir(path.join(tempRoot, "packets"), { recursive: true });
    for (const item of packets) {
      await writeFile(
        path.join(tempRoot, "packets", `debate-${item.debateNumber}.json`),
        item.packetBytes
      );
    }
    await writeFile(
      path.join(tempRoot, "preparation-manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`
    );
    await rename(tempRoot, path.resolve(CHECKPOINT_V22_RENDERING_VERIFICATION_ROOT));
  } catch (error) {
    await rm(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

console.log(JSON.stringify({
  status: shouldWrite
    ? manifest.status
    : "rendering-verification-plan-preview",
  debates: 10,
  viewportResults: 20,
  screenshotsPlanned: 40,
  modelContexts: 0,
  directCostUsd: 0,
  renderingExecuted: false,
  productionMutation: false,
  productionMutationBlockers: manifest.compatibilityBoundary.blockers,
  nextAuthorizedAction: manifest.nextAuthorizedAction
}, null, 2));
