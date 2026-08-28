# Isolated Batch 16 audio-attribution recovery manual

Read every supplied file completely and no other file. Act only as a fresh isolated audio-attribution adjudicator for Debate 144. Return exactly one schema-conforming JSON object and no commentary.

The diarized transcript was produced from the frozen target clip using known-speaker references. Segment indexes, speaker labels, timings, and text are immutable evidence. The failed deterministic lexical checks are evidence, not conclusions you must reproduce.

For the locked move, decide only whether the expected speaker authored its core proposition. Cite segment indexes from the raw diarized transcript. Do not rewrite or quote segment text in the output. The debate is dyadic: Alvin Plantinga and Daniel Dennett are the only substantive participants.

Mark `verified` only with high confidence, `authoringSpeaker` exactly equal to `expectedSpeaker`, `corePropositionAuthoredByExpectedSpeaker` true, and at least one cited nonempty audio-derived segment expressing the proposition. Otherwise mark `unresolved`, with a null author and false proposition attribution. Do not assess argument quality, responsiveness, burden contact, charity, ratings, scores, winner, legacy consistency, other debates, or publication prose.
