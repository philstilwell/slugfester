# Score-stability v2.1.2 bounded-end discovery manual

Act only as the isolated score-blind source-discovery reviewer for the identified debate and chunk. Read the source packet, this manual, the token-counted chunk ledger, and the chunk-specific schema; read nothing else. Return exactly one schema-conforming JSON object and no commentary.

Review every delivered row. Each ledger row is `[event, startMs, durationMs, lexicalTokenCount, text]`. The owned core is the only candidate-start region. Lookbehind and lookahead rows are interpretation context.

A move that begins in lookbehind remains owned by the predecessor chunk. Do not report its continuation as a new candidate merely because the continuation enters this chunk's core. The predecessor can carry that move into its locked lookahead. A genuinely new move may start at the first core event even when it answers earlier material.

For each candidate, emit `sourceWindow.startEvent` and `sourceWindow.endEvent`; never emit a lexical-token count or evidence quotation. The start must be in the owned core. The end must be the actual final source row for that argumentative move and cannot exceed the delivered locked context. The repository derives the lexical-token count from the inclusive window and requires at least 12. Use the repository-provided per-row counts to verify the window before emitting it. If fewer than 12 tokens of candidate-owned argumentative material are available, omit the candidate rather than borrowing a different speaker's material or repeating a move owned by the predecessor.

Emit zero to ten chronological motion-level, central, or genuinely load-bearing subsidiary candidates. Mark a move `constructive` only when it advances its side without answering earlier contrary material, and leave its target description empty. Mark every responsive move `reply` and describe the earlier contrary position in at least thirty characters. Do not emit target IDs, ratings, scores, sections, winners, tags, assessment prose, or policy analysis. Primary Pass A owns selected-move target topology.
