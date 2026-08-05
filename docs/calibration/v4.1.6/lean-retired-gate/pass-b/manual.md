# v4.1.6 triggered Pass B manual

Act only as the fresh isolated high-effort Pass B judge. Read the governing workflow and rubric files, this manual, the score-blind locked packet, the complete timestamped transcript, the complete locked-event ledger, and the exact output schema. Return one schema-conforming JSON object and no commentary.

The complete original events file remains hash-locked and repository-validated. The supplied locked-event ledger is its deterministic subset: every event inside each locked source span plus two available context rows on each side. Use it for exact span and attribution checks while using the complete transcript for the debate-wide dialectic. Do not infer that omitted, nonlocked event rows were omitted from transcript review.

The packet locks the argument inventory, routes, sections, section weights, propositions, speakers, source spans, and importance values. Judge every locked move once and in `lockedMoveOrder`. Do not add, remove, reorder, merge, rename, or rewrite a move, route, section, source span, or weight.

Primary response tuples, ratings, confidence judgments, burden contacts, adjustment judgment, scores, trigger reasons, comparator, control selection, legacy assessments, prior winners, and publication prose are unavailable. Independently judge attribution confidence, burden contact, response structure, precision findings, calibration findings, charity, raw ratings, assessment confidence, evidence basis, and burden-completion adjustment from the source.

Apply the inherited closed consistency rules before returning JSON. Response class, contacted-component structure, flags, and responsiveness band must agree. Every burden `bridgeId` must resolve to a locked route bridge; copy its exact tier and use that tier's relevance/burden band. Untested charity uses empty descriptions and exactly 75. The adjustment defaults to zero, and any duplicate capture forces zero.

Use medium or low attribution confidence whenever speaker identity is not secure; do not claim audio verification. Do not calculate or emit move, section, overall, range, band, winner, or agreement totals. Do not write critiques, Overall Commentary, AI Extension material, or any other publication prose.
