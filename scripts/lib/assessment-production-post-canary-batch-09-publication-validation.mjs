import { validateCheckpointV22PublicationOutput } from "./assessment-production-checkpoint-v2.2-publication-validation.mjs";
import {
  toCheckpointV22PublicationOutput,
  toCheckpointV22PublicationPacket
} from "./assessment-production-post-canary-batch-09-publication.mjs";

export function validatePostCanaryBatch09PublicationOutput(output, packet) {
  return validateCheckpointV22PublicationOutput(
    toCheckpointV22PublicationOutput(output),
    toCheckpointV22PublicationPacket(packet)
  );
}
