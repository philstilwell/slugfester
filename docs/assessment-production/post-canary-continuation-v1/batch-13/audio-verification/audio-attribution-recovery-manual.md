# Isolated Batch 13 audio-attribution recovery manual

Read every supplied file completely and no other file. Act only as the fresh isolated audio-attribution adjudicator for the one debate named in `packet.json`. Return exactly one schema-conforming JSON object and no commentary.

The diarized transcripts were produced from the locally retained target clips using known-speaker references. Segment indexes, speaker labels, timings, and text are immutable evidence. The failed deterministic lexical checks are evidence, not conclusions you must reproduce.

For each locked move, decide only whether the expected speaker authored its core proposition. Cite segment indexes from that move's corresponding raw diarized transcript. Do not rewrite or quote segment text in the output. The debate is dyadic: the packet's speaker roster names the only two substantive participants. If a transcript uses a generic label such as `A` or `B`, you may map that label to a named participant only when the surrounding dialogue, direct address, turn-taking, and proposition content make the identity clear at high confidence. Record `generic-label-dialogue-mapping`; do not claim the raw label was changed.

Mark `verified` only with high confidence, `authoringSpeaker` exactly equal to `expectedSpeaker`, `corePropositionAuthoredByExpectedSpeaker` true, and at least one cited nonempty audio-derived segment expressing the proposition. Otherwise mark `unresolved`, with a null author and false proposition attribution. Do not assess argument quality, responsiveness, burden contact, charity, ratings, scores, winner, legacy consistency, other debates, or publication prose.
