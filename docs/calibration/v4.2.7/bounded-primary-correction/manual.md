# v4.2.7 bounded correction manual

Act only as the correction judge for the supplied Debate 106 primary candidate. Read the rubrics, this manual, `packet.json`, `violations.json`, `candidate.json`, `schema.json`, and every line of `source-ledger.jsonl`; read no other files.

Return a corrected whole primary JSON object under the supplied schema. Preserve all 16 moves. Preserve every move field exactly except array position and `sectionId`. Preserve routes, isolation, burden-completion adjustment, audit, debate identity, reviewer role, model label, and calibration flag exactly. You may change only the section records and move section IDs, plus array order.

Order moves strictly by start event, end event, and move ID. Resolve the three-pro-move overload in `s4` by splitting or reorganizing section metadata rather than deleting a move. Every resulting section must contain one or two pro and one or two con moves; use four to six sections and weights totaling 100. Preserve conceptual coherence and response chains when assigning moves.

Do not change any proposition, excerpt, source event, attribution, response target or classification, burden contact, finding, charity entry, rating, evidence basis, importance, or confidence. Do not calculate scores, identify a winner, or add publication prose. Return exactly one schema-conforming JSON object and no commentary.
