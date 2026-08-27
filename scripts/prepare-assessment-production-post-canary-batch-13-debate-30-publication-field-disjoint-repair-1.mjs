#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DEBATE_PLANS, MODEL, PROTOCOL_ID, ROOT, buildFieldDisjointRepairSchema
} from "./lib/assessment-production-post-canary-batch-13-debate-30-publication-field-disjoint-repair-1.mjs";
import { validatePostCanaryBatch13PublicationOutput } from
  "./lib/assessment-production-post-canary-batch-13-publication-validation.mjs";
import { wordCount } from "./lib/v388-reconstruction.mjs";
import { assertV4, canonicalJson } from "./lib/v4-lean-production.mjs";

const shouldWrite = process.argv.includes("--write");
const atIndex = process.argv.indexOf("--frozen-at");
const frozenAt = atIndex >= 0 ? process.argv[atIndex + 1] : null;
assertV4(frozenAt && !Number.isNaN(Date.parse(frozenAt)),
  "--frozen-at requires an ISO timestamp");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const pretty = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const exists = (file) => access(path.resolve(file)).then(() => true, () => false);
const PUBLICATION_ROOT =
  "docs/assessment-production/post-canary-continuation-v1/batch-13/publication-reconstruction";
const RESUMPTION_ROOT = `${PUBLICATION_ROOT}/original-unattempted-context-resumption-3`;
const ORIGINAL_PREPARATION = `${RESUMPTION_ROOT}/execution-preparation-manifest.json`;
const ORIGINAL_ACTIVATION = `${RESUMPTION_ROOT}/execution-activation.json`;
const ORIGINAL_EXECUTION = `${RESUMPTION_ROOT}/model-execution.json`;
const ORIGINAL_ANALYSIS = `${RESUMPTION_ROOT}/analysis.json`;
const FAILURE_ANALYSIS = `${RESUMPTION_ROOT}/debate-30-failure-analysis.json`;
const MANUAL = `${ROOT}/manual.md`;
const MANIFEST = `${ROOT}/execution-preparation-manifest.json`;
const CAFFEINATE = "/usr/bin/caffeinate";
const CODEX = "/Applications/ChatGPT.app/Contents/Resources/codex";
const FAILED_DEBATES = DEBATE_PLANS.map((plan) => plan.debateNumber);
const ALL_DEBATES = ["30"];

const [originalPreparationBytes, originalActivationBytes,
  originalExecutionBytes, originalAnalysisBytes, failureAnalysisBytes] = await Promise.all([
    ORIGINAL_PREPARATION, ORIGINAL_ACTIVATION,
    ORIGINAL_EXECUTION, ORIGINAL_ANALYSIS, FAILURE_ANALYSIS
  ].map((file) => readFile(path.resolve(file))));
const originalPreparation = JSON.parse(originalPreparationBytes);
const originalActivation = JSON.parse(originalActivationBytes);
const originalExecution = JSON.parse(originalExecutionBytes);
const originalAnalysis = JSON.parse(originalAnalysisBytes);
const failureAnalysis = JSON.parse(failureAnalysisBytes);
assertV4(
  originalExecution.status === "five-context-publication-resumption-stopped-with-failure" &&
    originalExecution.contextsAttempted === 1 && originalExecution.contextsUnattempted === 4 &&
    originalExecution.validContexts === 0 && originalExecution.invalidContexts === 1 &&
    originalExecution.attempts === 1 &&
    originalExecution.retries === 0 && originalExecution.timeoutExtensions === 0 &&
    originalExecution.correctionContexts === 0 &&
    canonicalJson(originalExecution.results.filter((item) => !item.gateAcceptancePassed)
      .map((item) => item.debateNumber)) === canonicalJson(FAILED_DEBATES) &&
    originalAnalysis.status === "five-context-publication-resumption-failed" &&
    failureAnalysis.status === "debate-30-publication-failure-diagnosed-awaiting-field-disjoint-repair-1" &&
    failureAnalysis.diagnosis?.invalidCritiqueCount === 16 &&
    failureAnalysis.diagnosis?.invalidQuoteCount === 1 &&
    failureAnalysis.diagnosis?.allOtherFieldsStructurallyValid === true,
  "Debate 30 publication resumption failure boundary changed"
);
for (const [file, digest] of Object.entries(originalActivation.sourceHashes)) {
  assertV4(sha256(await readFile(path.resolve(file))) === digest,
    `original publication source hash mismatch: ${file}`);
}

const allArtifacts = new Map();
for (const debateNumber of ALL_DEBATES) {
  const output = `${PUBLICATION_ROOT}/outputs/debate-${debateNumber}.json`;
  const packet = `${PUBLICATION_ROOT}/packets/debate-${debateNumber}.json`;
  const outputBytes = await readFile(path.resolve(output));
  const packetBytes = await readFile(path.resolve(packet));
  allArtifacts.set(debateNumber, {
    debateNumber, output, outputBytes, outputJson: JSON.parse(outputBytes),
    packet, packetBytes, packetJson: JSON.parse(packetBytes)
  });
}
const debate30 = allArtifacts.get("30");
const structuralStandIn = Object.values(debate30.outputJson.moveProse)
  .map((entry) => entry.critique)
  .find((critique) => {
    const words = wordCount(critique);
    return words >= 105 && words <= 130 && critique.length >= 880;
  });
assertV4(structuralStandIn, "Debate 30 has no validation-clean diagnostic stand-in");

const expectedCritiqueCounts = { "30": 16 };
const expectedQuoteCounts = { "30": 1 };
const diagnostics = [];
const targetsByDebate = new Map();
for (const plan of DEBATE_PLANS) {
  const artifact = allArtifacts.get(plan.debateNumber);
  const invalidCritiques = artifact.packetJson.moves.filter((move) => {
    const critique = artifact.outputJson.moveProse[move.moveId].critique;
    const words = wordCount(critique);
    return words < 105 || words > 130;
  });
  assertV4(invalidCritiques.length === expectedCritiqueCounts[plan.debateNumber],
    `Debate ${plan.debateNumber}: failed critique set changed`);
  const quoteIssues = [];
  for (const side of ["pro", "con"]) {
    const quote = artifact.outputJson.representativeQuotes[side];
    const move = artifact.packetJson.moves.find((candidate) => candidate.moveId === quote.sourceMoveId);
    assertV4(move && move.side === side && move.quoteEligible,
      `Debate ${plan.debateNumber} ${side}: quote source changed`);
    if (!move.sourceExcerpt.includes(quote.text)) quoteIssues.push({ side, quote, move });
  }
  assertV4(quoteIssues.length === expectedQuoteCounts[plan.debateNumber],
    `Debate ${plan.debateNumber}: quote failure set changed`);
  const auditClone = structuredClone(artifact.outputJson);
  for (const move of invalidCritiques) {
    const critique = auditClone.moveProse[move.moveId].critique;
    assertV4(wordCount(critique) > 130 && critique.length >= 880,
      `Debate ${plan.debateNumber} ${move.moveId}: diagnosed critique changed`);
    auditClone.moveProse[move.moveId].critique = structuralStandIn;
  }
  if (quoteIssues.length) {
    const issue = quoteIssues[0];
    auditClone.representativeQuotes[issue.side].text =
      issue.move.sourceExcerpt.trim().split(/\s+/).slice(0, 8).join(" ");
  }
  const nonTargetAudit = validatePostCanaryBatch13PublicationOutput(
    auditClone, artifact.packetJson
  );
  assertV4(nonTargetAudit.status === "passed",
    `Debate ${plan.debateNumber}: validation-clean non-target fields changed`);
  const targets = [];
  if (quoteIssues.length) {
    const issue = quoteIssues[0];
    targets.push({
      kind: "quote",
      field: `representativeQuotes.${issue.side}.text`,
      side: issue.side,
      sourceMoveId: issue.move.moveId,
      sourceExcerpt: issue.move.sourceExcerpt,
      immutableContext: issue.quote.context,
      originalValueSha256: sha256(issue.quote.text)
    });
  }
  for (const move of invalidCritiques) {
    const critique = artifact.outputJson.moveProse[move.moveId].critique;
    targets.push({
      kind: "critique",
      field: `moveProse.${move.moveId}.critique`,
      moveId: move.moveId,
      move,
      originalWords: wordCount(critique),
      originalCharacters: critique.length,
      originalValueSha256: sha256(critique)
    });
  }
  targetsByDebate.set(plan.debateNumber, targets);
  diagnostics.push({
    debateNumber: plan.debateNumber,
    invalidCritiques: invalidCritiques.map((move) => ({
      moveId: move.moveId,
      field: `moveProse.${move.moveId}.critique`,
      words: wordCount(artifact.outputJson.moveProse[move.moveId].critique),
      characters: artifact.outputJson.moveProse[move.moveId].critique.length
    })),
    invalidQuotes: quoteIssues.map((issue) => ({
      side: issue.side,
      field: `representativeQuotes.${issue.side}.text`,
      sourceMoveId: issue.move.moveId,
      words: wordCount(issue.quote.text)
    })),
    nonTargetStructuralAudit: nonTargetAudit
  });
}
assertV4(diagnostics.reduce((sum, item) => sum + item.invalidCritiques.length, 0) === 16 &&
  diagnostics.reduce((sum, item) => sum + item.invalidQuotes.length, 0) === 1,
"diagnosed seventeen-field repair scope changed");

const manualText = `# Batch 13 field-disjoint publication repair\n\n` +
  `Author only the correction strings required by packet.json and schema.json. ` +
  `The schema is authoritative. Every critique must contain exactly four ordered labeled sentences: ` +
  `Strongest feature:, Principal limitation:, Live burden:, Locked score:. Count every whitespace-separated ` +
  `token, including all label words. Target 112–118 total tokens and do not exceed 122 by your own count; ` +
  `the repository accepts 105–130. Each critique must contain at least 880 characters, with terminal ` +
  `punctuation on every sentence. A quote correction must be a 3–18 word exact contiguous substring ` +
  `of its supplied sourceExcerpt. Participant judgments and scores are closed. Do not author scores, ` +
  `change any non-target field, add tags, or consult outside material. The rejected prior strings are ` +
  `unavailable and must not be inferred. Return one JSON object and nothing else.\n`;
const manualBytes = Buffer.from(manualText);

const contexts = [];
let contextIndex = 0;
for (const plan of DEBATE_PLANS) {
  const artifact = allArtifacts.get(plan.debateNumber);
  const allTargets = targetsByDebate.get(plan.debateNumber);
  const quoteTargets = allTargets.filter((target) => target.kind === "quote");
  const critiqueTargets = allTargets.filter((target) => target.kind === "critique");
  let critiqueOffset = 0;
  for (let shardIndex = 0; shardIndex < plan.critiqueShardSizes.length; shardIndex += 1) {
    const size = plan.critiqueShardSizes[shardIndex];
    const shardTargets = critiqueTargets.slice(critiqueOffset, critiqueOffset + size);
    critiqueOffset += size;
    if (shardIndex === 0) shardTargets.unshift(...quoteTargets);
    const keyedTargets = shardTargets.map((target, fieldIndex) => ({
      ...target,
      fieldKey: `field_${String(fieldIndex + 1).padStart(2, "0")}`
    }));
    const shardId = `debate-${plan.debateNumber}-shard-${shardIndex + 1}`;
    const packet = {
      schemaVersion: "1.0-assessment-production-post-canary-batch-13-publication-field-disjoint-repair-packet",
      protocolId: PROTOCOL_ID,
      contextIndex,
      shardId,
      productionCanary: false,
      batchNumber: 13,
      stagingOnly: true,
      debateNumber: plan.debateNumber,
      debateId: artifact.packetJson.debateId,
      assessmentModel: MODEL.label,
      correctionType: "user-authorized-multi-field-field-disjoint-publication-repair",
      writableFieldCount: keyedTargets.length,
      writableFields: keyedTargets.map((target) => target.field),
      targets: keyedTargets,
      rejectedPriorStringsAvailable: false,
      failedPublicationOutputAvailable: false,
      allOtherFieldsUnavailableAndImmutable: true,
      participantJudgmentClosed: true,
      publicationScoreLocked: true,
      scoresRepositoryOwnedAndImmutable: true,
      constraints: {
        critiqueSentenceCount: 4,
        critiqueOrderedLabels: [
          "Strongest feature:", "Principal limitation:", "Live burden:", "Locked score:"
        ],
        critiqueWordsMinimum: 105,
        critiqueWordsMaximum: 130,
        critiqueWordsTargetMinimum: 112,
        critiqueWordsTargetMaximum: 118,
        critiqueCharactersMinimum: 880,
        terminalPunctuationRequired: true,
        quoteWordsMinimum: 3,
        quoteWordsMaximum: 18,
        quoteExactContiguousSourceSubstringRequired: true,
        namedFallacyOrBiasFieldsWritable: false
      }
    };
    const schema = buildFieldDisjointRepairSchema(packet);
    const packetPath = `${ROOT}/packets/context-${contextIndex}.json`;
    const schemaPath = `${ROOT}/schemas/context-${contextIndex}.schema.json`;
    const packetBytes = pretty(packet);
    const schemaBytes = pretty(schema);
    contexts.push({
      contextIndex,
      shardId,
      debateNumber: plan.debateNumber,
      debateId: artifact.packetJson.debateId,
      writableFields: packet.writableFields,
      writableFieldCount: packet.writableFieldCount,
      packet: packetPath,
      packetBytes,
      packetSha256: sha256(packetBytes),
      schema: schemaPath,
      schemaBytes,
      schemaSha256: sha256(schemaBytes),
      output: `${ROOT}/outputs/context-${contextIndex}.json`,
      validation: `${ROOT}/validations/context-${contextIndex}.json`,
      provenance: `${ROOT}/provenance/context-${contextIndex}.json`
    });
    contextIndex += 1;
  }
  assertV4(critiqueOffset === critiqueTargets.length,
    `Debate ${plan.debateNumber}: shard coverage changed`);
}
assertV4(contexts.length === 9 &&
  contexts.every((context) => context.writableFieldCount >= 1 && context.writableFieldCount <= 2) &&
  contexts.reduce((sum, context) => sum + context.writableFieldCount, 0) === 17 &&
  new Set(contexts.flatMap((context) => context.writableFields)).size === 17,
"nine-shard, seventeen-field coverage changed");

const sourceScripts = [
  "scripts/lib/assessment-production-post-canary-batch-13-debate-30-publication-field-disjoint-repair-1.mjs",
  "scripts/prepare-assessment-production-post-canary-batch-13-debate-30-publication-field-disjoint-repair-1.mjs",
  "scripts/activate-assessment-production-post-canary-batch-13-debate-30-publication-field-disjoint-repair-1.mjs",
  "scripts/run-assessment-production-post-canary-batch-13-debate-30-publication-field-disjoint-repair-1.mjs",
  "scripts/analyze-assessment-production-post-canary-batch-13-debate-30-publication-field-disjoint-repair-1.mjs",
  "scripts/lib/assessment-production-post-canary-batch-13-publication-validation.mjs",
  "scripts/lib/assessment-production-checkpoint-v2.2-publication-validation.mjs",
  "scripts/lib/v388-reconstruction.mjs",
  "scripts/lib/v4-lean-production.mjs",
  "src/data/references.js"
];
const sourceFiles = [
  ORIGINAL_PREPARATION, ORIGINAL_ACTIVATION, ORIGINAL_EXECUTION,
  ORIGINAL_ANALYSIS, FAILURE_ANALYSIS,
  "docs/assessment-production-workflow.md",
  "docs/assessment-workflow-v4.2.21.17.41.md",
  "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
  ...ALL_DEBATES.flatMap((debateNumber) => {
    const artifact = allArtifacts.get(debateNumber);
    const files = [artifact.output, artifact.packet];
    const validation = `${PUBLICATION_ROOT}/validations/debate-${debateNumber}.json`;
    const provenance = `${PUBLICATION_ROOT}/provenance/debate-${debateNumber}.json`;
    return [...files, validation, provenance];
  }),
  ...sourceScripts
];
const sourceHashes = {};
for (const file of [...new Set(sourceFiles)]) {
  sourceHashes[file] = sha256(await readFile(path.resolve(file)));
}
sourceHashes[CAFFEINATE] = sha256(await readFile(CAFFEINATE));
sourceHashes[MANUAL] = sha256(manualBytes);
for (const context of contexts) {
  sourceHashes[context.packet] = context.packetSha256;
  sourceHashes[context.schema] = context.schemaSha256;
}

const futureOutputs = [
  `${ROOT}/execution-activation.json`, `${ROOT}/model-execution.json`, `${ROOT}/analysis.json`,
  `${ROOT}/complete-cohort-analysis.json`,
  ...contexts.flatMap((context) => [context.output, context.validation, context.provenance]),
  ...FAILED_DEBATES.flatMap((debateNumber) => [
    `${ROOT}/corrected/debate-${debateNumber}.json`,
    `${ROOT}/complete-validations/debate-${debateNumber}.json`,
    `${ROOT}/merge-audits/debate-${debateNumber}.json`
  ])
];
for (const file of [MANIFEST, ...futureOutputs]) {
  assertV4(!(await exists(file)), `future output exists: ${file}`);
}

const manifest = {
  schemaVersion: "1.0-assessment-production-post-canary-batch-13-publication-field-disjoint-repair-preparation",
  protocolId: PROTOCOL_ID,
  status: "frozen-nine-context-seventeen-field-batch-13-debate-30-publication-repair-prepared-not-activated",
  frozenAt,
  checkpointCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  productionCanary: false,
  batchNumber: 13,
  stagingOnly: true,
  userAuthorization: {
    source: "Batch 13 complete-workflow standing authorization",
    resolvedScope: "nine fresh isolated field-disjoint shards correcting exactly sixteen rejected Debate 30 critiques and one rejected exact-source quotation while retaining every validation-clean field",
    workflowException: null,
    contexts: 9,
    writableFields: 17,
    writableFieldsMaximumPerPacket: 2,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutExtensionsMaximum: 0,
    directIncrementalCostUsdMaximum: 0
  },
  model: MODEL,
  contexts: contexts.map(({ packetBytes, schemaBytes, ...context }) => context),
  diagnosis: {
    status: "deterministically-confirmed-sixteen-critique-and-one-quote-failures",
    debates: diagnostics,
    totals: { debates: 1, invalidCritiques: 16, invalidQuotes: 1, writableFields: 17 },
    everyNonTargetFieldStructurallyValidated: true,
    temporaryStandInsWrittenOrRetained: false
  },
  diagnosticStandIn: {
    source: "validation-clean-critique-from-the-same-preserved-Debate-30-output",
    persistedAsCorrection: false
  },
  modelInputs: {
    productionWorkflow: "docs/assessment-production-workflow.md",
    readinessWorkflow: "docs/assessment-workflow-v4.2.21.17.41.md",
    outputContract: "/Users/philstilwell/.codex/skills/reassess-slugfester-debates/references/output-contract.md",
    repairManual: MANUAL,
    filesPerContext: [
      "production-workflow.md", "readiness-workflow.md", "output-contract.md",
      "repair-manual.md", "packet.json", "schema.json"
    ]
  },
  isolation: {
    oneDebatePerContext: true,
    freshContextPerShard: true,
    onlyFrozenInputsAvailable: true,
    failedPublicationOutputsUnavailable: true,
    rejectedPriorStringsUnavailable: true,
    otherDebatesUnavailable: true,
    legacyAssessmentsUnavailable: true,
    rankingsAndWinnerComparisonsUnavailable: true,
    participantJudgmentClosed: true,
    scoresRepositoryOwnedAndImmutable: true,
    allNonTargetFieldsUnavailableAndImmutable: true,
    fieldDisjointAcrossShards: true
  },
  retentionContract: {
    acceptedOriginalDebatesRetained: 0,
    validationCleanFieldsRetainedDeterministically: true,
    rejectedPriorStringsRetained: false,
    eachTargetFieldReplacedAtMostOnce: true,
    completeDebateValidationRequiredAfterMerge: true,
    completeTenDebateCohortReplayDeferredUntilFourUnattemptedContextsComplete: true
  },
  executionEnvironment: {
    codexPath: CODEX,
    codexCliVersion: execFileSync(CODEX, ["--version"], { encoding: "utf8" }).trim(),
    authentication: "ChatGPT subscription",
    APIKeysRemoved: true,
    isolatedTemporaryCodexHomes: true,
    isolatedTemporaryWorkingDirectories: true,
    hostAwakeGuard: { path: CAFFEINATE, sha256: sourceHashes[CAFFEINATE], args: ["-dimsu"] }
  },
  executionPolicy: {
    contexts: 9,
    attemptsPerContext: 1,
    retriesMaximum: 0,
    timeoutMsPerContext: 600000,
    timeoutExtensionsMaximum: 0,
    furtherCorrectionContextsMaximum: 0,
    maximumParallelContexts: 2,
    schedulerRamp: [1, 2],
    continueIndependentFrozenShardsAfterFailure: true,
    removedEnvironmentVariables: originalPreparation.executionPolicy.removedEnvironmentVariables,
    directIncrementalCostUsdMaximum: 0,
    meteredApiCostUsdMaximum: 0,
    separateActivationRequired: true
  },
  stopRules: {
    stopOnSourceHashMismatch: true,
    noAutomaticRetry: true,
    noTimeoutExtension: true,
    noFurtherAutomaticCorrection: true,
    noPaidServices: true,
    noProductionMutationUntilEveryDebatePasses: true,
    stopBeforeBatch14: true
  },
  sourceHashes,
  futureOutputPathsExcludedFromSourceHashes: futureOutputs,
  artifacts: {
    activation: `${ROOT}/execution-activation.json`,
    execution: `${ROOT}/model-execution.json`,
    analysis: `${ROOT}/analysis.json`,
    completeCohortAnalysis: `${ROOT}/complete-cohort-analysis.json`
  },
  totals: {
    debates: 1, contexts: 9, critiqueFields: 16, quoteFields: 1, writableFields: 17,
    modelContextsExecuted: 0, modelAuthoredScores: 0, paidServiceCallsThisStage: 0,
    directIncrementalCostUsd: 0
  },
  authorization: {
    preparation: true, activation: true, modelExecution: true,
    deterministicValidationMergeAndCohortReplay: true,
    retries: false, timeoutExtensions: false, furtherCorrections: false,
    paidServices: false, productionMutation: false, nextBatchSelection: false
  },
  nextAuthorizedAction: "commit-and-push-frozen-nine-shard-debate-30-repair-then-activate"
};
assertV4(manifest.model.slug === "gpt-5.6-sol" &&
  manifest.model.reasoningEffort === "low" &&
  manifest.model.authentication === "ChatGPT subscription",
"authorized model settings changed");
if (shouldWrite) {
  await mkdir(path.resolve(`${ROOT}/packets`), { recursive: true });
  await mkdir(path.resolve(`${ROOT}/schemas`), { recursive: true });
  await writeFile(path.resolve(MANUAL), manualBytes);
  for (const context of contexts) {
    await writeFile(path.resolve(context.packet), context.packetBytes);
    await writeFile(path.resolve(context.schema), context.schemaBytes);
  }
  await writeFile(path.resolve(MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
}
console.log(JSON.stringify({
  status: shouldWrite ? manifest.status : "preview",
  debates: FAILED_DEBATES,
  contexts: 9,
  critiqueFields: 16,
  quoteFields: 1,
  writableFields: 17,
  maximumParallelContexts: 2,
  attemptsPerContext: 1,
  retriesMaximum: 0,
  timeoutExtensionsMaximum: 0,
  furtherCorrectionsMaximum: 0,
  directIncrementalCostUsdMaximum: 0
}, null, 2));
