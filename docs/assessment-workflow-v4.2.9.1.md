# Slugfester Long-Context Schema Recovery v4.2.9.1

The two v4.2.9 chunk requests exited in 1.9–3.6 seconds with command code 1, no raw output, and no model inference. A separate subscription probe succeeded. A direct structured-output preflight then reproduced the API error: the proposal schema’s constant-valued `schemaVersion` property lacked an explicit JSON `type`. The same omission affected the other constant-valued properties.

This recovery stage preserves the failed v4.2.9 artifacts and source chunks. It changes only the response schema by adding the correct primitive type to every constant-valued property. The proposal identity, source boundaries, overlap, manual, selection rubric, packet, validator, model, reasoning effort, isolation, one-attempt-per-context rule, and score-blind output contract remain unchanged.

The two prior requests are recorded as pre-inference schema rejections, not semantic model attempts. v4.2.9.1 authorizes one schema-recovery request for each frozen chunk. It does not authorize a second semantic attempt, correction, ratings, scores, integrated-primary execution, fresh gate, production mutation, or the 195-debate run.
