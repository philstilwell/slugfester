# v4.2.4 primary-gate failure assessment

The preregistered v4.2.4 fresh-six primary gate failed on Debate 131, its first context. The runner stopped, did not retry, and did not open the remaining five contexts.

The source hashes and compact ledger passed, transport was clean, and 5.6 Sol/low returned a schema-conforming object in 3.78 minutes. The chronology-first inventory was ordered and every reply target referred to an earlier emitted move. The failure occurred at the inherited excerpt token validator.

Six of eight excerpts contained 103–114 lexical tokens. Each was at or just below the endpoint schema's 600-character ceiling, showing that the model optimized against the machine-enforced character limit while failing to count the separate 100-token prose instruction. The raw output is preserved unchanged. No compiled output, trigger artifact, score, winner, legacy comparator, or publication artifact was created, and no claim is made about validators after the first surfaced failure.

The next retired diagnostic retains compact transport, chronology-first moves, the 12–100-token rule, all judgment anchors, one attempt, no retry, and no normalization. It lowers the endpoint-enforced excerpt ceiling to 450 characters while retaining the deterministic 100-token check. This does not truncate or repair model output; it makes the endpoint constraint conservative enough to guide generation. All six v4.2.4 identities are excluded from later fresh selection.
