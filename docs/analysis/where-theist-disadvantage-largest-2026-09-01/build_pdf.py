#!/usr/bin/env python3
"""Build the publication PDF for the SLUGFESTER disadvantage-location study."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path

from reportlab.graphics.shapes import Circle, Drawing, Line, Rect, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
ANALYSIS_DIR = Path(__file__).resolve().parent
RESULTS_PATH = ANALYSIS_DIR / "results.json"
OUTPUT_PATH = REPO_ROOT / "output/pdf/where-is-the-theist-disadvantage-largest.pdf"
BASE_PATH = REPO_ROOT / "docs/analysis/assessment-generation-comparability-2026-09-01/build_pdf.py"

spec = importlib.util.spec_from_file_location("slugfester_report_base", BASE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load report base: {BASE_PATH}")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

PAGE_W, PAGE_H = letter
LEFT = base.LEFT
RIGHT = base.RIGHT
TOP = base.TOP
BOTTOM = base.BOTTOM
CONTENT_W = base.CONTENT_W

NAVY = base.NAVY
BLUE = base.BLUE
BLUE_DARK = base.BLUE_DARK
BLUE_LIGHT = base.BLUE_LIGHT
TEAL = base.TEAL
TEAL_LIGHT = base.TEAL_LIGHT
GOLD = base.GOLD
GOLD_LIGHT = base.GOLD_LIGHT
RUST = base.RUST
RUST_LIGHT = base.RUST_LIGHT
INK = base.INK
MUTED = base.MUTED
RULE = base.RULE
PAPER = base.PAPER
WHITE = base.WHITE

SectionRule = base.SectionRule
callout = base.callout
metric_strip = base.metric_strip
data_table = base.data_table
bullet = base.bullet


SHORT_TOPICS = {
    "Religion, culture & meaning": "Religion / culture / meaning",
    "Scripture, revelation & doctrine": "Scripture / revelation / doctrine",
    "Mind, reason & logic": "Mind / reason / logic",
    "Evil, suffering & hiddenness": "Evil / suffering / hiddenness",
    "Morality & ethics": "Morality / ethics",
    "Cosmology, science & design": "Cosmology / science / design",
    "General theism / naturalism": "General theism / naturalism",
    "Resurrection": "Resurrection",
}

DIMENSION_KEYS = [
    ("logicalCoherence_contribution", "Logic"),
    ("evidenceWarrant_contribution", "Evidence"),
    ("responsiveness_contribution", "Response"),
    ("relevanceBurden_contribution", "Burden"),
    ("precisionClarity_contribution", "Precision"),
    ("calibrationCharity_contribution", "Calibration"),
]


def chart_header(drawing: Drawing, title: str, subtitle: str, width: float) -> None:
    drawing.add(String(0, drawing.height - 14, title, fontName="SLUGSans-Bold", fontSize=10.5, fillColor=NAVY))
    drawing.add(String(0, drawing.height - 28, subtitle, fontName="SLUGSans", fontSize=7.4, fillColor=MUTED))
    drawing.add(Line(0, drawing.height - 34, width, drawing.height - 34, strokeColor=RULE, strokeWidth=0.7))


def topic_forest_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 385
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Non-theist score advantage by primary debate topic",
        "Mean within-debate margin and debate-level bootstrap 95% interval; positive values favor the non-theist",
        width,
    )
    left, right, bottom, top = 164, 34, 35, height - 48
    chart_w = width - left - right
    x_min, x_max = 0, 13
    for tick in range(0, 14, 2):
        x = left + chart_w * (tick - x_min) / (x_max - x_min)
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 14, str(tick), textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    step = (top - bottom) / len(rows)
    for index, row in enumerate(rows):
        y = top - step * (index + 0.5)
        mean_value = row["mean"]
        low, high = row["ci_95"]
        x_mean = left + chart_w * mean_value / x_max
        x_low = left + chart_w * max(x_min, low) / x_max
        x_high = left + chart_w * min(x_max, high) / x_max
        fill = RUST if index == 0 else BLUE if index < 4 else TEAL
        drawing.add(String(left - 10, y - 3, SHORT_TOPICS[row["topic"]], textAnchor="end", fontName="SLUGSans", fontSize=7.1, fillColor=INK))
        drawing.add(Line(x_low, y, x_high, y, strokeColor=fill, strokeWidth=2.1))
        drawing.add(Line(x_low, y - 4, x_low, y + 4, strokeColor=fill, strokeWidth=1.1))
        drawing.add(Line(x_high, y - 4, x_high, y + 4, strokeColor=fill, strokeWidth=1.1))
        drawing.add(Circle(x_mean, y, 5, fillColor=fill, strokeColor=NAVY, strokeWidth=0.5))
        drawing.add(String(x_high + 6, y - 3, f"{mean_value:.2f}  n={row['n']}", fontName="SLUGSans-Bold", fontSize=6.8, fillColor=INK))
    drawing.add(String(left + chart_w / 2, 7, "score points", textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    return drawing


def outcome_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 330
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Result direction inside each topic",
        "Share of debates in which the non-theist scored higher, tied, or scored lower",
        width,
    )
    left, right, bottom, top = 165, 36, 44, height - 50
    chart_w = width - left - right
    step = (top - bottom) / len(rows)
    for index, row in enumerate(rows):
        y = top - step * (index + 0.5)
        total = row["n"]
        parts = [
            (row["non_theist_higher"], BLUE),
            (row["ties"], GOLD),
            (row["theist_higher"], RUST),
        ]
        x = left
        drawing.add(String(left - 10, y - 3, SHORT_TOPICS[row["topic"]], textAnchor="end", fontName="SLUGSans", fontSize=7.1, fillColor=INK))
        for count, fill in parts:
            part_w = chart_w * count / total
            if part_w > 0:
                drawing.add(Rect(x, y - 7, part_w, 14, fillColor=fill, strokeColor=WHITE, strokeWidth=0.6))
                if part_w >= 21:
                    drawing.add(String(x + part_w / 2, y - 2.4, str(count), textAnchor="middle", fontName="SLUGSans-Bold", fontSize=6.8, fillColor=WHITE if fill != GOLD else INK))
            x += part_w
        drawing.add(String(left + chart_w + 6, y - 3, f"{row['non_theist_higher']}/{total}", fontName="SLUGSans-Bold", fontSize=6.8, fillColor=INK))
    legend_y = 15
    legend = [(BLUE, "non-theist higher"), (GOLD, "tie"), (RUST, "theist higher")]
    x = left
    for fill, label in legend:
        drawing.add(Rect(x, legend_y, 10, 8, fillColor=fill, strokeColor=fill))
        drawing.add(String(x + 14, legend_y + 1, label, fontName="SLUGSans", fontSize=6.8, fillColor=INK))
        x += 105
    return drawing


def orientation_chart(results: dict) -> Drawing:
    width, height = CONTENT_W, 270
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "The disadvantage is larger when the theist holds the affirmative side",
        "Mean within-debate score advantage with bootstrap intervals; PRO/CON are formal debate orientations",
        width,
    )
    rows = [
        ("All relevant debates", results["overall"]),
        ("Theist is PRO", results["orientation"]["theist_pro"]),
        ("Theist is CON", results["orientation"]["theist_con"]),
    ]
    left, right, bottom, top = 128, 34, 46, height - 54
    chart_w = width - left - right
    x_max = 10
    for tick in range(0, 11, 2):
        x = left + chart_w * tick / x_max
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 14, str(tick), textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    step = (top - bottom) / len(rows)
    fills = [TEAL, RUST, BLUE]
    for index, ((label, row), fill) in enumerate(zip(rows, fills)):
        y = top - step * (index + 0.5)
        value = row["mean"]
        low, high = row["ci_95"]
        x1 = left + chart_w * max(0, low) / x_max
        x2 = left + chart_w * min(x_max, high) / x_max
        xm = left + chart_w * value / x_max
        drawing.add(String(left - 10, y - 3, label, textAnchor="end", fontName="SLUGSans-Bold", fontSize=7.7, fillColor=INK))
        drawing.add(Line(x1, y, x2, y, strokeColor=fill, strokeWidth=2.2))
        drawing.add(Circle(xm, y, 5.5, fillColor=fill, strokeColor=NAVY, strokeWidth=0.55))
        drawing.add(String(x2 + 7, y - 3, f"{value:.2f}  n={row['n']}", fontName="SLUGSans-Bold", fontSize=7.2, fillColor=INK))
    diff = results["orientation"]["pro_minus_con"]
    drawing.add(String(width - 2, 12, f"PRO minus CON: +{diff['estimate']:.2f} points (95% CI {diff['ci_95'][0]:.2f} to {diff['ci_95'][1]:.2f})", textAnchor="end", fontName="SLUGSans-Bold", fontSize=7.6, fillColor=RUST))
    return drawing


def heat_color(value: float, minimum: float, maximum: float):
    ratio = 0 if maximum == minimum else max(0, min(1, (value - minimum) / (maximum - minimum)))
    low = (0.88, 0.94, 0.97)
    high = (0.72, 0.20, 0.16)
    return colors.Color(*(low[i] + (high[i] - low[i]) * ratio for i in range(3)))


def robustness_heatmap(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 385
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Topic pattern under four descriptive checks",
        "Cell: mean non-theist advantage (n); darker cells indicate larger margins",
        width,
    )
    columns = [
        ("All", None),
        ("Theist PRO", "theist_pro_only"),
        ("Excl. top 4", "exclude_top_four_non_theists"),
        ("Earlier only", "earlier_generation_only"),
    ]
    left, top = 167, height - 72
    col_w = (width - left - 10) / len(columns)
    row_h = 33
    for j, (label, _) in enumerate(columns):
        x = left + j * col_w
        drawing.add(String(x + col_w / 2, top + 14, label, textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7.1, fillColor=INK))
    for i, row in enumerate(rows):
        y = top - (i + 1) * row_h
        drawing.add(String(left - 9, y + 10, SHORT_TOPICS[row["topic"]], textAnchor="end", fontName="SLUGSans", fontSize=7.0, fillColor=INK))
        for j, (_, key) in enumerate(columns):
            item = {"mean": row["mean"], "n": row["n"]} if key is None else row[key]
            value = item["mean"]
            x = left + j * col_w
            drawing.add(Rect(x + 1, y, col_w - 2, row_h - 2, fillColor=heat_color(value, 0, 10), strokeColor=WHITE, strokeWidth=0.7))
            text_color = WHITE if value >= 7.4 else INK
            drawing.add(String(x + col_w / 2, y + 13, f"{value:.2f}", textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7.3, fillColor=text_color))
            drawing.add(String(x + col_w / 2, y + 4, f"n={item['n']}", textAnchor="middle", fontName="SLUGSans", fontSize=5.8, fillColor=text_color))
    drawing.add(String(width - 2, 11, "Top-four exclusion removes Dillahunty, O'Connor, Hitchens, and Oppy", textAnchor="end", fontName="SLUGSans", fontSize=6.5, fillColor=MUTED))
    return drawing


def generation_sensitivity_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 350
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Topic means before and after the assessment-generation boundary",
        "Later-generation cells are sparse (one to seven debates per topic); use them as sensitivity checks, not stable estimates",
        width,
    )
    left, right, bottom, top = 165, 40, 46, height - 54
    chart_w = width - left - right
    x_min, x_max = 0, 14
    for tick in range(0, 15, 2):
        x = left + chart_w * tick / x_max
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 13, str(tick), textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    step = (top - bottom) / len(rows)
    for index, row in enumerate(rows):
        y = top - step * (index + 0.5)
        early = row["earlier_generation_only"]
        later = row["later_generation_only"]
        x1 = left + chart_w * early["mean"] / x_max
        x2 = left + chart_w * later["mean"] / x_max
        drawing.add(String(left - 10, y - 3, SHORT_TOPICS[row["topic"]], textAnchor="end", fontName="SLUGSans", fontSize=7.0, fillColor=INK))
        drawing.add(Line(x1, y, x2, y, strokeColor=MUTED, strokeWidth=1.1))
        drawing.add(Circle(x1, y, 4.7, fillColor=BLUE, strokeColor=NAVY, strokeWidth=0.5))
        drawing.add(Circle(x2, y, 4.7, fillColor=GOLD, strokeColor=NAVY, strokeWidth=0.5))
        drawing.add(String(x1 - 6, y + 7, f"{early['mean']:.1f}", textAnchor="end", fontName="SLUGSans-Bold", fontSize=6.1, fillColor=BLUE_DARK))
        drawing.add(String(x2 + 6, y - 11, f"{later['mean']:.1f} n={later['n']}", fontName="SLUGSans-Bold", fontSize=6.1, fillColor=colors.HexColor("#8A6210")))
    drawing.add(Circle(width - 154, 17, 4, fillColor=BLUE, strokeColor=NAVY))
    drawing.add(String(width - 144, 14, "Earlier", fontName="SLUGSans", fontSize=7, fillColor=INK))
    drawing.add(Circle(width - 83, 17, 4, fillColor=GOLD, strokeColor=NAVY))
    drawing.add(String(width - 73, 14, "Later", fontName="SLUGSans", fontSize=7, fillColor=INK))
    return drawing


def speaker_chart(rows: list[dict]) -> Drawing:
    rows = rows[:10]
    width, height = CONTENT_W, 390
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Frequent non-theist speakers: mean debate margin",
        "Speakers with at least four relevant debates; selection and opponent mix are not controlled",
        width,
    )
    left, right, bottom, top = 115, 44, 43, height - 51
    chart_w = width - left - right
    x_max = 13
    for tick in range(0, 14, 2):
        x = left + chart_w * tick / x_max
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(String(x, bottom - 13, str(tick), textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    step = (top - bottom) / len(rows)
    for index, row in enumerate(rows):
        y = top - step * (index + 0.5)
        value = row["mean_margin"]
        end = left + chart_w * value / x_max
        fill = RUST if row["speaker"] in {"Matt Dillahunty", "Alex O'Connor"} else TEAL
        drawing.add(String(left - 9, y - 3, row["speaker"], textAnchor="end", fontName="SLUGSans", fontSize=7.4, fillColor=INK))
        drawing.add(Rect(left, y - 6, max(1, end - left), 12, fillColor=fill, strokeColor=fill))
        drawing.add(String(end + 6, y - 3, f"{value:.2f}  n={row['n']}", fontName="SLUGSans-Bold", fontSize=6.8, fillColor=INK))
    drawing.add(String(left + chart_w / 2, 8, "mean non-theist score advantage", textAnchor="middle", fontName="SLUGSans", fontSize=7, fillColor=MUTED))
    return drawing


def dimension_heatmap(rows: list[dict]) -> Drawing:
    ordered = sorted(rows, key=lambda row: sum(row[key] for key, _ in DIMENSION_KEYS), reverse=True)
    width, height = CONTENT_W, 385
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "How each scoring dimension contributes to the topic-level margin",
        "Mean weighted score-point contribution; darker cells contribute more to the non-theist advantage",
        width,
    )
    left, top = 164, height - 73
    col_w = (width - left - 8) / len(DIMENSION_KEYS)
    row_h = 33
    for j, (_, label) in enumerate(DIMENSION_KEYS):
        x = left + j * col_w
        drawing.add(String(x + col_w / 2, top + 14, label, textAnchor="middle", fontName="SLUGSans-Bold", fontSize=6.3, fillColor=INK))
    for i, row in enumerate(ordered):
        y = top - (i + 1) * row_h
        drawing.add(String(left - 9, y + 10, SHORT_TOPICS[row["topic"]], textAnchor="end", fontName="SLUGSans", fontSize=7.0, fillColor=INK))
        for j, (key, _) in enumerate(DIMENSION_KEYS):
            value = row[key]
            x = left + j * col_w
            drawing.add(Rect(x + 1, y, col_w - 2, row_h - 2, fillColor=heat_color(value, 0, 2.5), strokeColor=WHITE, strokeWidth=0.7))
            text_color = WHITE if value >= 1.6 else INK
            drawing.add(String(x + col_w / 2, y + 9, f"{value:.2f}", textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7.1, fillColor=text_color))
    return drawing


def move_subset_heatmap(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 300
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "The move-level gap is widest on load-bearing claims",
        "Raw dimension-point differences between non-theist and theist moves; positive values favor the non-theist",
        width,
    )
    columns = [
        ("evidence_warrant_gap", "Evidence"),
        ("logical_coherence_gap", "Logic"),
        ("responsiveness_gap", "Response"),
        ("calibration_charity_gap", "Calibration"),
    ]
    left, top = 145, height - 78
    col_w = (width - left - 10) / len(columns)
    row_h = 43
    labels = {
        "All scored moves": "All moves",
        "Constructive moves only": "Constructive moves",
        "Replies only": "Replies",
        "Load-bearing moves only": "Load-bearing moves",
    }
    for j, (_, label) in enumerate(columns):
        x = left + j * col_w
        drawing.add(String(x + col_w / 2, top + 15, label, textAnchor="middle", fontName="SLUGSans-Bold", fontSize=7.2, fillColor=INK))
    for i, row in enumerate(rows):
        y = top - (i + 1) * row_h
        drawing.add(String(left - 10, y + 14, labels[row["subset"]], textAnchor="end", fontName="SLUGSans-Bold", fontSize=7.4, fillColor=INK))
        for j, (key, _) in enumerate(columns):
            value = row[key]
            x = left + j * col_w
            drawing.add(Rect(x + 1, y, col_w - 2, row_h - 2, fillColor=heat_color(value, 2, 9.5), strokeColor=WHITE, strokeWidth=0.7))
            text_color = WHITE if value >= 6.3 else INK
            drawing.add(String(x + col_w / 2, y + 13, f"{value:.2f}", textAnchor="middle", fontName="SLUGSans-Bold", fontSize=8, fillColor=text_color))
    return drawing


def first_page(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 0.18 * inch, PAGE_W, 0.18 * inch, fill=1, stroke=0)
    canvas.setFillColor(RUST)
    canvas.rect(0, 0, PAGE_W, 0.12 * inch, fill=1, stroke=0)
    canvas.restoreState()


def later_page(canvas, doc) -> None:
    canvas.saveState()
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.55)
    canvas.line(LEFT, PAGE_H - 0.43 * inch, PAGE_W - RIGHT, PAGE_H - 0.43 * inch)
    canvas.setFillColor(MUTED)
    canvas.setFont("SLUGSans-Bold", 6.8)
    canvas.drawString(LEFT, PAGE_H - 0.33 * inch, "SLUGFESTER CORPUS-LEVEL ANALYSIS")
    canvas.setFont("SLUGSans", 6.8)
    canvas.drawRightString(PAGE_W - RIGHT, PAGE_H - 0.33 * inch, "WHERE IS THE THEIST DISADVANTAGE LARGEST?")
    canvas.line(LEFT, 0.40 * inch, PAGE_W - RIGHT, 0.40 * inch)
    canvas.drawString(LEFT, 0.25 * inch, "September 1, 2026")
    canvas.drawRightString(PAGE_W - RIGHT, 0.25 * inch, str(doc.page))
    canvas.restoreState()


def build_story(results: dict, styles: dict) -> list:
    topics = results["topic_summary"]
    overall = results["overall"]
    contrast = results["contrasts"]["highest_vs_lowest"]
    permutation = results["topic_range_permutation"]
    story = []

    # 1. Cover
    story.extend([
        Spacer(1, 0.34 * inch),
        Paragraph("CORPUS-LEVEL DIAGNOSTIC PAPER", styles["cover_kicker"]),
        Paragraph("Where Is the Theist Disadvantage Largest?", styles["cover_title"]),
        Paragraph(
            "A topic-, burden-, speaker-, and rubric-level map across 169 theist/non-theist debate assessments",
            styles["cover_subtitle"],
        ),
        Paragraph(
            "REPORT DATE  ·  SEPTEMBER 1, 2026 &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; "
            "PUBLIC CORPUS  ·  228 ASSESSMENTS &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; "
            "RELEVANT DYADS  ·  169 DEBATES / 3,502 SCORED MOVES",
            styles["cover_meta"],
        ),
        SectionRule(color=RUST),
        Spacer(1, 8),
        Paragraph(
            "<b>Answer.</b> The largest observed theist disadvantage occurs in debates centered on religion's cultural, existential, or meaning-conferring value: the non-theist leads by 8.65 points on average and scores higher in 19 of 20 debates. Scripture/revelation/doctrine (7.84), mind/reason/logic (7.22), and evil/suffering/hiddenness (7.06) form a second high-gap cluster. Resurrection debates show the smallest mean difference, 3.69 points.",
            styles["cover_abstract"],
        ),
        Paragraph(
            "The gap is also substantially larger when the theist carries the affirmative burden: 6.78 points when the theist is PRO, versus 3.15 when the theist is CON. At the move level, the widest evidential difference appears among load-bearing claims, where the evidence-and-warrant gap reaches 9.25 dimension points. Logical coherence and evidence/warrant supply the largest score contributions in nearly every high-gap topic.",
            styles["cover_abstract"],
        ),
        Paragraph(
            "This is a <b>descriptive concentration map</b>, not a causal experiment. Topic, speaker, opponent, burden orientation, source quality, and assessment generation overlap. A global random-label test does not establish topic-wide heterogeneity at conventional levels (exploratory p = 0.19). The responsible conclusion is that some settings repeatedly expose the same substantiation problem—not that a topic label by itself causes a weaker performance.",
            styles["cover_abstract"],
        ),
        Spacer(1, 7),
        callout(
            "Central finding",
            "The disadvantage peaks when a theist must turn an existential, cultural, revelatory, or transcendental justification into a publicly checkable argument under an affirmative burden. The scoring record locates the weakness primarily in <b>logical coherence, evidence and warrant, responsiveness, and calibration</b>—especially in the claims carrying the most argumentative weight.",
            styles,
            fill=RUST_LIGHT,
            accent=RUST,
        ),
        Spacer(1, 9),
        Paragraph(
            "<i>Scores are AI-generated estimates of argumentative performance under a common published rubric. They remain revisable and should not be treated as final verdicts on speakers, topics, or worldviews.</i>",
            styles["caption"],
        ),
        PageBreak(),
    ])

    # 2. Executive summary
    story.extend([
        Paragraph("Executive summary", styles["h1"]),
        Paragraph(
            "The corpus-wide average—a 6.35-point non-theist advantage—conceals meaningful variation. This paper asks where that difference becomes largest and whether the pattern survives obvious alternative explanations. It divides the 169 relevant debates into eight mutually exclusive primary-topic groups, then examines debate orientation, repeated speakers, assessment generation, rubric dimensions, and move importance.",
            styles["body"],
        ),
        metric_strip([
            ("8.65", "largest observed topic mean: religion / culture / meaning"),
            ("6.78 vs 3.15", "mean gap when theist is PRO versus CON"),
            ("9.25", "evidence-and-warrant gap on load-bearing moves"),
        ], styles),
        Spacer(1, 10),
        Paragraph("What is strongest in the evidence", styles["h2"]),
        bullet("Religion/culture/meaning is the highest observed topic mean and is directionally consistent: 19 non-theist advantages, one tie, and no theist advantage.", styles),
        bullet("Its 8.65-point mean remains 8.67 after excluding the four most frequent non-theist speakers, and 9.25 within theist-PRO debates.", styles),
        bullet("The affirmative-burden contrast is sizable: theist-PRO debates exceed theist-CON debates by 3.63 points, with a bootstrap interval of 0.90 to 6.58.", styles),
        bullet("Across high-gap topics, logic and evidence are the two largest recurring contributors, followed by responsiveness and calibration/charity.", styles),
        Paragraph("What must remain qualified", styles["h2"]),
        bullet("The topic taxonomy was developed after the debates existed; it was not preregistered. The intervals are uncertainty summaries, not protection against every post-hoc selection effect.", styles),
        bullet("Speaker and topic are partly entangled. Dillahunty and O'Connor appear often and have large average margins, but removing the four most frequent non-theists does not erase the highest category.", styles),
        bullet("Later-generation topic cells contain only one to seven debates. They are useful as stress tests but too sparse for confident topic-by-generation comparisons.", styles),
        callout(
            "Bottom line",
            "The data defend a focused claim: the theist disadvantage is most pronounced under affirmative, public-facing burdens that require private, revelatory, existential, or culturally resonant reasons to do evidential work. The corpus does not show that all theists, all topics, or all faith-based claims are uniformly weak.",
            styles,
        ),
        PageBreak(),
    ])

    # 3. Question and definitions
    story.extend([
        Paragraph("What does “where” mean?", styles["h1"]),
        Paragraph(
            "A score difference can concentrate in several places at once. A topic can pose a difficult burden; a debate orientation can require one side to defend more; a few speakers can dominate a category; one production generation can score more strictly; or particular rubric dimensions can generate most of the margin. This report treats “where” as a six-part diagnostic question rather than as a search for one magic variable.",
            styles["body"],
        ),
        data_table(
            ["Level", "Question", "Evidence used"],
            [
                ["Topic", "Which primary subject has the largest mean margin?", "169 paired debate margins in eight groups"],
                ["Direction", "How consistently does one side score higher?", "Win / tie / loss counts inside each topic"],
                ["Burden", "Does the gap change when the theist is PRO or CON?", "Published side orientation"],
                ["Speaker", "Could repeated speakers create the apparent topic result?", "Frequency tables and top-four exclusion"],
                ["Generation", "Does the pattern depend on the later scoring generation?", "Assessment-number split at 195 / 196"],
                ["Rubric / move", "Which dimensions and claim types supply the gap?", "3,502 locked scored moves and score decomposition"],
            ],
            [75, 205, CONTENT_W - 280],
            styles,
            first_bold=True,
        ),
        Spacer(1, 10),
        Paragraph("The outcome is a paired margin", styles["h2"]),
        Paragraph(
            "For every debate, the outcome is the published non-theist score minus the published theist score. A positive number means the non-theist scored higher; a negative number means the theist scored higher. Pairing matters because both sides in one debate share the same topic, source, format, and assessment generation. The analysis therefore asks how the <i>within-debate difference</i> changes across settings.",
            styles["body"],
        ),
        Paragraph("A primary-topic map is deliberately coarse", styles["h2"]),
        Paragraph(
            "Debates routinely cross boundaries: a morality debate may invoke scripture; a science debate may turn on epistemology; a general God-existence debate may include evil. Each debate is assigned only to the topic that best captures its stated central burden. This makes the groups mutually exclusive and auditable, but it also compresses multi-topic content. The report therefore treats the ranking as a useful map, not a natural law.",
            styles["body"],
        ),
        callout(
            "Interpretive rule",
            "A large topic mean identifies a setting in which the margin is concentrated. It does not show that the topic itself caused the margin. Cause would require a design that separates topic from speaker, opponent, burden orientation, debate format, and assessment generation.",
            styles,
            fill=GOLD_LIGHT,
            accent=GOLD,
        ),
        PageBreak(),
    ])

    # 4. Scope and topic taxonomy
    story.extend([
        Paragraph("Scope: 169 relevant debates inside a 228-assessment corpus", styles["h1"]),
        Paragraph(
            "The public snapshot contains 228 assessments. The relevant set consists of 169 dyadic debates in which one side was classified as theist and the other as non-theist under the corrected side taxonomy used in the earlier corpus-wide report. The paired analysis excludes debates without that contrast, panels that cannot be reduced cleanly to two sides, and topics outside the religious-worldview comparison.",
            styles["body"],
        ),
        data_table(
            ["Primary topic", "Debates", "Classification focus"],
            [
                ["Religion, culture & meaning", "20", "Social value, identity, meaning, practical effects"],
                ["Scripture, revelation & doctrine", "19", "Revelation, doctrine, scripture, faith's epistemic standing"],
                ["Mind, reason & logic", "18", "Consciousness, free will, rationality, logic, intelligibility"],
                ["Evil, suffering & hiddenness", "17", "Suffering, hiddenness, divine goodness"],
                ["Morality & ethics", "20", "Moral facts, grounding, authority, ethical implications"],
                ["Cosmology, science & design", "23", "Origins, fine-tuning, science, complexity, design"],
                ["General theism / naturalism", "36", "Broad worldview comparison without a narrower dominant burden"],
                ["Resurrection", "16", "Historicity and explanatory adequacy of resurrection claims"],
            ],
            [185, 55, CONTENT_W - 240],
            styles,
            first_bold=True,
        ),
        Spacer(1, 10),
        Paragraph("Why eight groups?", styles["h2"]),
        Paragraph(
            "The groups are broad enough to keep every cell between 16 and 36 debates, yet specific enough to distinguish markedly different argumentative burdens. Finer categories would be more intuitive in places but would produce unstable cells dominated by one or two speakers. Coarser categories would bury the difference between historical resurrection arguments, public-cultural defenses of religion, and abstract natural-theology arguments.",
            styles["body"],
        ),
        callout(
            "Audit trail",
            "The accompanying <b>topic-taxonomy.csv</b> lists every included assessment, its assigned category, scores, speakers, orientation, generation, and the general classification rationale. This allows disputed assignments to be changed and the analysis rerun.",
            styles,
            fill=TEAL_LIGHT,
            accent=TEAL,
        ),
        PageBreak(),
    ])

    # 5. Primary topic figure
    story.extend([
        Paragraph("The largest observed gap is in religion, culture, and meaning", styles["h1"]),
        Paragraph(
            f"The highest observed topic mean is {topics[0]['mean']:.2f} points for religion/culture/meaning debates. Scripture/revelation/doctrine follows at {topics[1]['mean']:.2f}; mind/reason/logic at {topics[2]['mean']:.2f}; and evil/suffering/hiddenness at {topics[3]['mean']:.2f}. Resurrection debates have the smallest mean, {topics[-1]['mean']:.2f} points.",
            styles["body"],
        ),
        topic_forest_chart(topics),
        Paragraph(
            "Figure 1. Each dot is the mean within-debate score margin; whiskers are 20,000-draw debate-level bootstrap intervals. Intervals overlap substantially across the middle categories. The figure ranks observed means; it does not establish a precise causal ordering.",
            styles["caption"],
        ),
        callout(
            "A useful contrast",
            f"The highest-minus-lowest observed difference is {contrast['estimate']:.2f} points. Its descriptive bootstrap interval is {contrast['ci_95'][0]:.2f} to {contrast['ci_95'][1]:.2f}. Because the highest and lowest categories were identified from the same data, this interval should not be read as a preregistered confirmatory test.",
            styles,
        ),
        PageBreak(),
    ])

    # 6. Reading the hierarchy
    story.extend([
        Paragraph("What the topic hierarchy does—and does not—show", styles["h1"]),
        data_table(
            ["Topic", "n", "Mean gap", "95% interval", "N higher / tie / T higher"],
            [
                [SHORT_TOPICS[row["topic"]], str(row["n"]), f"{row['mean']:.2f}", f"{row['ci_95'][0]:.2f} to {row['ci_95'][1]:.2f}", f"{row['non_theist_higher']} / {row['ties']} / {row['theist_higher']}"]
                for row in topics
            ],
            [178, 28, 60, 92, CONTENT_W - 358],
            styles,
            first_bold=True,
        ),
        Spacer(1, 10),
        Paragraph("A top cluster, not eight sharply separated tiers", styles["h2"]),
        Paragraph(
            "The first four means range from 7.06 to 8.65, and their uncertainty intervals overlap. The evidence therefore supports a broad high-gap cluster more securely than it supports exact claims such as “scripture is definitively second” or “mind is definitively above evil.” The clearest separation is between the top religion/culture/meaning category and the low resurrection category.",
            styles["body"],
        ),
        Paragraph("The global heterogeneity test is not conventionally significant", styles["h2"]),
        Paragraph(
            f"When the 169 observed margins are randomly reassigned to groups of the same sizes, a max-minus-min range at least as large as the observed {permutation['observed_range']:.2f} occurs in {permutation['permutation_p']:.1%} of 20,000 permutations. That exploratory p-value of {permutation['permutation_p']:.2f} does not support a strong global claim that topic labels explain the corpus-wide variation. This result is compatible with a real difference that the current sample is underpowered to resolve, with speaker/burden confounding, or with an observed ranking partly produced by sampling variation.",
            styles["body"],
        ),
        callout(
            "Why the paper still has a finding",
            "The purpose is diagnostic, not merely binary hypothesis testing. The 19-of-20 directional result, the high mean, and survival under burden and speaker checks make religion/culture/meaning a report-worthy concentration. The non-significant global test prevents overstatement: it does not erase the pattern, but it limits claims that every topic differs reliably from every other.",
            styles,
            fill=GOLD_LIGHT,
            accent=GOLD,
        ),
        PageBreak(),
    ])

    # 7. Directional consistency
    story.extend([
        Paragraph("The highest categories are also directionally consistent", styles["h1"]),
        Paragraph(
            "A large mean can be driven by a few extreme debates. Direction counts answer a different question: how often is the sign of the difference the same? Religion/culture/meaning is unusually consistent, with the non-theist higher in 19 of 20 debates and one tie. Evil/suffering/hiddenness has 16 non-theist advantages in 17 debates. Scripture/revelation/doctrine has 17 in 19.",
            styles["body"],
        ),
        outcome_chart(topics),
        Paragraph(
            "Figure 2. Counts are printed inside sufficiently wide segments; the right edge reports non-theist-higher debates over total debates. “Higher” refers to the published score, not an independent truth judgment.",
            styles["caption"],
        ),
        Paragraph(
            "Resurrection remains less one-sided but is not balanced: the non-theist is higher in 12 of 16, with one tie and three theist advantages. In other words, the smallest category mean still favors the non-theist. The topic pattern changes the size of the corpus-wide disadvantage more than it changes its overall direction.",
            styles["body"],
        ),
        callout(
            "Substantive reading",
            "The cultural/meaning category is not high because of one catastrophic loss. Its distinguishing feature is repetition: nearly every debate produces a non-theist advantage, and several produce double-digit margins.",
            styles,
            fill=TEAL_LIGHT,
            accent=TEAL,
        ),
        PageBreak(),
    ])

    # 8. Burden orientation
    story.extend([
        Paragraph("Affirmative burden is a major part of “where”", styles["h1"]),
        Paragraph(
            "In 149 of the 169 debates, the theist is stored as PRO—the side formally advancing the motion. Those debates show a 6.78-point mean disadvantage. The 20 theist-CON debates show a 3.15-point disadvantage. The 3.63-point contrast is large enough that topic comparisons should not ignore orientation.",
            styles["body"],
        ),
        orientation_chart(results),
        Paragraph(
            "Figure 3. Debate-level bootstrap intervals preserve the paired score margin. Theist-PRO and theist-CON debates are observational groups, not randomized conditions.",
            styles["caption"],
        ),
        Paragraph("What affirmative burden requires", styles["h2"]),
        Paragraph(
            "A PRO side usually must establish a positive proposition, not merely show that the opponent's account is incomplete. In the present corpus that often means moving from possibility, existential appeal, historical testimony, apparent design, or metaphysical fit to a conclusion that the evidence actually supports. When the theist is CON, the burden can be narrower: identify a defect, defend uncertainty, or deny that the non-theist has completed the case.",
            styles["body"],
        ),
        callout(
            "Causal caution",
            "Orientation is not randomly assigned. Theist-CON debates may have different motions, speakers, and formats. The contrast nevertheless identifies a practical pressure point: the largest disadvantage appears when the theist must complete the positive public case.",
            styles,
            fill=RUST_LIGHT,
            accent=RUST,
        ),
        PageBreak(),
    ])

    # 9. Robustness matrix
    story.extend([
        Paragraph("The broad pattern survives three important restrictions", styles["h1"]),
        Paragraph(
            "A useful result should not disappear as soon as one obvious source of concentration is removed. Figure 4 therefore compares the full topic means with three restricted views: theist-PRO debates only, debates excluding the four most frequent non-theist speakers, and earlier-generation assessments only.",
            styles["body"],
        ),
        robustness_heatmap(topics),
        Paragraph(
            "Figure 4. “Excl. top 4” removes Matt Dillahunty, Alex O'Connor, Christopher Hitchens, and Graham Oppy. Values are descriptive means; restricted cells have different sample sizes and are not adjusted regression estimates.",
            styles["caption"],
        ),
        Paragraph(
            "Religion/culture/meaning remains the largest observed mean in every displayed column: 8.65 overall, 9.25 when the theist is PRO, 8.67 after the top-four exclusion, and 7.80 in earlier-generation assessments. The second-tier ordering changes, as it should under small samples. Scripture falls to 5.11 after the speaker exclusion; morality rises relative to it. The stable result is the broad concentration, not every rank position.",
            styles["body"],
        ),
        callout(
            "Most persuasive robustness result",
            "Removing the four most frequent non-theists cuts the dataset substantially, yet religion/culture/meaning remains almost unchanged at 8.67. This makes a pure “Dillahunty/O'Connor effect” an inadequate explanation for the highest observed category.",
            styles,
        ),
        PageBreak(),
    ])

    # 10. Generation sensitivity
    story.extend([
        Paragraph("Assessment generation changes some topic means, but later cells are sparse", styles["h1"]),
        Paragraph(
            "A separate scale audit found that absolute scores and several move-level properties differ across the assessment-generation boundary. Within-debate margins are more resistant to a global level shift because the same shift can cancel between sides, but a generation can still change margins if it treats the sides or dimensions differently. Figure 5 shows the available sensitivity check.",
            styles["body"],
        ),
        generation_sensitivity_chart(topics),
        Paragraph(
            "Figure 5. Earlier means use 14 to 29 debates per topic. Later means use only one to seven. Labels on later dots show n; their volatility is expected under such sparse cells.",
            styles["caption"],
        ),
        Paragraph(
            "The later religion/culture/meaning mean rises to 11.20, while its earlier mean is already high at 7.80. Morality rises to 13.00 in only two later debates. General theism/naturalism falls to 2.29 across seven later debates. These shifts warn against treating later-only rankings as settled. Crucially, the high-gap cluster does not depend on the later generation: in the earlier data alone, religion/culture/meaning, evil/hiddenness, scripture, and mind/reason all exceed seven points.",
            styles["body"],
        ),
        callout(
            "Measurement policy",
            "Future twice-yearly corpus reassessments should apply one protocol across the full set and publish category bridges. That will make it possible to tell whether a topic difference survives a genuinely uniform rerun rather than a chronology-linked production change.",
            styles,
            fill=TEAL_LIGHT,
            accent=TEAL,
        ),
        PageBreak(),
    ])

    # 11. Speaker concentration
    story.extend([
        Paragraph("Repeated speakers matter, but do not fully explain the pattern", styles["h1"]),
        Paragraph(
            "Debate corpora are not random samples of people. Skilled, prolific speakers appear repeatedly; their chosen opponents and topics are also non-random. Matt Dillahunty appears in 26 relevant debates and averages an 11.38-point non-theist advantage. Alex O'Connor appears in 22 and averages 8.59. These records can pull category means upward where the speakers are common.",
            styles["body"],
        ),
        speaker_chart(results["frequent_non_theist_speakers"]),
        Paragraph(
            "Figure 6. Speaker means are contextual summaries across the debates in which each person appears. They do not adjust for opponent strength, topic, era, debate format, or assessment generation and should not be interpreted as isolated speaker ability.",
            styles["caption"],
        ),
        Paragraph(
            "The top-four exclusion is therefore essential. It leaves 101 debates overall and only eight to eighteen in each topic, but the religion/culture/meaning mean remains 8.67. By contrast, scripture/revelation/doctrine drops from 7.84 to 5.11 and mind/reason/logic drops from 7.22 to 4.90. Those reductions show that speaker composition explains part of the high-gap cluster even though it does not explain all of it.",
            styles["body"],
        ),
        callout(
            "Do not turn a corpus pattern into a personal ranking",
            "A repeated-speaker mean describes a selected set of matchups. William Lane Craig, for example, appears in 24 theist-side debates with a much smaller 3.46-point average disadvantage; Jordan Peterson appears in four, all in one broad topical area, with an 11.25-point average. Neither number is a controlled estimate of intrinsic ability.",
            styles,
            fill=GOLD_LIGHT,
            accent=GOLD,
        ),
        PageBreak(),
    ])

    # 12. Dimension decomposition
    story.extend([
        Paragraph("Logic and evidence supply most of the high-topic margins", styles["h1"]),
        Paragraph(
            "The official score is built from six dimensions plus a burden-completion adjustment and small rounding effects. Decomposing each paired margin shows where the numerical difference enters. In the highest topic, logical coherence contributes 2.48 score points and evidence/warrant contributes 2.24. Responsiveness adds 1.83; calibration/charity adds 0.89.",
            styles["body"],
        ),
        dimension_heatmap(results["dimension_by_topic"]),
        Paragraph(
            "Figure 7. Each cell is the mean weighted contribution of that dimension to the non-theist-minus-theist overall margin. Row sums can differ slightly from the published mean because burden adjustments and rounding residuals are not shown.",
            styles["caption"],
        ),
        Paragraph(
            "The same architecture recurs across the high-gap tier. Scripture/revelation/doctrine receives 2.37 points from logic and 2.11 from evidence; mind/reason/logic receives 2.07 and 1.88; evil/hiddenness receives 1.94 and 1.92. Resurrection is different: its logic and evidence contributions are only 0.77 and 0.56, while responsiveness contributes 1.35. This is not simply a uniform penalty for holding a theist position; the mix of weaknesses changes with the argumentative task.",
            styles["body"],
        ),
        callout(
            "Substantiation diagnosis",
            "The largest topic gaps do not arise mainly from formal fallacy tags or stylistic dislike. They arise because central claims receive lower scores for inferential support, evidential connection, answer quality, and calibration. In plain language: the argument too often asks its premises to establish more than the public evidence can carry.",
            styles,
            fill=RUST_LIGHT,
            accent=RUST,
        ),
        PageBreak(),
    ])

    # 13. Move subsets
    story.extend([
        Paragraph("The weakness intensifies on the claims that carry the case", styles["h1"]),
        Paragraph(
            "Move-level analysis distinguishes constructive claims, replies, and importance. The key comparison is not an overall-score decomposition; it is the raw dimension-score difference across the moves in each subset. Load-bearing moves are those assigned the highest importance level in the locked ledgers.",
            styles["body"],
        ),
        move_subset_heatmap(results["move_subsets"]),
        Paragraph(
            "Figure 8. Counts differ by side and subset: all moves include 1,746 theist and 1,756 non-theist moves; the load-bearing subset includes 1,256 and 1,307. Values are side-level move means, not paired debate margins.",
            styles["caption"],
        ),
        Paragraph("The largest evidential gap is load-bearing", styles["h2"]),
        Paragraph(
            "Across all moves, the evidence-and-warrant difference is 8.53 dimension points. It rises to 9.25 among load-bearing moves. Logical coherence rises from 7.15 to 7.87, and calibration/charity from 8.00 to 8.95. This concentration matters: a debate can survive a weak aside, but not a weak premise on which the main conclusion depends.",
            styles["body"],
        ),
        Paragraph("Replies add a different pressure", styles["h2"]),
        Paragraph(
            "The responsiveness gap is only 2.32 points among constructive moves but 7.55 among replies. That pattern locates another weakness: once objections are on the table, theist replies more often receive lower scores for contacting the strongest contrary material or completing the requested answer. The deficiency is therefore both initial substantiation and later burden contact.",
            styles["body"],
        ),
        callout(
            "Exact location of the weakness",
            "The theist side is not merely accumulating small presentation penalties. The largest gaps sit in <b>load-bearing evidence, load-bearing calibration, and reply responsiveness</b>—the places most likely to determine whether a case has actually been completed.",
            styles,
        ),
        PageBreak(),
    ])

    # 14. Concrete debate profiles
    story.extend([
        Paragraph("Concrete profiles: the category means contain real variation", styles["h1"]),
        Paragraph(
            "Category averages become easier to understand when anchored in debates. The following examples are descriptive cases selected to show both high margins and counterexamples. They are not quoted proof-texts and they are not a substitute for the underlying scorecards.",
            styles["body"],
        ),
        data_table(
            ["Topic", "Illustrative debate", "Margin", "Why it matters diagnostically"],
            [
                ["Religion / culture / meaning", "Peterson–Dillahunty: The Greatest God Debate", "+16", "A high-margin cultural/meaning case; abstract and symbolic claims face public-warrant pressure"],
                ["Religion / culture / meaning", "Hitchens–McGrath: Poison or Cure?", "0", "A within-category tie showing that topic does not determine the outcome"],
                ["Mind / reason / logic", "Dillahunty–Ten Bruggencate: Reasonable Belief", "+24", "The corpus's largest relevant margin; transcendental claims carry a demanding logical burden"],
                ["Mind / reason / logic", "Settecase–Jump: Evidence for God", "-6", "Theist advantage; a direct counterexample to any deterministic topic story"],
                ["Cosmology / science / design", "Bollore–Halper: Does Science Point to God?", "+19", "Large evidence/design margin"],
                ["Cosmology / science / design", "Atkins–Fox: God vs Science", "-15", "Largest theist advantage in the relevant set; category mean masks broad dispersion"],
                ["Resurrection", "Ehrman–Bass: Did Jesus Rise?", "+10", "Historical claim can still produce a sizable non-theist advantage"],
                ["Resurrection", "Craig–Carrier: Resurrection Evidence", "0", "Later-generation tie consistent with the category's smaller average"],
            ],
            [105, 194, 42, CONTENT_W - 341],
            styles,
            first_bold=True,
        ),
        Spacer(1, 9),
        Paragraph("Why resurrection is smaller", styles["h2"]),
        Paragraph(
            "Resurrection debates are unusually constrained. Both sides normally engage a shared historical record, named hypotheses, and specific events. That does not make the evidence decisive, but it gives the theist a comparatively concrete evidential target and gives the non-theist a clear alternative-explanation burden. The category's smaller logic and evidence contributions are consistent with that more disciplined common frame.",
            styles["body"],
        ),
        Paragraph("Why culture and meaning are larger", styles["h2"]),
        Paragraph(
            "Cultural and existential defenses often shift among descriptive, pragmatic, symbolic, and truth-directed claims. A practice may be meaningful without being factually reliable; a tradition may stabilize a community without establishing its metaphysics; a symbolic pattern may illuminate experience without discriminating between rival explanations. When these distinctions remain implicit, logical scope, evidence/warrant, and calibration can all fall together.",
            styles["body"],
        ),
        callout(
            "Counterexamples are part of the result",
            "Every category except religion/culture/meaning includes at least one theist-higher debate, and that category includes a tie. The report maps a probabilistic concentration, not an exceptionless rule.",
            styles,
            fill=TEAL_LIGHT,
            accent=TEAL,
        ),
        PageBreak(),
    ])

    # 15. Methods and limitations
    story.extend([
        Paragraph("Methods, uncertainty, and limits", styles["h1"]),
        Paragraph("Analysis steps", styles["h2"]),
        bullet("Begin with the corrected theist/non-theist taxonomy and retain its 169 included dyads.", styles),
        bullet("Assign one primary topic from the published title, side labels, motion, and central argumentative burden; require mutually exclusive groups and at least 16 debates per group.", styles),
        bullet("Compute the paired margin as non-theist score minus theist score, then summarize means, medians, standard deviations, and direction counts.", styles),
        bullet("Use 20,000 seeded debate-level bootstrap draws for mean intervals and selected differences; keep the two scores inside a debate paired by resampling the margin.", styles),
        bullet("Randomly permute observed margins into groups of the same sizes 20,000 times to contextualize the observed max-minus-min topic range.", styles),
        bullet("Repeat topic summaries within theist-PRO debates, after excluding four frequent non-theist speakers, and inside earlier/later assessment generations.", styles),
        bullet("Join the locked-ledger score decomposition to topic and reuse the audited 3,502-move subset analysis for constructive, reply, and load-bearing diagnostics.", styles),
        Paragraph("Principal limitations", styles["h2"]),
        data_table(
            ["Limitation", "Consequence"],
            [
                ["Post-hoc topic taxonomy", "Intervals do not remove selection effects; exact rank claims should remain descriptive"],
                ["Non-random speakers and opponents", "Speaker ability, matchup, and topic are partly confounded"],
                ["Non-random PRO / CON orientation", "The 3.63-point burden contrast is not a randomized causal effect"],
                ["Assessment-generation boundary", "Later topic cells are sparse and production changes may affect margins"],
                ["AI-generated scores", "Results inherit model judgment error and require future reruns and human calibration"],
                ["Primary-topic compression", "Multi-topic debates may move under another reasonable classification"],
            ],
            [145, CONTENT_W - 145],
            styles,
            first_bold=True,
        ),
        Spacer(1, 8),
        callout(
            "Reproducibility",
            "The analysis script, results JSON, complete topic taxonomy, topic summary, dimension table, and move-subset table accompany this PDF. The random seed is 20260901. Re-running <b>analysis.py</b> regenerates every reported statistic; <b>build_pdf.py</b> regenerates this document with embedded fonts.",
            styles,
            fill=GOLD_LIGHT,
            accent=GOLD,
        ),
        PageBreak(),
    ])

    # 16. Conclusion
    story.extend([
        Paragraph("Conclusion: the disadvantage peaks where public substantiation is hardest to complete", styles["h1"]),
        Paragraph(
            "The corpus does not support one indiscriminate story in which every theist performs equally poorly on every subject. It supports a more exact and more useful conclusion. The non-theist advantage is largest in debates about religion's cultural, existential, and meaning-conferring role; it is also elevated in disputes over revelation, reason, and evil. It becomes larger when the theist must affirmatively establish the central claim. And inside the scoring record, it is concentrated in the most consequential places: logical coherence, evidence and warrant, calibration, and responsive contact with objections—especially among the claims carrying the case.",
            styles["conclusion"],
        ),
        Paragraph(
            "That pattern gives a disciplined version of the substantiation hypothesis. The recurrent problem is not simply that religious speakers use religious premises, nor that evaluators reject conclusions labeled “theist.” The problem appears when a premise rooted in revelation, symbolism, existential value, metaphysical possibility, or explanatory dissatisfaction is asked to support a public truth claim without a sufficiently discriminating bridge. Meaning is allowed to stand in for truth; possibility for probability; an unexplained feature for positive evidence of agency; or a reply to one objection for completion of the whole burden. Each move can sound substantial while leaving the inferential connection incomplete.",
            styles["body"],
        ),
        Paragraph(
            "The smaller resurrection gap clarifies the result. When both sides are forced toward a shared historical record, explicit rival hypotheses, and identifiable events, the theist side performs more competitively. The difference does not disappear, but the logic-and-evidence contribution shrinks sharply. This is consistent with the idea that clearer evidential constraints improve the theist side's relative showing. It is also a warning against treating “theism” as one homogeneous argumentative method.",
            styles["body"],
        ),
        callout(
            "Strongest defensible conclusion",
            "Within this 169-debate snapshot, the theist disadvantage is greatest where the case depends on converting culturally resonant, existentially powerful, revelatory, or transcendental considerations into publicly testable support under an affirmative burden. The decisive weakness is not mere rhetoric or isolated formal fallacy. It is <b>incomplete evidential and inferential substantiation at the load-bearing point of the argument</b>.",
            styles,
            fill=RUST_LIGHT,
            accent=RUST,
        ),
        Spacer(1, 9),
        Paragraph("What should happen next", styles["h2"]),
        bullet("Pre-register the topic map before the next full-corpus rerun and preserve ambiguous dual-topic codes for sensitivity analysis.", styles),
        bullet("Reassess the full corpus under one protocol roughly twice yearly when model improvements justify a meaningful accuracy gain.", styles),
        bullet("Add repeated independent runs and expert-human calibration to estimate judgment variance and test whether the burden/topic pattern replicates.", styles),
        bullet("Keep within-debate margins central, and avoid turning unadjusted repeated-speaker means into personal league tables.", styles),
        Spacer(1, 8),
        SectionRule(color=TEAL),
        Spacer(1, 8),
        Paragraph(
            "<b>Recommended citation:</b> SLUGFESTER. <i>Where Is the Theist Disadvantage Largest? A Topic-, Burden-, Speaker-, and Rubric-Level Map Across 169 Theist/Non-Theist Debate Assessments.</i> Corpus-level analysis report, September 1, 2026.",
            styles["caption"],
        ),
    ])
    return story


def build_pdf() -> Path:
    base.register_fonts()
    styles = base.make_styles()
    with RESULTS_PATH.open(encoding="utf-8") as handle:
        results = json.load(handle)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    frame = Frame(
        LEFT,
        BOTTOM,
        CONTENT_W,
        PAGE_H - TOP - BOTTOM,
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
        id="body",
    )
    doc = BaseDocTemplate(
        str(OUTPUT_PATH),
        pagesize=letter,
        leftMargin=LEFT,
        rightMargin=RIGHT,
        topMargin=TOP,
        bottomMargin=BOTTOM,
        title="Where Is the Theist Disadvantage Largest?",
        author="SLUGFESTER",
        subject="Corpus-level map of theist/non-theist score differences by topic, burden, speaker, and rubric dimension",
        creator="SLUGFESTER corpus-level analysis pipeline",
    )
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[frame], onPage=first_page, autoNextPageTemplate="body"),
        PageTemplate(id="body", frames=[frame], onPage=later_page),
    ])
    doc.build(build_story(results, styles))
    return OUTPUT_PATH


if __name__ == "__main__":
    print(build_pdf())
