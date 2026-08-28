# Dyadic calibration promotion report

Status: **passed and published**. This post-campaign release promoted the five already-finalized dyadic calibration debates—51, 63, 90, 153, and 165—to the production site. It is a supplemental release, not Batch 18.

## Published results

| Debate | Production result |
| --- | --- |
| 51 — Lennox vs Atkins | 79–72 |
| 63 — Butt vs Shermer | 71–86 |
| 90 — Akin vs Ehrman | 81–88 |
| 153 — O'Connor vs Carter | 79–82 |
| 165 — Craig vs Rosenberg | 81–76 |

The release reused the frozen adjudicated final ledger and the sole deterministic score pass from the calibration workflow. It made no model call, audio call, score rerun, manual score change, or accepted-prose change. Promotion performed only two preview-boundary transformations: each temporary `calibration-v42211732-*` page ID became its original production debate ID, and the calibration-only metadata wrapper was removed.

Five production debate objects and five new production ledger files were published. The other 190 debate objects, all 174 pre-existing production ledgers, `src/data/references.js`, and all frozen campaign and calibration evidence remained unchanged. Generated debate summaries, five static debate pages, and the sitemap were rebuilt from the new production data.

## Evidence and rendering

The promotion package revalidated the five frozen final outputs, 100 scored moves, 86 source-hash references, the final-ledger hash, and the one existing score artifact. The old calibration readiness wrapper still locks the stylesheet bytes from its preview date and therefore does not replay against the later production stylesheet; this historical limitation is preserved rather than rewriting old evidence.

Fresh production rendering replaced that obsolete preview dependency. All five live routes passed at 1440×1000 and 390×844. The audit retains 20 hashed JPEG screenshots—collapsed and open states for ten viewports—and verifies the native disclosure with pointer, Enter, and Space. There were no horizontal-overflow, console, page, request, or HTTP failures.

The first controller command lacked the required explicit Playwright session-open step and stopped before any viewport existed. Its record is preserved in `rendering/controller-startup-1.json`. The exact startup correction then completed all ten planned viewports with no viewport retry.

## Costs and campaign boundary

Direct incremental cost was **$0**. No paid service or external purchase was used. The original campaign remains closed at 174 debates, and its closure report and manifest remain unchanged. This supplement raises the authenticated production-ledger total to 179 while preserving the prohibition on creating or selecting Batch 18.
