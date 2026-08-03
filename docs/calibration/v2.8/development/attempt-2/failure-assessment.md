# v2.8.1 attempt-2 failure assessment

Attempt 2 failed before reliability analysis and remains classification-only.

Pass A obeyed the five-file read allowlist and passed the structural schema validator, but it did not perform the semantic task. It returned the same boilerplate rationale for all 25 cases and selected only defaults: no changed targets, no component contacts, no diagnostic candidates, no impacts, no reframes, and no bridge contacts. Treating that artifact as a normal low-recall annotation would conceal an implementation defect: the schema checked evidence consistency but not substantive completion of a deliberately feature-balanced challenge.

Pass B opened the reassessment skill file even though the prompt limited reads to five files. It was immediately disqualified and terminated. No Pass B artifact is accepted.

No A/B reliability analysis is valid, no threshold was changed, and no fresh held-out transcript was opened.

## Required v2.8.2 controls

- The challenge prompt and manual must state that the retired fixture set intentionally contains at least three positives for target change, component contact, diagnostic consequence, reframe, and bridge contact.
- The pass validator must independently calculate and enforce minimum non-default counts without reading the hidden key.
- At least 80% of case rationales must be unique, and a single boilerplate rationale may not recur.
- The audit block must report validator-derived non-default counts; claimed counts must exactly match the annotation content.
- A pass that reads outside its allowlist is invalid even if its JSON later validates.
- v2.8.1 labels and thresholds may carry forward because the semantic rules are unchanged; only execution-completion controls change.

