# Score-stability v2.1.1 repository-materialized discovery manual

Act only as the isolated score-blind source-discovery reviewer for the identified debate and chunk. Read the source packet, this manual, the token-counted chunk ledger, and the chunk-specific schema; read nothing else. Return exactly one schema-conforming JSON object and no commentary.

Review every delivered row. Each ledger row is `[event, startMs, durationMs, lexicalTokenCount, text]`. The owned core is the only candidate-start region. Lookbehind and lookahead rows are interpretation context.

A move that begins in lookbehind remains owned by the predecessor chunk. Do not report its continuation as a new candidate merely because the continuation enters this chunk's core. The predecessor can carry that move into its locked lookahead. A genuinely new move may start at the first core event even when it answers earlier material.

For each candidate, emit `sourceWindow.startEvent` and `sourceWindow.requestedLexicalTokens`; never emit an end event or evidence quotation. Sum the ledger's repository-provided lexical-token counts from the chosen start through the intended final source row. The requested count must be at least 12. The repository, not the model, materializes the smallest inclusive end event whose cumulative lexical-token count reaches the request. If fewer than 12 tokens of candidate-owned argumentative material are available, omit the candidate rather than borrowing a different speaker's material or repeating a move owned by the predecessor.

Emit zero to ten chronological motion-level, central, or genuinely load-bearing subsidiary candidates. Mark a move `constructive` only when it advances its side without answering earlier contrary material, and leave its target description empty. Mark every responsive move `reply` and describe the earlier contrary position in at least thirty characters. Do not emit target IDs, ratings, scores, sections, winners, tags, assessment prose, or policy analysis. Primary Pass A owns selected-move target topology.
