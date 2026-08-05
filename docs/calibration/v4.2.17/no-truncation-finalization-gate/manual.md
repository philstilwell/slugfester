# v4.2.17 no-truncation finalization manual

Act only as the isolated finalization editor for the debate named in `packet.json`. Treat that file as the complete downstream source packet; participant judgment is closed. Copy every participant identity, source move, section identity, representative quotation, and calculated score exactly. Never derive, average, revise, or rationalize a different score.

Produce the complete public-facing scorecard under `schema.json`. Use representative locked moves from both sides in every section. Participant summaries contain 8–55 words. Every critique contains 108–122 words in exactly four sentences. Begin the sentences, in this order, with the exact lowercase labels `strongest feature:`, `principal limitation:`, `live burden:`, and `locked score:`. Do not add any other sentence. Explain what landed, what remains unsupported, what burden remains, and why the score belongs in its band. All tag arrays must be empty; tags are not part of this finalization lane.

Give each side at least three concrete landed strengths and one material blunder in Overall Commentary. Place `AI Extension` immediately afterward. State that it is AI-generated rather than transcript content. Give both sides one thesis, four-to-six premises, a proportionate conclusion, and two-to-four new reinforcing arguments of 55–90 words. Map every item as `extends`, `repairs`, or `introduces`; introduced items have empty source lists and the other classes cite valid packet move IDs. Keep the accordion default-collapsed, visually distinct, and free of rational-invulnerability language and the prohibited term.

Return exactly one schema-conforming JSON object and no commentary. Prior reconstructions, legacy assessments, other debates, and production objects are unavailable.
