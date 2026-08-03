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

## Preparation checkpoint

All six complete local transcript/event/manifest chains are locked and all six curated atomic inventories pass `validate-v27-atomic-inventory.mjs`. Current inventory digests are:

- dyadic: Knechtle–Aron Ra `b36b4e1a970d76e9edc51ab7acfdcb0604a94b5939e73ccc49781d022aabac54`, Lennox–Atkins `d6b0e8abdb54573079b9fd7de2eddfdcaf10ae6cd5d40c01ce8cbb4d1e1696ad`, and Pageau–Folley `d836a91ef0025053e237cfff2f9c6c78ad0c9089ef3752398aa8c6a9b76e4728`;
- multi-speaker: Hitchens–Kushner–Gomes `102fcd992b679516743705f39d9aa9296b5d13364b2db3886113e2d5e71949e2`, Koukl–O'Connor–Kanojia `ed7a0cf3b17c4f69c4895d5f8734ed335d582b2263dbd1ad5598a78ae0f25f87`, and Krauss–Meyer–Lamoureux `9b83c9c5141d168d84a24ad5f10439456d546229f7ec6a44ca6f90a823ef2b6b`.

The three dyadic round-one reviews record protected repairs and validate successfully, so each requires a clean fresh round-two review. The multi-speaker lane has curated inventories but no completed independent semantic reviews yet; each debate still requires round one and round two. Annotation passes, locks, reliability analyses, numerical scores, Overall Commentary, and AI Extension remain unauthorized until those review chains close and the classification gates pass.
