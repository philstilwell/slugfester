#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { readJson, assertV4 } from "./lib/v41-lean-production.mjs";
import { V4171_AUDIO_ADJ_PROTOCOL_ID, V4171_AUDIO_ADJ_ROOT, validateV4171AudioAdjudicationOutput } from "./lib/v4171-audio-adjudication.mjs";
import { V417_PASS_B_ROOT } from "./lib/v417-triggered-consensus.mjs";

const root = process.cwd(); const shouldWrite = process.argv.includes("--write");
const [execution, output, packet, audioAudit] = await Promise.all([readJson(`${V4171_AUDIO_ADJ_ROOT}/model-execution.json`), readJson(`${V4171_AUDIO_ADJ_ROOT}/output.json`), readJson(`${V4171_AUDIO_ADJ_ROOT}/packet.json`), readJson(`${V417_PASS_B_ROOT}/audio-verification.json`)]);
assertV4(execution.status === "audio-adjudication-execution-passed" && execution.authorization.analysis, "valid audio adjudication execution unavailable");
const validation = await validateV4171AudioAdjudicationOutput(output, packet, root);
const passed = validation.verified === 2 && validation.unresolved === 0;
const analysis = {
  schemaVersion: "4.1.7.1-audio-attribution-adjudication-analysis", protocolId: V4171_AUDIO_ADJ_PROTOCOL_ID,
  status: passed ? "audio-attribution-adjudication-passed" : "audio-attribution-adjudication-unresolved",
  preservedDeterministicGate: { status: audioAudit.status, verified: audioAudit.totals.verified, unresolved: audioAudit.totals.unresolved, erasedOrReclassified: false },
  adjudication: { output: `${V4171_AUDIO_ADJ_ROOT}/output.json`, validation, decisions: output.adjudications },
  combinedAudioResult: { requiredMoves: 12, deterministicallyVerified: 10, adjudicatedVerified: validation.verified, unresolved: validation.unresolved, verificationRate: (10 + validation.verified) / 12 },
  costs: { additionalPaidTranscriptionCalls: 0, additionalTranscriptionCostUsd: 0, modelComputeAuthentication: "ChatGPT subscription", meteredModelApiCostUsd: 0 },
  legacyBoundary: { legacyAssessmentContentAccessed: false, legacyScoresAccessed: false, legacyWinnersAccessed: false, scoreArtifactCreated: false },
  authorization: { disagreementExtraction: passed, ratingAdjudication: false, compressionAuditModelExecution: false, scoreDerivation: false, legacyComparison: false, publicationFinalization: false, productionMutation: false, heldOutGate: false, all195Debates: false }
};
const assessment = `# v4.1.7.1 audio-attribution adjudication assessment\n\nThe isolated 5.6 Sol/high adjudicator returned ${validation.verified} verified and ${validation.unresolved} unresolved decisions for the two Debate 91 audio-attribution disputes. The original deterministic gate remains preserved at 10/12 verified; it was not rewritten or declared to have passed. The combined evidence state is ${10 + validation.verified}/12 resolved, with ${validation.unresolved} remaining.\n\nThis stage used one subscription-authenticated model context, no API key, no paid transcription call, no retry, no threshold relaxation, and no manual override. ${passed ? "Deterministic disagreement extraction is authorized next; scoring, legacy comparison, and production remain blocked." : "The workflow remains blocked before disagreement extraction and scoring."}\n`;
if (shouldWrite) { await writeFile(path.resolve(root, V4171_AUDIO_ADJ_ROOT, "analysis.json"), `${JSON.stringify(analysis, null, 2)}\n`); await writeFile(path.resolve(root, V4171_AUDIO_ADJ_ROOT, "assessment.md"), assessment); }
console.log(JSON.stringify({ status: analysis.status, verified: validation.verified, unresolved: validation.unresolved, combinedAudioVerificationRate: analysis.combinedAudioResult.verificationRate, disagreementExtractionAuthorized: analysis.authorization.disagreementExtraction, additionalPaidTranscriptionCalls: 0, meteredModelApiCostUsd: 0, legacyAccessed: false }, null, 2));
if (!passed) process.exitCode = 1;
