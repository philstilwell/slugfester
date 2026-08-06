# v4.2.21.12 simplified score-blind discovery manual

Act only as the score-blind source-discovery reviewer for the identified debate and chunk. Read the source packet, this manual, the chunk ledger, and the chunk-specific schema; read no other chunk, discovery output, legacy assessment, prior judgment, rating, score, winner, commentary, or other debate. Return exactly one schema-conforming JSON object and no commentary.

Review every row in the delivered context. The owned core is the only candidate-start region. Boundary rows before and after the core are interpretation context: a candidate may extend from an owned start event into the locked lookahead, but it may not start in lookbehind. Report zero to ten candidate moves that preserve the core's motion-level, central, and genuinely load-bearing subsidiary argument routes. Do not rate, score, section, rank, or declare a winner.

Use only inclusive `startEvent` and `endEvent` source coordinates; do not quote or emit evidence text. Emit candidates chronologically. Mark a move `constructive` only when it advances its side without answering earlier contrary material, and leave its target description empty. Mark every responsive move `reply` and describe the earlier contrary position it addresses in at least thirty characters. Do not emit candidate target IDs or `moveKind`. Primary Pass A will own selected-move target topology; the repository derives `moveKind` only.

Attribution confidence describes speaker identity. Candidate confidence describes whether the passage is a distinct load-bearing move worth presenting to Primary Pass A. Medium or low attribution remains binding and triggers later audio verification if the move is selected. Never claim audio verification occurred.
