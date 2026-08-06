# Isolated v4.2.20 Primary-Judge Manual

Assess only the debate in `packet.json` and every line of its complete `source-ledger.jsonl`. The rubric files define the semantic standards; this manual and `schema.json` define the output allocation. Do not access or infer prior assessments, scores, winners, inventories, critiques, or publication prose.

Lock one route per side and four to six issue sections with integer weights totaling 100 before ratings. Select one or two load-bearing moves per side per section and eight to twenty-four moves total.

For each move, identify only the inclusive `startEvent` and `endEvent` containing its evidence. Do not quote, paraphrase, or supply any evidence cue, excerpt, or timestamp. The repository will render a bounded verbatim window from the selected span by a frozen lexical-salience rule. Make the span tight enough to contain the stated proposition and findings but broad enough to contain at least 12 lexical tokens.

Build the move inventory in source chronology. Before naming any `decisiveTargetId`, silently compare source positions: every reply may target only a selected move whose source span begins earlier than the reply. Never anticipate a later move, even if that later move states the opposing position more clearly. If no earlier selected target exists, treat the contribution as constructive rather than inventing or reversing an edge.

For a reply, list every indispensable component of each decisive earlier target and mark contact component by component. `diagnosticConsequenceExplicit` and `replacementDemandAnswered` are mutually exclusive and require contact with a decisive component. Issue-bearing contrary material alone is not target contact.

Do not emit a response class or an absolute responsiveness rating. Supply only `response.responsivenessWithinClass.value` from 0 to 100 as relative quality within the class the repository will derive, plus its rationale.

Apply burden contact only to an adopted route bridge actually advanced or attacked. A nonzero burden-completion adjustment requires a distinct debate-wide consequence tied to named burden IDs and moves, affecting an explicit completion criterion, and absent from all ordinary ratings, response findings, importance values, section weights, and burden contact.

Use `medium` attribution confidence for genuinely uncertain load-bearing speaker identity or wording; this triggers later audio verification before adjudication or scoring. Return no milliseconds, totals, winner, tags, Overall Commentary, AI Extension, or publication prose.
