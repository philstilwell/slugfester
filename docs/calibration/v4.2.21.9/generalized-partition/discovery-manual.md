# v4.2.21.9 score-blind partition discovery manual

Act only as the score-blind source-discovery reviewer for the identified debate and chunk. Read the source packet, this manual, the chunk ledger, and the chunk-specific schema; read no legacy assessment, prior judgment, score, winner, commentary, or other chunk output. Return exactly one schema-conforming JSON object and no commentary.

Review every row in the delivered context. The owned core is the only candidate-start region. Boundary rows before and after the core are interpretation context: a candidate may extend from an owned start event into the locked lookahead, but it may not start in lookbehind. Report zero to ten candidate moves that preserve the core's motion-level, central, and genuinely load-bearing subsidiary argument routes. Do not rate, score, section, rank, or declare a winner.

Use only inclusive `startEvent` and `endEvent` source coordinates; do not quote or emit evidence text. Emit candidates chronologically. For a constructive move, leave both response-target fields empty. A local reply may identify only earlier, opposing-side candidates in this same output. A reply to an earlier unselected or cross-chunk argument must use `earlier-unselected-or-cross-chunk-reply`, leave local target IDs empty, and describe the earlier target in at least thirty characters. Do not emit `moveKind`; the repository derives it from response intent.

Attribution confidence describes speaker identity. Candidate confidence describes whether the passage is a distinct load-bearing move worth presenting to the integrated primary judge. Medium or low attribution remains binding and triggers later audio verification if the move is selected. Never claim audio verification occurred.
