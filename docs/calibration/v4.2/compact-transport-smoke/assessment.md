# v4.2 compact-transport smoke assessment

The retired Debate 180 transport smoke passed on its only Sol/low attempt in 3.03 minutes with clean transport, no retry, no metered API charge, and no transcription call. The same 156-minute debate had timed out at 30 minutes under v4.1.9.

The compact model context was 239,568 bytes, 53.5% smaller than the failed 514,811-byte input. The model received one complete 1,526-row timestamped JSONL transcript instead of duplicate plain-text and event-file copies. Repository replay proved that every ledger row exactly matched the original normalized events, whose bytes and local transcript chain remained hash-locked and authoritative.

The resulting eight-move, four-section diagnostic output passed the unchanged v4.1.9 schema-bounded source validator. Every source excerpt satisfied the 600-character and 100-token ceilings, lexical and ordered coverage, and original event-file hash. Repository-owned millisecond compilation replayed exactly. No score or comparator was produced.

The result isolates the earlier timeout to input transport rather than debate length alone and authorizes preparation—but not model execution—of a new disjoint source-blind gate using compact transport. The next gate must continue to exclude all earlier fresh samples and retain full local transcript storage, event-aware validation, mandatory audio policy, triggered consensus, adjudication-before-scoring, and the existing production-hour ceilings.
