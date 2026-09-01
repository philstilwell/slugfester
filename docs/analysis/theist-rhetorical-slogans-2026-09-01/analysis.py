#!/usr/bin/env python3
"""Test whether theist-side moves more often exhibit slogan-like epistemic defects."""

from __future__ import annotations

import csv
import glob
import json
import math
import random
import re
import statistics
import subprocess
from collections import Counter, defaultdict
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
ANALYSIS_DIR = Path(__file__).resolve().parent
TAXONOMY_PATH = (
    REPO_ROOT / "docs/analysis/non-theist-vs-theist-2026-09-01/taxonomy.csv"
)
LEDGER_GLOB = str(REPO_ROOT / "docs/assessment-ledgers/*.json")
DETAILS_DIR = REPO_ROOT / "src/data/debate-details"

DIMENSIONS = (
    "logicalCoherence",
    "evidenceWarrant",
    "responsiveness",
    "relevanceBurden",
    "precisionClarity",
    "calibrationCharity",
)

INSULATION_TAGS = {
    "Argument from ignorance",
    "Special pleading",
    "Subjective validation",
    "Confirmation bias",
    "Belief bias",
}

THEIST_EXAMPLES = {
    ("169", "pro-miracles-and-regular-nature"): (
        "Miracle rejection becomes a prior-bias diagnosis",
        "Miracles are affirmed as special divine actions while categorical rejection is attributed to an antecedent exclusion of the supernatural, turning an evidential objection into a diagnosis of the critic's framework.",
        "No public criterion distinguishes a genuine special divine action from mistake, legend, or anomaly; categorical nonacceptance can be explained as prior prejudice rather than allowed to reflect evidential failure.",
    ),
    ("170", "pro-created-human-worth-purpose"): (
        "Createdness becomes an affirmation of infinite worth",
        "Infinite value and profound meaning are asserted directly from bearing God's image and being wanted by God, giving the metaphysical affirmation emotional force without independent public support.",
        "God's wanting a person and the person's image-bearing are not connected to an observable condition that could count against the claim; every person's existence is defined as compatible with it.",
    ),
    ("170", "pro-divine-solidarity-eternal-compensation"): (
        "Postmortem compensation absorbs present suffering",
        "Christian hope is presented as transcending suffering because God can compensate victims after death, Christ shared suffering, and eternal life can outweigh extinction.",
        "No earthly amount or distribution of suffering can defeat the response if any harm can be compensated after death, while the proposed compensation lies outside ordinary observation.",
    ),
    ("142", "pro-experiential-resurrection-warrant"): (
        "Personal manifestation becomes public proof",
        "A private experience is offered as warrant for resurrection and made available only through repentance and commitment, leaving no independent success criterion for an outsider.",
        "No publicly observable result is specified that would distinguish a genuine manifestation from expectation, suggestion, or error; access to the confirming experience is conditioned on prior repentance and trust.",
    ),
    ("142", "pro-unbelief-avoids-accountability"): (
        "Disagreement is converted into confirmation",
        "Unbelief is explained as moral avoidance, so rejection of the claim is absorbed as evidence of the claimant's diagnosis rather than treated as possible counterevidence.",
        "Denial does not count against the claim: it is reclassified as confirmation that the denier wishes to evade divine accountability.",
    ),
    ("128", "pro-suffering-feasible-world-burden"): (
        "Unknown reasons protect the preferred conclusion",
        "A speculative salvation-maximizing reason is used to shift the burden while no comparative evidence establishes that such a world is probable or feasible.",
        "Any observed suffering can remain compatible with theism by positing an inaccessible morally sufficient reason, while no suffering threshold or distribution is named that would lower confidence.",
    ),
    ("53", "pro-revelation-beyond-reasons-limits"): (
        "Unanswered questions license revelation",
        "Reason's inability to settle ultimate questions is treated as support for revelation without an independent test of revelation's reliability.",
        "The move supplies no independent condition under which a purported revelation would fail, nor a test that discriminates among incompatible revelations claiming to answer the same questions.",
    ),
    ("59", "pro-life-origin-information"): (
        "Explanatory difficulty becomes affirmation",
        "Unresolved origin-of-life questions and an unsupported complexity comparison are used as positive evidence for extraordinary fine-tuning without a discriminating rival comparison.",
        "Present explanatory difficulty is treated as confirmation, but no possible natural account or evidential outcome is stated that would count against the fine-tuning inference.",
    ),
}

NON_THEIST_EXAMPLES = {
    ("85", "pro-science-religion-intellectual-incompatibility"): (
        "Science-versus-religion slogan",
        "Religion is compressed into superstition and wishful thinking, and categorical incompatibility is asserted beyond the supplied comparison.",
        "The categorical wording supplies no boundary case or religious practice that could qualify the claimed incompatibility.",
    ),
    ("14", "con-random-possibility-multiverse"): (
        "Unbounded simplicity claim",
        "An unrestricted possibility space is said to overwhelmingly favor a godless multiverse without a justified probability measure.",
        "Without a defined measure over the unrestricted possibilities, no observation is connected to a specified probability shift that could defeat the asserted overwhelming preference.",
    ),
}

THEIST_COUNTEREXAMPLES = {
    ("137", "pro-source-first-corinthians-authenticity"): "Cumulative manuscript and contextual evidence",
    ("139", "pro-bayesian-priors-likelihoods"): "Explicit Bayesian comparison",
    ("144", "pro-compatibility-possibility-clarification"): "Careful modal qualification",
}


def js_round(value: float) -> int:
    return math.floor(value + 0.5)


def mean(values: list[float]) -> float:
    return statistics.fmean(values)


def load_taxonomy() -> dict[str, dict]:
    with TAXONOMY_PATH.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    included = {row["number"].zfill(2): row for row in rows if row["included"] == "True"}
    assert len(included) == 169
    return included


def load_adapter_index() -> dict[str, Path]:
    index: dict[str, Path] = {}
    for filename in glob.glob(LEDGER_GLOB):
        path = Path(filename)
        with path.open(encoding="utf-8") as handle:
            ledger = json.load(handle)
        number = str(ledger.get("debateNumber", "")).zfill(2)
        assert number and number not in index
        index[number] = path
    return index


def derive_precision(findings: dict) -> int:
    if findings["propositionRecoverability"] == "failed":
        return 35
    if (
        findings["termStability"] == "materially-unstable"
        or findings["scopeStability"] == "materially-unstable"
        or findings["qualificationExplicitness"] == "materially-misleading"
    ):
        return 60
    if (
        findings["propositionRecoverability"] == "partial"
        or findings["termStability"] == "partly-unstable"
        or findings["scopeStability"] == "partly-unstable"
        or findings["qualificationExplicitness"] == "missing"
    ):
        return 75
    if findings["qualificationExplicitness"] == "implicit":
        return 85
    return 95


def derive_calibration(findings: dict) -> int:
    fit = findings["warrantFit"]
    if fit == "radically-overstated":
        return 35
    if fit == "materially-overstated":
        return 60
    if fit == "slightly-overstated":
        return 75
    if (
        findings["qualificationStatus"] in {"explicit", "not-needed"}
        and findings["uncertaintyAcknowledged"] in {"yes", "not-needed"}
    ):
        return 95
    return 85


def normalize_ledger(adapter_path: Path) -> tuple[dict, list[dict], str]:
    with adapter_path.open(encoding="utf-8") as handle:
        adapter = json.load(handle)
    if "scoringJudgment" in adapter:
        moves = []
        for move in adapter["scoringJudgment"]["moves"]:
            dimensions = {
                key: move["ratings"][key]["value"]
                for key in (
                    "logicalCoherence",
                    "evidenceWarrant",
                    "responsiveness",
                    "relevanceBurden",
                )
            }
            dimensions["precisionClarity"] = derive_precision(move["precisionFindings"])
            epistemic_calibration = derive_calibration(move["calibrationFindings"])
            charity = move["ratings"]["representationalCharity"]["value"]
            dimensions["calibrationCharity"] = js_round(
                (epistemic_calibration + charity) / 2
            )
            moves.append({**move, "dimensions": dimensions})
        return adapter, moves, "closed-findings"

    final_path = REPO_ROOT / adapter["evidenceLocks"]["finalLedger"]["path"]
    with final_path.open(encoding="utf-8") as handle:
        final = json.load(handle)
    moves = [
        {
            **move,
            "dimensions": {
                key: move["finalDimensions"][key]["value"] for key in DIMENSIONS
            },
        }
        for move in final["moves"]
    ]
    return adapter, moves, "final-dimensions-only"


def side_label(side: str, taxonomy_row: dict) -> str:
    return "theist" if side == taxonomy_row["theist_side"] else "non_theist"


def compression_deficit(move: dict) -> bool:
    findings = move["precisionFindings"]
    return (
        findings["termStability"] != "stable"
        or findings["scopeStability"] != "stable"
        or findings["qualificationExplicitness"]
        in {"missing", "materially-misleading"}
    )


def flags(move: dict) -> dict[str, bool]:
    calibration = move["calibrationFindings"]
    precision = move["precisionFindings"]
    low_warrant = move["dimensions"]["evidenceWarrant"] < 70
    material_overclaim = calibration["warrantFit"] in {
        "materially-overstated",
        "radically-overstated",
    }
    compressed = compression_deficit(move)
    return {
        "low_warrant": low_warrant,
        "material_overclaim": material_overclaim,
        "compression_deficit": compressed,
        "missing_qualification": precision["qualificationExplicitness"]
        in {"missing", "materially-misleading"},
        "term_instability": precision["termStability"] != "stable",
        "scope_instability": precision["scopeStability"] != "stable",
        "strong_force_low_warrant": low_warrant
        and calibration["assertedForce"]
        in {"certainty", "necessity", "strong-probability"},
        "slogan_risk": low_warrant and material_overclaim and compressed,
    }


def metric_summary(moves: list[dict], metric: str) -> dict:
    selected = {side: [move for move in moves if move["sideLabel"] == side] for side in ("theist", "non_theist")}
    result = {}
    for side, side_moves in selected.items():
        count = sum(flags(move)[metric] for move in side_moves)
        result[side] = {
            "count": count,
            "moves": len(side_moves),
            "share": count / len(side_moves),
        }
    result["difference_pp"] = 100 * (
        result["theist"]["share"] - result["non_theist"]["share"]
    )
    result["risk_ratio"] = (
        result["theist"]["share"] / result["non_theist"]["share"]
        if result["non_theist"]["share"]
        else None
    )
    return result


def debate_differences(
    moves: list[dict], metric: str, predicate=lambda move: True
) -> list[dict]:
    rows = []
    for number in sorted({move["number"] for move in moves}, key=int):
        by_side = {}
        for side in ("theist", "non_theist"):
            side_moves = [
                move
                for move in moves
                if move["number"] == number
                and move["sideLabel"] == side
                and predicate(move)
            ]
            if not side_moves:
                break
            count = sum(flags(move)[metric] for move in side_moves)
            by_side[side] = {
                "count": count,
                "moves": len(side_moves),
                "share": count / len(side_moves),
            }
        if len(by_side) != 2:
            continue
        rows.append(
            {
                "number": number,
                "theist_count": by_side["theist"]["count"],
                "theist_moves": by_side["theist"]["moves"],
                "theist_share": by_side["theist"]["share"],
                "non_theist_count": by_side["non_theist"]["count"],
                "non_theist_moves": by_side["non_theist"]["moves"],
                "non_theist_share": by_side["non_theist"]["share"],
                "difference": by_side["theist"]["share"]
                - by_side["non_theist"]["share"],
            }
        )
    return rows


def clustered_bootstrap(differences: list[float], seed: int = 20260901) -> dict:
    rng = random.Random(seed)
    n = len(differences)
    draws = [
        mean([differences[rng.randrange(n)] for _ in range(n)]) for _ in range(20_000)
    ]
    draws.sort()
    return {
        "estimate": mean(differences),
        "ci_95_low": draws[int(0.025 * len(draws))],
        "ci_95_high": draws[int(0.975 * len(draws))],
        "positive": sum(value > 0 for value in differences),
        "ties": sum(value == 0 for value in differences),
        "negative": sum(value < 0 for value in differences),
        "n_debates": n,
        "method": "20,000 deterministic resamples of whole debates",
    }


def subset_summary(moves: list[dict], name: str, predicate) -> dict:
    selected = [move for move in moves if predicate(move)]
    summary = metric_summary(selected, "slogan_risk")
    paired = debate_differences(moves, "slogan_risk", predicate)
    return {
        "subset": name,
        **summary,
        "paired": clustered_bootstrap([row["difference"] for row in paired]),
    }


def parse_public_debate(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    marker = "export const debate = "
    start = text.index(marker) + len(marker)
    return json.loads(text[start:].strip().removesuffix(";"))


def tag_analysis(taxonomy: dict[str, dict]) -> tuple[dict, list[dict]]:
    taxonomy_by_id = {row["id"]: row for row in taxonomy.values()}
    debate_rows = []
    for path in DETAILS_DIR.glob("*.js"):
        debate = parse_public_debate(path)
        row = taxonomy_by_id.get(debate["id"])
        if not row:
            continue
        side_moves = {"theist": 0, "non_theist": 0}
        tagged_moves = {"theist": 0, "non_theist": 0}
        insulation_moves = {"theist": 0, "non_theist": 0}
        tag_counts = {"theist": Counter(), "non_theist": Counter()}
        for section in debate.get("sections", []):
            for exchange in section.get("exchanges", []):
                for side in ("pro", "con"):
                    move = exchange.get(side)
                    if not isinstance(move, dict):
                        continue
                    label = side_label(side, row)
                    side_moves[label] += 1
                    tags = move.get("tags") or []
                    labels = {tag["label"] for tag in tags}
                    if labels:
                        tagged_moves[label] += 1
                    if labels & INSULATION_TAGS:
                        insulation_moves[label] += 1
                    tag_counts[label].update(labels)
        if not sum(sum(counter.values()) for counter in tag_counts.values()):
            continue
        debate_rows.append(
            {
                "number": str(debate["number"]).zfill(2),
                "debate_id": debate["id"],
                "title": row["title"],
                "side_moves": side_moves,
                "tagged_moves": tagged_moves,
                "insulation_moves": insulation_moves,
                "tag_counts": {side: dict(counts) for side, counts in tag_counts.items()},
            }
        )

    pooled = {}
    for metric in ("tagged_moves", "insulation_moves"):
        pooled[metric] = {}
        for side in ("theist", "non_theist"):
            count = sum(row[metric][side] for row in debate_rows)
            moves = sum(row["side_moves"][side] for row in debate_rows)
            pooled[metric][side] = {"count": count, "moves": moves, "share": count / moves}
        pooled[metric]["difference_pp"] = 100 * (
            pooled[metric]["theist"]["share"]
            - pooled[metric]["non_theist"]["share"]
        )

    label_counts = {}
    for side in ("theist", "non_theist"):
        counts = Counter()
        for row in debate_rows:
            counts.update(row["tag_counts"][side])
        label_counts[side] = dict(counts.most_common())

    paired_insulation = []
    for row in debate_rows:
        paired_insulation.append(
            row["insulation_moves"]["theist"] / row["side_moves"]["theist"]
            - row["insulation_moves"]["non_theist"]
            / row["side_moves"]["non_theist"]
        )
    return (
        {
            "coverage": {
                "debates": len(debate_rows),
                "moves": sum(sum(row["side_moves"].values()) for row in debate_rows),
                "theist_moves": sum(row["side_moves"]["theist"] for row in debate_rows),
                "non_theist_moves": sum(row["side_moves"]["non_theist"] for row in debate_rows),
                "warning": "Only debates with at least one published fallacy/bias tag are included; tag coverage is not corpus-complete.",
            },
            "pooled": pooled,
            "paired_insulation": clustered_bootstrap(paired_insulation),
            "label_counts": label_counts,
            "insulation_labels": sorted(INSULATION_TAGS),
        },
        debate_rows,
    )


def find_examples(moves: list[dict], definitions: dict) -> list[dict]:
    examples = []
    for (number, move_id), annotation in definitions.items():
        move = next(
            item
            for item in moves
            if item["number"] == number and item["moveId"] == move_id
        )
        record = {
            "number": number,
            "debate": move["title"],
            "speaker": move["speaker"],
            "side_label": move["sideLabel"],
            "move_id": move_id,
            "proposition": move["proposition"],
            "source_excerpt": move.get("sourceSpan", {}).get("excerpt", ""),
            "evidence_warrant": move["dimensions"]["evidenceWarrant"],
            "asserted_force": move["calibrationFindings"]["assertedForce"],
            "warrant_fit": move["calibrationFindings"]["warrantFit"],
            "qualification": move["precisionFindings"]["qualificationExplicitness"],
            "term_stability": move["precisionFindings"]["termStability"],
            "scope_stability": move["precisionFindings"]["scopeStability"],
            "slogan_risk": flags(move)["slogan_risk"],
        }
        if isinstance(annotation, tuple):
            record["pattern"], record["diagnostic"], record["falsifiability_problem"] = annotation
        else:
            record["pattern"] = annotation
            record["diagnostic"] = "A theist-side counterexample that is well warranted, calibrated, and precisely qualified."
            record["falsifiability_problem"] = "None identified in this selected counterexample; the move states evidence, comparison, or modal limits that expose it to correction."
        examples.append(record)
    return examples


def run_analysis() -> dict:
    taxonomy = load_taxonomy()
    adapter_index = load_adapter_index()
    assert set(taxonomy).issubset(adapter_index)

    all_moves = []
    closed_moves = []
    ledger_types = Counter()
    for number in sorted(taxonomy, key=int):
        row = taxonomy[number]
        adapter, moves, ledger_type = normalize_ledger(adapter_index[number])
        ledger_types[ledger_type] += 1
        for move in moves:
            enriched = {
                **move,
                "number": number,
                "debateId": adapter["debateId"],
                "title": row["title"],
                "sideLabel": side_label(move["side"], row),
                "theistStoredAs": row["theist_side"],
                "ledgerType": ledger_type,
            }
            all_moves.append(enriched)
            if ledger_type == "closed-findings":
                closed_moves.append(enriched)

    assert len(all_moves) == 3502
    assert len(closed_moves) == 2800
    assert ledger_types == Counter({"closed-findings": 146, "final-dimensions-only": 23})

    full_evidence = {}
    for side in ("theist", "non_theist"):
        side_moves = [move for move in all_moves if move["sideLabel"] == side]
        count = sum(move["dimensions"]["evidenceWarrant"] < 70 for move in side_moves)
        full_evidence[side] = {
            "count": count,
            "moves": len(side_moves),
            "share": count / len(side_moves),
            "mean": mean([move["dimensions"]["evidenceWarrant"] for move in side_moves]),
        }

    diagnostic_metrics = {
        metric: metric_summary(closed_moves, metric)
        for metric in (
            "low_warrant",
            "material_overclaim",
            "compression_deficit",
            "missing_qualification",
            "term_instability",
            "scope_instability",
            "strong_force_low_warrant",
            "slogan_risk",
        )
    }

    paired_rows = debate_differences(closed_moves, "slogan_risk")
    paired_primary = clustered_bootstrap([row["difference"] for row in paired_rows])

    subset_checks = [
        subset_summary(closed_moves, "All closed-findings moves", lambda move: True),
        subset_summary(
            closed_moves,
            "Constructive moves",
            lambda move: move["moveKind"] == "constructive",
        ),
        subset_summary(
            closed_moves, "Replies", lambda move: move["moveKind"] == "reply"
        ),
        subset_summary(
            closed_moves,
            "Load-bearing moves",
            lambda move: move["importance"] == 3,
        ),
        subset_summary(
            closed_moves,
            "Debates with theist side stored as con",
            lambda move: move["theistStoredAs"] == "con",
        ),
        subset_summary(
            closed_moves,
            "Excluding the most frequent speaker on each side",
            lambda move: move["speaker"]
            not in {"William Lane Craig", "Matt Dillahunty"},
        ),
    ]

    speaker_rates = {}
    for side in ("theist", "non_theist"):
        by_speaker = defaultdict(list)
        for move in closed_moves:
            if move["sideLabel"] == side:
                by_speaker[move["speaker"]].append(flags(move)["slogan_risk"])
        rates = [sum(values) / len(values) for values in by_speaker.values()]
        speaker_rates[side] = {
            "speakers": len(rates),
            "equal_weight_mean": mean(rates),
            "median": statistics.median(rates),
        }

    lennox_moves = [move for move in closed_moves if move["speaker"] == "John Lennox"]
    lennox_flagged = sum(flags(move)["slogan_risk"] for move in lennox_moves)
    assert (lennox_flagged, len(lennox_moves)) == (15, 56)
    speaker_case_studies = {
        "John Lennox": {
            "flagged": lennox_flagged,
            "moves": len(lennox_moves),
            "share": lennox_flagged / len(lennox_moves),
        }
    }

    tags, tag_rows = tag_analysis(taxonomy)
    source_commit = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()

    results = {
        "snapshot": {
            "analysis_date": "2026-09-01",
            "source_commit": source_commit,
            "population": "169 corrected theist/religious versus non-theist/skeptical debate assessments",
            "primary_unit": "scored argumentative move, with whole-debate clustered sensitivity checks",
            "taxonomy": str(TAXONOMY_PATH.relative_to(REPO_ROOT)),
            "ledger_source": "docs/assessment-ledgers/*.json and their locked final-ledger evidence",
        },
        "data_quality": {
            "classified_debates": len(taxonomy),
            "scored_moves": len(all_moves),
            "theist_moves": sum(move["sideLabel"] == "theist" for move in all_moves),
            "non_theist_moves": sum(move["sideLabel"] == "non_theist" for move in all_moves),
            "closed_findings_debates": ledger_types["closed-findings"],
            "closed_findings_moves": len(closed_moves),
            "final_dimension_only_debates": ledger_types["final-dimensions-only"],
            "missing_side_labels": 0,
            "missing_closed_diagnostic_fields": 0,
        },
        "operational_definition": {
            "name": "strict slogan-risk proxy",
            "rule": "A move is flagged only when evidence/warrant is below 70, asserted force is materially or radically overstated relative to warrant, and at least one compression defect is present: unstable terms, unstable scope, or a missing/materially misleading qualification.",
            "interpretation": "The proxy identifies low-support, high-force, compressed claims. It is not a literal linguistic detector of catchphrases and does not by itself prove strict philosophical non-falsifiability.",
            "side_blind": True,
        },
        "full_corpus_evidence": full_evidence,
        "diagnostic_metrics": diagnostic_metrics,
        "paired_primary": paired_primary,
        "subset_checks": subset_checks,
        "speaker_equal_weight": speaker_rates,
        "speaker_case_studies": speaker_case_studies,
        "tag_corroboration": tags,
        "examples": {
            "theist_slogan_risk": find_examples(closed_moves, THEIST_EXAMPLES),
            "non_theist_slogan_risk": find_examples(closed_moves, NON_THEIST_EXAMPLES),
            "theist_counterexamples": find_examples(closed_moves, THEIST_COUNTEREXAMPLES),
        },
        "verdict": {
            "hypothesis": "The theist side contains more rhetorical, non-falsifiable slogans than the non-theist side.",
            "assessment": "Supported for the operationalized slogan-risk pattern; only provisionally supported for literal non-falsifiability.",
            "supported": [
                "Low-warrant, materially overstated, imprecisely qualified moves are much more common on the theist side.",
                "The difference persists within constructives, replies, load-bearing moves, speaker balancing, and after excluding each side's most frequent speaker; the small role-reversal subset remains directionally positive but is imprecise.",
                "In the 59 tag-bearing debates, fallacy/bias tags associated with epistemic insulation are also more common on the theist side.",
            ],
            "not_established": [
                "The locked rubric does not directly label literal slogans or strict Popperian non-falsifiability across the full corpus.",
                "The data do not measure whether emotional affirmation enforces theism or caused the observed argumentative pattern.",
                "The result does not imply that all theist moves are slogan-like or that non-theists never use the same devices.",
            ],
        },
        "validation": {
            "overall_assessment": "Share with caveats",
            "required_caveats": [
                "The corpus is curated rather than randomly sampled.",
                "Speakers repeat and moves are nested within debates; pooled move rates are descriptive rather than independent trials.",
                "The strict proxy is constructed from AI-assisted rubric judgments and should be replicated with blinded human coding.",
                "Closed precision and calibration fields cover 146 of 169 debates; full-corpus evidence scores cover all 169.",
                "Published fallacy/bias tags appear in 59 relevant debates and are secondary evidence only.",
                "The side label describes the position argued in a scorecard, not private belief, sincerity, or character.",
            ],
            "recommended_falsification_test": "Blind trained coders to side and speaker, give them the original transcript span, and ask separately whether the move is formulaic or slogan-like, whether it states a possible disconfirmation condition, whether contrary outcomes can be absorbed without revision, and whether its force exceeds its public warrant. The hypothesis weakens if the side difference disappears after topic, role, speaker, and debate controls.",
        },
    }

    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    with (ANALYSIS_DIR / "results.json").open("w", encoding="utf-8") as handle:
        json.dump(results, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    with (ANALYSIS_DIR / "debate-rates.csv").open(
        "w", encoding="utf-8", newline=""
    ) as handle:
        fields = list(paired_rows[0])
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        writer.writerows(paired_rows)

    with (ANALYSIS_DIR / "move-diagnostics.csv").open(
        "w", encoding="utf-8", newline=""
    ) as handle:
        fields = [
            "number",
            "debate_id",
            "title",
            "side_label",
            "side",
            "speaker",
            "move_id",
            "move_kind",
            "importance",
            "evidence_warrant",
            "asserted_force",
            "warrant_fit",
            "term_stability",
            "scope_stability",
            "qualification",
            "low_warrant",
            "material_overclaim",
            "compression_deficit",
            "slogan_risk",
            "proposition",
        ]
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        for move in closed_moves:
            move_flags = flags(move)
            writer.writerow(
                {
                    "number": move["number"],
                    "debate_id": move["debateId"],
                    "title": move["title"],
                    "side_label": move["sideLabel"],
                    "side": move["side"],
                    "speaker": move["speaker"],
                    "move_id": move["moveId"],
                    "move_kind": move["moveKind"],
                    "importance": move["importance"],
                    "evidence_warrant": move["dimensions"]["evidenceWarrant"],
                    "asserted_force": move["calibrationFindings"]["assertedForce"],
                    "warrant_fit": move["calibrationFindings"]["warrantFit"],
                    "term_stability": move["precisionFindings"]["termStability"],
                    "scope_stability": move["precisionFindings"]["scopeStability"],
                    "qualification": move["precisionFindings"]["qualificationExplicitness"],
                    **{key: move_flags[key] for key in ("low_warrant", "material_overclaim", "compression_deficit", "slogan_risk")},
                    "proposition": move["proposition"],
                }
            )

    with (ANALYSIS_DIR / "tag-diagnostics.csv").open(
        "w", encoding="utf-8", newline=""
    ) as handle:
        fields = [
            "number",
            "debate_id",
            "title",
            "theist_moves",
            "non_theist_moves",
            "theist_tagged_moves",
            "non_theist_tagged_moves",
            "theist_insulation_moves",
            "non_theist_insulation_moves",
        ]
        writer = csv.DictWriter(handle, fieldnames=fields, lineterminator="\n")
        writer.writeheader()
        for row in tag_rows:
            writer.writerow(
                {
                    "number": row["number"],
                    "debate_id": row["debate_id"],
                    "title": row["title"],
                    "theist_moves": row["side_moves"]["theist"],
                    "non_theist_moves": row["side_moves"]["non_theist"],
                    "theist_tagged_moves": row["tagged_moves"]["theist"],
                    "non_theist_tagged_moves": row["tagged_moves"]["non_theist"],
                    "theist_insulation_moves": row["insulation_moves"]["theist"],
                    "non_theist_insulation_moves": row["insulation_moves"]["non_theist"],
                }
            )

    print(json.dumps(results["diagnostic_metrics"]["slogan_risk"], indent=2))
    print(json.dumps(results["paired_primary"], indent=2))
    print(json.dumps(results["tag_corroboration"]["pooled"], indent=2))
    return results


if __name__ == "__main__":
    run_analysis()
