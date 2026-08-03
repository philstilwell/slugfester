# v2.7 dual-lane held-out classification gates

The development contract was frozen at commit `30ca1ec16d973d1d061efd9204ffba33d24f5aec`. A random seed was generated before candidate ranks were inspected. The metadata-only pool excludes all 19 debates used in v2.1 development or the v2.4–v2.6 held-out gates, and all 195 corpus debates had complete local transcript chains.

The seeded dyadic sample is:

- Pageau–Folley on logos, meaning, and resurrection;
- Knechtle–Aron Ra on God's existence; and
- Lennox–Atkins on whether science can explain everything.

The seeded multi-speaker sample is:

- Hitchens–Kushner–Gomes on God, religion, and morality;
- Koukl–O'Connor–Kanojia on nonbelief and harm; and
- Krauss–Meyer–Lamoureux on God, science, and the universe.

Each lane is independently promotable. Artifacts are calibration-only and contain no numerical performance scores. Passing one classification lane does not authorize the other lane or corpus-wide reassessment.

Expected artifact directories beneath each lane are `draft-inventories`, `reviewed-inventories`, `inventories`, `inventory-reviews/round-1`, optional or required later review rounds, `pass-a`, `pass-b`, and `locks`. Multi-speaker inventories always require two independent semantic reviews; a protected repair in the second requires a third. Dyadic inventories require one review and a follow-up after a protected repair.
