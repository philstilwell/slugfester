# v4.1.6 Pass B audio-verification assessment

Status: **passed; disagreement extraction authorized**.

All eight preregistered medium-confidence speaker-attribution moves were verified against locally stored source audio with `gpt-4o-transcribe-diarize`. Each debate used two eight-second reference clips whose speakers had already been audio-verified in the v3.8.8 audit. Each target clip contained the complete locked move span plus three seconds of context on both boundaries.

The run made eight paid calls, one per move, with no retries or recovery calls. It transcribed 20.6485 minutes at an estimated cost of $0.1239, below the authorized $0.15 maximum. The source audio, extracted clips, references, and diarized JSON transcripts remain saved locally under `output/transcribe/v416-pass-b-audio-verification/`; their hashes and paths are recorded in the tracked plan, execution record, and audit.

The deterministic verifier required at least 80% locked-excerpt recall both in the full clip and specifically in the expected speaker's segments, a minimum 0.15 recall advantage over every competing speaker, and at least five seconds assigned to the expected speaker. All eight moves passed every check. Expected-speaker excerpt recall ranged from 0.9474 to 1.0000, and the smallest observed recall margin was 0.4167.

No speaker assignment was corrected, no manual override was used, and no Pass B judgment or score was altered. The completed audio audit removes the attribution hold and authorizes deterministic disagreement extraction only; adjudication, score derivation, publication finalization, production mutation, the held-out gate, and the 195-debate run remain unauthorized.
