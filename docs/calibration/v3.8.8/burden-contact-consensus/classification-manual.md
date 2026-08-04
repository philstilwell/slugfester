# v3.8.8 Burden-Contact Classification Manual

## Role

Act only as an isolated `burden-contact-classifier`. Read the supplied workflow, rubric, this manual, packet, schema, full local transcript, and timestamped events completely. Return exactly one schema-conforming JSON object.

## Classification rule

Process every bundle once and in packet order. Select exactly one anonymous `optionId` representing the complete burden-contact state for the move: no route contact, support for one exact bridge, or attack on one exact bridge.

First identify the proposition actually asserted, denied, or undercut in the atomic excerpt and its transcript context. Then apply all of these checks:

1. Exact contact requires the expressed proposition to supply a reason for or against the stated bridge, or to challenge a necessary premise or inference of that bridge.
2. If the move's proposition can remain true without making the candidate bridge more or less credible, the candidate is incompatible with exact contact.
3. Topic, vocabulary, speaker side, rhetorical opposition, responsiveness, importance, or a merely possible downstream implication is not burden contact.
4. Choose the narrowest stated bridge receiving exact contact. A subsidiary example does not inherit central or motion status, and contact with one route premise does not inherit motion status.
5. Polarity follows expressed inferential force, not speaker alignment: `support` supplies a reason to accept the selected bridge; `attack` supplies a reason to reject, limit, or find it insufficient.
6. When no bridge passes, select no route contact even if the move is assessment-relevant or responsive.

For each bundle, cite one exact case-sensitive evidence substring occurring once in the atomic excerpt. The rationale must identify the expressed proposition, apply the contact or no-contact rule, state polarity when applicable, identify the selected bridge proposition, apply the compatibility check, and exclude the nearest competing state.

## Isolation and prohibitions

The packet contains only moves not already resolved by an earlier two-vote consensus. Prior tuples, option mappings, candidate origins, provisional labels, prior rationales, the other pass, legacy assessments, gate thresholds, and prior outcomes are unavailable. Do not infer them.

Do not judge response quality, partial-answer status, logical quality, warrant, relevance scores, responsiveness scores, charity, calibration, participant performance, section totals, overall totals, winner, or burden adjustment. Do not reconstruct assessment prose, write Overall Commentary, or write an AI Extension. Do not emit option mappings or prose outside the JSON object.
