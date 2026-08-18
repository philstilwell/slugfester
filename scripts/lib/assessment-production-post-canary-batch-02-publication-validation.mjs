import { validateCheckpointV22PublicationOutput } from "./assessment-production-checkpoint-v2.2-publication-validation.mjs";
import {
  toCheckpointV22PublicationOutput,
  toCheckpointV22PublicationPacket
} from "./assessment-production-post-canary-batch-02-publication.mjs";

export function validatePostCanaryBatch02PublicationOutput(output, packet) {
  return validateCheckpointV22PublicationOutput(
    toCheckpointV22PublicationOutput(output),
    toCheckpointV22PublicationPacket(packet)
  );
}
