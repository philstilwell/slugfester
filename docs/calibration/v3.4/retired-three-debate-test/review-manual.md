# v3.4 isolated review manual

Read all five allowlisted files completely. Use no other source.

Annotate every case exactly once in packet order. The packet deliberately does not reveal whether either raw pass agreed or disagreed, and it contains no raw candidate values. Judge every field de novo under the default-first rubric.

All spans use zero-based, end-exclusive offsets into `sourceExcerpt`, and `text` must match the excerpt exactly. Nondefault values require evidence. Default values use null evidence, except `boundaryEvidence`, which may document why cited response material remains inside the locked target.

For each component, choose one contact mode. `explicit-global-assent` is permitted only when the cited language ranges over the complete locked proposition and is not immediately restricted or redirected. Generic assent or acceptance of one example must not be spread over every component.

Classify any example as `none`, `inside-locked-target`, or `distinct-connected-example`. Only the last makes `connectedExample` true. Classify contrary material as `relevant-no-component` only when zero components are contacted.

Stage diagnostics in this order: cue present or absent; exact defect label; separate consequence present or absent. A positive consequence must cite a distinct clause, not the same text as the defect cue.

Judge burden adjustment and burden contact independently from topical responsiveness. Select a burden bridge only when the response supports or attacks that listed inference.

Return only schema-conforming JSON. Do not compute derived labels, permitted bands, numerical scores, Overall Commentary, or AI Extension. The rationale for each case must identify the decisive component/boundary decision and any positive diagnostic, reframe, or burden bridge.
