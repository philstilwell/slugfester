export const V382_ROOT = "docs/calibration/v3.8.2/held-out-source-preparation-instrumentation-continuation";
export const V382_MANUAL = `${V382_ROOT}/source-preparation-manual.md`;
export const V382_EXECUTION_MANIFEST = `${V382_ROOT}/execution-manifest.json`;
export const V382_TRANSPORT_FIXTURE = `${V382_ROOT}/structured-retry-detector-fixture.json`;
export const V382_CONTINUATION_FIXTURE = `${V382_ROOT}/continuation-dry-fixture.json`;

export {
  V381_DEBATE_NUMBERS as V382_DEBATE_NUMBERS,
  V381_ROOT,
  V38_GATE_MANIFEST,
  V38_SOURCE_AUDIT,
  assert,
  canonicalJson,
  enrichProposal,
  makeReviewPacket,
  makeReviewSchema,
  phaseLockPaths,
  readJson,
  validateEnrichedProposal,
  validateProposalRaw,
  validateReviewOutput
} from "./v381-source-preparation.mjs";
