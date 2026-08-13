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
import path from "node:path";

import {
  CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER,
  CHECKPOINT_V22_PUBLICATION_FINALIZATION_PROTOCOL_ID,
  CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT,
  buildCheckpointV22PublicationFinalization,
  buildCheckpointV22PublicationStagingPreviewHtml,
  validateCheckpointV22PublicationFinalCandidate
} from "./lib/assessment-production-checkpoint-v2.2-publication-finalization.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const activationPath = `${CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT}/execution-activation.json`;
const activation = JSON.parse(
  await readFile(path.resolve(activationPath), "utf8")
);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const parse = (file) => readFile(path.resolve(file), "utf8").then(JSON.parse);
assertV4(
  activation.status === "publication-finalization-execution-authorized-and-frozen" &&
    activation.protocolId === CHECKPOINT_V22_PUBLICATION_FINALIZATION_PROTOCOL_ID &&
    activation.authorization.publicationFinalization === true &&
    activation.authorization.modelExecution === false &&
    activation.authorization.scoreRecalculation === false &&
    activation.authorization.renderingVerification === false &&
    activation.authorization.validatorMigration === false &&
    activation.authorization.productionLedgerPublication === false &&
    activation.authorization.productionMutation === false &&
    canonicalJson(activation.explicitOrder) ===
      canonicalJson(CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER),
  "publication finalization is not authorized or controls changed"
);
for (const [file, digest] of Object.entries(activation.sourceHashes)) {
  assertV4(
    sha256(await readFile(path.resolve(file))) === digest,
    `activation source hash mismatch: ${file}`
  );
}
for (const file of activation.futureOutputPathsExcludedFromSourceHashes) {
  assertV4(
    !(await exists(file)),
    `future finalization output already exists: ${file}`
  );
}

const startedAt = new Date().toISOString();
const started = Date.now();
let status = "failed";
let failureMessage = null;
let outputBundlePublished = false;
let rows = [];
let tempBundle = null;
try {
  const identity = await parse(activation.inputs?.identitySnapshot ??
    "docs/assessment-production/production-checkpoint-v2.2-1/deterministic-publication-compilation/production-identity-snapshot.json");
  const candidates = [];
  for (const debateNumber of CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER) {
    const context = activation.contexts.find(
      (item) => item.debateNumber === debateNumber
    );
    const identityRow = identity.rows.find((item) => item.number === debateNumber);
    assertV4(context && identityRow, `${debateNumber}: finalization context missing`);
    const [compiledBytes, outputBytes, packetBytes] = await Promise.all([
      readFile(path.resolve(context.compiledInput)),
      readFile(path.resolve(context.publicationOutput)),
      readFile(path.resolve(context.publicationPacket))
    ]);
    assertV4(
      sha256(compiledBytes) === context.compiledInputSha256 &&
        sha256(outputBytes) === context.publicationOutputSha256 &&
        sha256(packetBytes) === context.publicationPacketSha256,
      `${debateNumber}: frozen finalization input hash changed`
    );
    const compiled = JSON.parse(compiledBytes);
    const output = JSON.parse(outputBytes);
    const packet = JSON.parse(packetBytes);
    const built = buildCheckpointV22PublicationFinalization({
      compiled,
      compiledPath: context.compiledInput,
      compiledSha256: context.compiledInputSha256,
      output,
      packet,
      identity: identityRow
    });
    const validation = validateCheckpointV22PublicationFinalCandidate({
      candidate: built.candidate,
      provenance: built.provenance,
      compiled,
      output,
      packet,
      identity: identityRow
    });
    const candidateBytes = Buffer.from(
      `${JSON.stringify(built.candidate, null, 2)}\n`
    );
    const provenanceBytes = Buffer.from(
      `${JSON.stringify(built.provenance, null, 2)}\n`
    );
    assertV4(
      sha256(candidateBytes) === context.expectedFinalCandidateSha256 &&
        sha256(provenanceBytes) === context.expectedProvenanceSha256,
      `${debateNumber}: prepared finalization output changed`
    );
    candidates.push({
      context,
      candidateBytes,
      provenanceBytes,
      validation,
      score: built.candidate.score
    });
  }
  assertV4(
    candidates.length === 10 &&
      candidates.reduce((sum, item) => sum + item.validation.moves, 0) === 188 &&
      candidates.every(
        (item) =>
          item.validation.status === "passed" &&
          item.validation.participantScoresChanged === false &&
          item.validation.displayFieldsChanged === 0
      ),
    "complete ten-debate publication finalization validation failed"
  );

  const bundlePath = path.resolve(activation.artifacts.outputBundle);
  tempBundle = await mkdtemp(
    path.resolve(`${CHECKPOINT_V22_PUBLICATION_FINALIZATION_ROOT}/.output-bundle-tmp-`)
  );
  for (const item of candidates) {
    const candidateRelative = path.relative(
      activation.artifacts.outputBundle,
      item.context.finalCandidate
    );
    const provenanceRelative = path.relative(
      activation.artifacts.outputBundle,
      item.context.provenance
    );
    const candidatePath = path.join(tempBundle, candidateRelative);
    const provenancePath = path.join(tempBundle, provenanceRelative);
    await mkdir(path.dirname(candidatePath), { recursive: true });
    await mkdir(path.dirname(provenancePath), { recursive: true });
    await writeFile(candidatePath, item.candidateBytes);
    await writeFile(provenancePath, item.provenanceBytes);
    rows.push({
      debateNumber: item.context.debateNumber,
      debateId: item.context.debateId,
      finalCandidate: item.context.finalCandidate,
      finalCandidateSha256: sha256(item.candidateBytes),
      provenance: item.context.provenance,
      provenanceSha256: sha256(item.provenanceBytes),
      score: item.score,
      validation: item.validation
    });
  }
  const previewBytes = Buffer.from(
    buildCheckpointV22PublicationStagingPreviewHtml()
  );
  const previewRelative = path.relative(
    activation.artifacts.outputBundle,
    activation.artifacts.preview
  );
  const previewTempPath = path.join(tempBundle, previewRelative);
  await mkdir(path.dirname(previewTempPath), { recursive: true });
  await writeFile(previewTempPath, previewBytes);
  const audit = {
    schemaVersion: "1.0-production-checkpoint-v2.2-publication-finalization-audit",
    protocolId: activation.protocolId,
    status: "passed-ten-debate-publication-finalization",
    finalizedAt: new Date().toISOString(),
    explicitOrder: CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER,
    rows,
    totals: {
      debates: rows.length,
      sections: rows.reduce((sum, row) => sum + row.validation.sections, 0),
      moves: rows.reduce((sum, row) => sum + row.validation.moves, 0),
      displayFieldsChanged: 0,
      participantScoresChanged: false,
      modelContexts: 0,
      modelAuthoredScores: 0,
      scorePasses: 0,
      directCostUsd: 0
    },
    preview: {
      path: activation.artifacts.preview,
      sha256: sha256(previewBytes),
      localOnly: true,
      noindex: true,
      publicationStagingBanner: true,
      nativeDetailsAccordionExpected: true,
      defaultCollapsedExpected: true,
      bylineExpected:
        "Assessments made by 5.6 Sol. — Rubric: Slugfester Reassessment Rubric v2."
    },
    compatibilityBoundary: activation.compatibilityBoundary,
    publicationFinalizationPerformed: true,
    renderingVerificationPerformed: false,
    validatorMigrationPerformed: false,
    productionLedgerPublicationPerformed: false,
    productionMutationPerformed: false
  };
  const auditRelative = path.relative(
    activation.artifacts.outputBundle,
    activation.artifacts.finalizationAudit
  );
  await writeFile(
    path.join(tempBundle, auditRelative),
    `${JSON.stringify(audit, null, 2)}\n`
  );
  await rename(tempBundle, bundlePath);
  tempBundle = null;
  outputBundlePublished = true;
  status = "passed";
} catch (error) {
  failureMessage = (error.stack ?? error.message).slice(-10000);
  if (tempBundle) await rm(tempBundle, { recursive: true, force: true });
}

const execution = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-finalization-execution",
  protocolId: activation.protocolId,
  status:
    status === "passed"
      ? "ten-debate-publication-finalization-passed"
      : "ten-debate-publication-finalization-failed",
  startedAt,
  completedAt: new Date().toISOString(),
  elapsedMs: Date.now() - started,
  explicitOrder: CHECKPOINT_V22_PUBLICATION_FINALIZATION_ORDER,
  modelContexts: 0,
  retries: 0,
  scorePasses: 0,
  directCostUsd: 0,
  rows,
  outputBundlePublished,
  failureMessage,
  renderingVerificationPerformed: false,
  validatorMigrationPerformed: false,
  productionLedgerPublicationPerformed: false,
  productionMutationPerformed: false
};
const analysis = {
  schemaVersion: "1.0-production-checkpoint-v2.2-publication-finalization-analysis",
  protocolId: activation.protocolId,
  status:
    status === "passed"
      ? "ten-debate-publication-finalization-passed"
      : "ten-debate-publication-finalization-failed",
  productionCanary: true,
  stagingOnly: true,
  gate: {
    sourceHashesPassed: failureMessage === null,
    explicitOrderPassed: status === "passed",
    finalCandidatesPassed: status === "passed" ? 10 : rows.length,
    expectedFinalCandidates: 10,
    moves: rows.reduce((sum, row) => sum + row.validation.moves, 0),
    displayFieldsChanged: 0,
    participantScoresChanged: false,
    modelContexts: 0,
    modelAuthoredScores: 0,
    directCostUsd: 0
  },
  compatibilityBoundary: activation.compatibilityBoundary,
  failureMessage,
  artifacts:
    status === "passed"
      ? activation.artifacts
      : {
          execution: activation.artifacts.execution,
          analysis: activation.artifacts.analysis
        },
  authorization: {
    renderingVerificationPlanPreparation: status === "passed",
    renderingVerification: false,
    compatibilityRemedyPlanPreparation: false,
    validatorMigration: false,
    productionLedgerPublication: false,
    productionMutation: false,
    remainingProductionBatches: false
  },
  nextAuthorizedAction:
    status === "passed"
      ? "user-decision-on-rendering-verification-plan-preparation"
      : "failure-diagnosis-only"
};
await writeFile(
  path.resolve(activation.artifacts.execution),
  `${JSON.stringify(execution, null, 2)}\n`
);
await writeFile(
  path.resolve(activation.artifacts.analysis),
  `${JSON.stringify(analysis, null, 2)}\n`
);
console.log(JSON.stringify({
  status: analysis.status,
  finalCandidates: rows.length,
  moves: analysis.gate.moves,
  modelContexts: 0,
  directCostUsd: 0,
  renderingVerification: false,
  productionMutation: false,
  nextAuthorizedAction: analysis.nextAuthorizedAction
}, null, 2));
if (status !== "passed") process.exitCode = 1;
