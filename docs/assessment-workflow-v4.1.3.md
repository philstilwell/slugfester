# Slugfester Bounded Lean Workflow v4.1.3

This prospective amendment inherits v4.1 through v4.1.2. It changes no scoring anchor, model allocation, source-access requirement, selection bound, trigger, compute assumption, or score formula. It adds a mandatory pre-submission cross-field consistency pass to the primary judgment.

## Closed consistency pass

Before returning JSON, the judge silently checks every selected move against these literal tuples and corrects its own draft when a tuple is inconsistent:

| Response class | Required response structure | Responsiveness range |
| --- | --- | ---: |
| `constructive-opening` | Constructive move; zero targets and zero components. | 0–100 |
| `full-answer` | Reply; at least one target and component; every component contacted. | 80–100 |
| `partial-answer` | Reply; more than zero but fewer than all components contacted. | 55–79 |
| `diagnostic-defeat` | Reply; at least one component contacted and defeating consequence explicit. | 80–100 |
| `relevant-nonanswer` | Reply; zero components contacted and issue-bearing contrary material true. | 40–69 |
| `justified-reframe` | Reply; at least one component contacted and replacement demand answered. | 80–100 |
| `nonanswer` | Reply; zero components contacted and issue-bearing contrary material false. | 0–39 |

Every reply target must precede the reply in repository-derived chronology. At least one declared response component must be decisive. Motion, central, subsidiary, and no-contact burden tiers must respectively use relevance/burden ranges 90–100, 75–89, 55–74, and 0–54. When charity is untested, both descriptive charity strings must be empty and representational charity must equal 75; when tested, both strings must identify the stronger alternative and its decisive qualification.

This pass is part of the single primary scoring pass. It is neither a retry nor a second assessment, and it cannot change the substantive rubric to make an invalid tuple acceptable. Repository validation remains authoritative and still fails the context rather than normalizing it.

Protocol identity:

- `schemaVersion: 4.1.3-bounded-primary-output`
- `protocolId: v4.1.3-bounded-lean-risk-triggered-consensus`
