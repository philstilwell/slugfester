import {
  V4221175_ADJUDICATION_ISOLATION,
  buildV4221175AdjudicationPacket,
  makeV4221175AdjudicationSchema,
  validateV4221175AdjudicationOutput,
} from "./v4221175-decomposed-adjudication.mjs";

export const V42211728_ROOT = "docs/calibration/v4.2.21.17.28/hard-route-dispute-only-adjudication";
export const V42211728_PROTOCOL_ID = "v4.2.21.17.28-hard-route-decomposed-consensus";
export const V42211728_PACKET_VERSION = "4.2.21.17.28-hard-route-dispute-only-adjudication-packet";
export const V42211728_OUTPUT_VERSION = "4.2.21.17.28-hard-route-dispute-only-adjudication-output";

const clone = (value) => structuredClone(value);

export function buildV42211728AdjudicationPacket(disagreements, lockedInventory, events, audioVerificationByMoveId = new Map()) {
  const normalizedAudio = new Map([...audioVerificationByMoveId].map(([moveId, audio]) => [moveId, {
    ...clone(audio),
    deterministicEvidence: {
      ...clone(audio.deterministicEvidence),
      transcriptHashMatched: Boolean(audio.transcript?.sha256),
      excerptRecall: audio.deterministicEvidence?.expectedSpeakerExcerptRecall,
    },
  }]));
  const built = buildV4221175AdjudicationPacket(disagreements, lockedInventory, events, normalizedAudio);
  built.packet.schemaVersion = V42211728_PACKET_VERSION;
  built.packet.protocolId = V42211728_PROTOCOL_ID;
  for (const input of built.audioTranscriptInputs) {
    const oldName = input.modelInputFile;
    input.modelInputFile = oldName.replace(/\.txt$/, ".json");
    const move = built.packet.disputedMoves.find((item) => item.moveId === input.moveId);
    if (move?.evidence.audioVerification) move.evidence.audioVerification.modelInputFile = input.modelInputFile;
  }
  return built;
}

export function makeV42211728AdjudicationSchema() {
  const schema = makeV4221175AdjudicationSchema();
  schema.$id = "slugfester-v42211728-hard-route-dispute-only-adjudication";
  schema.title = "Slugfester v4.2.21.17.28 hard-route dispute-only adjudication";
  schema.properties.schemaVersion.const = V42211728_OUTPUT_VERSION;
  schema.properties.protocolId.const = V42211728_PROTOCOL_ID;
  return schema;
}

export function validateV42211728AdjudicationOutput(output, packet) {
  const translatedOutput = clone(output);
  const translatedPacket = clone(packet);
  translatedOutput.schemaVersion = "4.2.21.17.5-dispute-only-adjudication-output";
  translatedOutput.protocolId = "v4.2.21.17.5-decomposed-consensus";
  translatedPacket.schemaVersion = "4.2.21.17.5-dispute-only-adjudication-packet";
  translatedPacket.protocolId = "v4.2.21.17.5-decomposed-consensus";
  return validateV4221175AdjudicationOutput(translatedOutput, translatedPacket);
}

export { V4221175_ADJUDICATION_ISOLATION as V42211728_ADJUDICATION_ISOLATION };
