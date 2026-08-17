import crypto from 'node:crypto';
import fs from 'node:fs';

const ROOT = process.cwd();
const DIAGNOSIS_PATH =
  'docs/assessment-production/post-canary-continuation-v1/batch-02/audio-verification/failure-diagnosis.json';

function absolute(relativePath) {
  return `${ROOT}/${relativePath}`;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function sha256File(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(absolute(relativePath))).digest('hex');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, label) {
  assert(Object.is(actual, expected), `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

const diagnosis = readJson(DIAGNOSIS_PATH);

assertEqual(diagnosis.status, 'frozen-debate-99-response-schema-failure-diagnosed', 'status');
assertEqual(diagnosis.checkpointCommit, '59483c04feeff2c785b46ebb84c7085e297f9799', 'checkpoint');
assertEqual(diagnosis.batchNumber, 2, 'batch number');
assertEqual(diagnosis.target.debateNumber, '99', 'debate number');
assertEqual(diagnosis.target.moveId, 'pro-neural-correlation-interface-model', 'move id');
assertEqual(diagnosis.evidenceBoundary.authorizedRecordCount, 4, 'authorized record count');

for (const [role, source] of Object.entries(diagnosis.evidenceBoundary.authorizedRecords)) {
  assertEqual(sha256File(source.path), source.sha256, `${role} source hash`);
}

assertEqual(diagnosis.executionRecord.status, 'completed', 'transport status');
assertEqual(diagnosis.executionRecord.commandExitCode, 0, 'transport exit code');
assertEqual(diagnosis.executionRecord.transcriptJsonValid, true, 'transport JSON check');
assertEqual(diagnosis.executionRecord.requestFailure, false, 'request failure');
assertEqual(diagnosis.transcriptStructure.segmentCount, 44, 'segment count');
assertEqual(diagnosis.transcriptStructure.nonemptyTextSegmentCount, 43, 'nonempty segment count');
assertEqual(diagnosis.transcriptStructure.emptyTextSegmentCount, 1, 'empty segment count');
assertEqual(diagnosis.transcriptStructure.invalidSegment.index, 36, 'invalid segment index');
assertEqual(diagnosis.transcriptStructure.invalidSegment.textType, 'string', 'invalid field type');
assertEqual(diagnosis.transcriptStructure.invalidSegment.textLength, 0, 'invalid field length');
assertEqual(diagnosis.transcriptStructure.invalidSegment.trimmedTextLength, 0, 'invalid trimmed field length');
assertEqual(
  diagnosis.diagnosis.classification,
  'completed-transport-with-response-schema-invalid-empty-segment-text',
  'diagnosis classification',
);
assertEqual(diagnosis.diagnosis.transportLayerPassed, true, 'transport gate');
assertEqual(diagnosis.diagnosis.segmentLevelValidationPassed, false, 'segment gate');
assertEqual(diagnosis.diagnosis.invalidField, 'segments[36].text', 'invalid field');
assertEqual(diagnosis.diagnosis.transcriptHashAgreement.allEqual, true, 'transcript hash agreement');
assertEqual(diagnosis.diagnosis.providerReasonForEmptySegmentDetermined, false, 'provider-cause limit');
assertEqual(diagnosis.diagnosis.audioContentOrSpeakerIdentityAccuracyDetermined, false, 'semantic limit');

for (const [key, value] of Object.entries(diagnosis.executionBoundary)) {
  if (key === 'directIncrementalCostUsdMaximum') continue;
  assertEqual(value, 0, `execution boundary ${key}`);
}
assertEqual(diagnosis.executionBoundary.directIncrementalCostUsdMaximum, 0, 'cost cap');

for (const [key, value] of Object.entries(diagnosis.authorization)) {
  assertEqual(value, false, `authorization ${key}`);
}

assertEqual(
  sha256File(diagnosis.freezing.diagnosisToolPath),
  diagnosis.freezing.diagnosisToolSha256,
  'diagnosis tool hash',
);
assertEqual(
  diagnosis.nextAuthorizedAction,
  'user-approval-required-before-any-batch-02-debate-99-audio-verification-correction-preparation-or-cohort-validation-resumption',
  'next authorized action',
);

console.log('Batch 2 Debate 99 audio-validation failure diagnosis is frozen and valid.');
