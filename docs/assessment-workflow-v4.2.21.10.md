# Slugfester Structural Partition Primary v4.2.21.10

This stage replaces the failed free-standing section/move shape used by the v4.2.12 lean integrated primary. It makes no model or audio call, derives no score, and authorizes no assessment execution.

Primary Pass A selects and judges candidates inside nested section objects. JSON structure requires four to six sections and one to two selections from each side in every section, which necessarily yields eight to twenty-four total moves. Each side container accepts only candidate IDs frozen to that side. Candidate IDs and move IDs must be globally unique, and section weights must total 100%.

The model does not emit section ID per move, side, speaker, move kind, source span, evidence quotation, or attribution-confidence level. The repository restores those fields from the locked section container and discovery candidate, orders moves by original source event, rejects future and same-side targets, renders bounded exact evidence, and sends the reconstructed judgment through the unchanged v4.2.20 validator. Complete-transcript review is recorded as a property of the distributed discovery-plus-primary process, not falsely attributed to a single integrated context.

Passing the structural fixture only authorizes construction of a future discovery execution manifest. It does not authorize discovery, Primary Pass A, Pass B, audio, adjudication, scoring, publication, production mutation, or the 195-debate run.
