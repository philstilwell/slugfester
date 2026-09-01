#!/usr/bin/env python3
"""Build the publication PDF for the Slugfester CON-side advantage study."""

from __future__ import annotations

import csv
import importlib.util
import json
from pathlib import Path

from reportlab.graphics.shapes import Circle, Drawing, Line, Rect, String
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import BaseDocTemplate, Frame, PageBreak, PageTemplate, Paragraph, Spacer


REPO_ROOT = Path(__file__).resolve().parents[3]
ANALYSIS_DIR = Path(__file__).resolve().parent
RESULTS_PATH = ANALYSIS_DIR / "results.json"
DEBATES_PATH = ANALYSIS_DIR / "debate-role-results.csv"
SPEAKERS_PATH = ANALYSIS_DIR / "speaker-role-bridge.csv"
COUNTEREXAMPLES_PATH = ANALYSIS_DIR / "counterexamples.csv"
OUTPUT_PATH = REPO_ROOT / "output/pdf/does-the-con-side-have-an-inherent-advantage.pdf"
BASE_PATH = REPO_ROOT / "docs/analysis/assessment-generation-comparability-2026-09-01/build_pdf.py"

spec = importlib.util.spec_from_file_location("slugfester_report_base", BASE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load report base: {BASE_PATH}")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

PAGE_W, PAGE_H = letter
LEFT, RIGHT, TOP, BOTTOM = base.LEFT, base.RIGHT, base.TOP, base.BOTTOM
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
WHITE = base.WHITE

SectionRule = base.SectionRule
callout = base.callout
metric_strip = base.metric_strip
data_table = base.data_table
bullet = base.bullet


def chart_header(drawing: Drawing, title: str, subtitle: str, width: float) -> None:
    drawing.add(
        String(
            0,
            drawing.height - 14,
            title,
            fontName="SLUGSans-Bold",
            fontSize=10.5,
            fillColor=NAVY,
        )
    )
    drawing.add(
        String(
            0,
            drawing.height - 28,
            subtitle,
            fontName="SLUGSans",
            fontSize=7.35,
            fillColor=MUTED,
        )
    )
    drawing.add(
        Line(
            0,
            drawing.height - 34,
            width,
            drawing.height - 34,
            strokeColor=RULE,
            strokeWidth=0.7,
        )
    )


def raw_mean_chart(debates: list[dict]) -> Drawing:
    width, height = CONTENT_W, 255
    drawing = Drawing(width, height)
    pro = sum(row["pro_score"] for row in debates) / len(debates)
    con = sum(row["con_score"] for row in debates) / len(debates)
    chart_header(
        drawing,
        "Mean published overall score by nominal side",
        "213 one-on-one locked assessments through Debate 229; absolute 0-100 score scale",
        width,
    )
    left, right, bottom, top = 96, 32, 46, height - 58
    chart_w = width - left - right
    for tick in (0, 20, 40, 60, 80, 100):
        x = left + chart_w * tick / 100
        drawing.add(Line(x, bottom, x, top, strokeColor=RULE, strokeWidth=0.45))
        drawing.add(
            String(
                x,
                bottom - 14,
                str(tick),
                textAnchor="middle",
                fontName="SLUGSans",
                fontSize=6.6,
                fillColor=MUTED,
            )
        )
    rows = [("PRO", pro, RUST), ("CON", con, BLUE)]
    for index, (label, value, fill) in enumerate(rows):
        y = top - (index + 0.5) * (top - bottom) / 2
        end = left + chart_w * value / 100
        drawing.add(
            String(
                left - 12,
                y - 4,
                label,
                textAnchor="end",
                fontName="SLUGSans-Bold",
                fontSize=8.2,
                fillColor=INK,
            )
        )
        drawing.add(
            Rect(
                left,
                y - 11,
                end - left,
                22,
                fillColor=fill,
                strokeColor=NAVY,
                strokeWidth=0.45,
            )
        )
        drawing.add(
            String(
                end + 8,
                y - 4,
                f"{value:.2f}",
                fontName="SLUGSans-Bold",
                fontSize=8,
                fillColor=INK,
            )
        )
    drawing.add(
        String(
            width / 2,
            14,
            f"Raw difference: CON +{con - pro:.2f} points",
            textAnchor="middle",
            fontName="SLUGSans-Bold",
            fontSize=7.7,
            fillColor=BLUE_DARK,
        )
    )
    return drawing


def direction_chart(raw: dict) -> Drawing:
    width, height = CONTENT_W, 190
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Direction of the published score difference",
        "Each debate counted once; segment labels show counts and shares",
        width,
    )
    rows = [
        ("CON higher", raw["con_higher"], BLUE),
        ("PRO higher", raw["pro_higher"], RUST),
        ("Tie", raw["ties"], GOLD),
    ]
    total = sum(value for _, value, _ in rows)
    left, right, y, h = 28, 28, 85, 35
    chart_w = width - left - right
    cursor = left
    for label, value, fill in rows:
        segment = chart_w * value / total
        drawing.add(
            Rect(
                cursor,
                y,
                segment,
                h,
                fillColor=fill,
                strokeColor=WHITE,
                strokeWidth=1,
            )
        )
        if segment > 42:
            drawing.add(
                String(
                    cursor + segment / 2,
                    y + 14,
                    f"{value}  ({value / total:.1%})",
                    textAnchor="middle",
                    fontName="SLUGSans-Bold",
                    fontSize=7.4,
                    fillColor=WHITE if fill != GOLD else NAVY,
                )
            )
        cursor += segment
    legend_x = left
    for label, value, fill in rows:
        drawing.add(Rect(legend_x, 48, 9, 9, fillColor=fill, strokeColor=NAVY, strokeWidth=0.3))
        drawing.add(
            String(
                legend_x + 14,
                48,
                label,
                fontName="SLUGSans",
                fontSize=7,
                fillColor=INK,
            )
        )
        legend_x += 140
    return drawing


def margin_distribution_chart(debates: list[dict]) -> Drawing:
    width, height = CONTENT_W, 300
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Distribution of debate-level CON-minus-PRO margins",
        "Five-point bins; positive values favor CON, negative values favor PRO",
        width,
    )
    bins = [(-25, -15), (-15, -10), (-10, -5), (-5, 0), (0, 5), (5, 10), (10, 15), (15, 25)]
    counts = []
    for index, (low, high) in enumerate(bins):
        if index == len(bins) - 1:
            count = sum(low <= row["con_minus_pro"] <= high for row in debates)
        else:
            count = sum(low <= row["con_minus_pro"] < high for row in debates)
        counts.append(count)
    left, right, bottom, top = 44, 24, 54, height - 60
    chart_w = width - left - right
    chart_h = top - bottom
    y_max = max(counts) + 5
    for tick in range(0, y_max + 1, 20):
        y = bottom + chart_h * tick / y_max
        drawing.add(Line(left, y, width - right, y, strokeColor=RULE, strokeWidth=0.4))
        drawing.add(
            String(
                left - 8,
                y - 2,
                str(tick),
                textAnchor="end",
                fontName="SLUGSans",
                fontSize=6.4,
                fillColor=MUTED,
            )
        )
    step = chart_w / len(bins)
    for index, ((low, high), count) in enumerate(zip(bins, counts)):
        x = left + index * step + 3
        bar_h = chart_h * count / y_max
        fill = RUST if high <= 0 else GOLD if low == 0 else BLUE
        drawing.add(
            Rect(
                x,
                bottom,
                step - 6,
                bar_h,
                fillColor=fill,
                strokeColor=NAVY,
                strokeWidth=0.35,
            )
        )
        drawing.add(
            String(
                x + (step - 6) / 2,
                bottom + bar_h + 6,
                str(count),
                textAnchor="middle",
                fontName="SLUGSans-Bold",
                fontSize=6.5,
                fillColor=INK,
            )
        )
        label = f"{low} to {high}"
        drawing.add(
            String(
                x + (step - 6) / 2,
                bottom - 14,
                label,
                textAnchor="middle",
                fontName="SLUGSans",
                fontSize=5.8,
                fillColor=MUTED,
            )
        )
    return drawing


def forest_chart(
    title: str,
    subtitle: str,
    rows: list[dict],
    x_min: float,
    x_max: float,
    height: float,
    label_width: float = 172,
) -> Drawing:
    width = CONTENT_W
    drawing = Drawing(width, height)
    chart_header(drawing, title, subtitle, width)
    left, right, bottom, top = label_width, 34, 48, height - 60
    chart_w = width - left - right
    ticks = list(range(int(x_min), int(x_max) + 1, 2))
    if 0 not in ticks:
        ticks.append(0)
        ticks.sort()
    for tick in ticks:
        x = left + chart_w * (tick - x_min) / (x_max - x_min)
        drawing.add(
            Line(
                x,
                bottom,
                x,
                top,
                strokeColor=NAVY if tick == 0 else RULE,
                strokeWidth=1.0 if tick == 0 else 0.45,
            )
        )
        drawing.add(
            String(
                x,
                bottom - 14,
                f"{tick:+d}",
                textAnchor="middle",
                fontName="SLUGSans",
                fontSize=6.4,
                fillColor=MUTED,
            )
        )
    step = (top - bottom) / len(rows)
    for index, row in enumerate(rows):
        y = top - step * (index + 0.5)
        value = row["mean_con_minus_pro"]
        low, high = row["ci_95"]
        x1 = left + chart_w * (low - x_min) / (x_max - x_min)
        x2 = left + chart_w * (high - x_min) / (x_max - x_min)
        xm = left + chart_w * (value - x_min) / (x_max - x_min)
        fill = BLUE if value >= 0 else RUST
        drawing.add(
            String(
                left - 10,
                y - 3,
                row["short_label"],
                textAnchor="end",
                fontName="SLUGSans",
                fontSize=6.8,
                fillColor=INK,
            )
        )
        drawing.add(Line(x1, y, x2, y, strokeColor=BLUE_DARK, strokeWidth=2.1))
        drawing.add(Circle(x1, y, 2.2, fillColor=WHITE, strokeColor=BLUE_DARK, strokeWidth=0.8))
        drawing.add(Circle(x2, y, 2.2, fillColor=WHITE, strokeColor=BLUE_DARK, strokeWidth=0.8))
        drawing.add(Circle(xm, y, 4.5, fillColor=fill, strokeColor=NAVY, strokeWidth=0.6))
        drawing.add(
            String(
                xm,
                y + 10,
                f"{value:+.2f}",
                textAnchor="middle",
                fontName="SLUGSans-Bold",
                fontSize=6.7,
                fillColor=INK,
            )
        )
    drawing.add(
        String(
            left,
            15,
            "PRO higher",
            fontName="SLUGSans-Bold",
            fontSize=6.6,
            fillColor=RUST,
        )
    )
    drawing.add(
        String(
            width - right,
            15,
            "CON higher",
            textAnchor="end",
            fontName="SLUGSans-Bold",
            fontSize=6.6,
            fillColor=BLUE,
        )
    )
    return drawing


def orientation_chart(orientation: dict) -> Drawing:
    width, height = CONTENT_W, 190
    drawing = Drawing(width, height)
    pro = orientation["theist_is_pro"]
    con = orientation["theist_is_con"]
    total = pro + con
    chart_header(
        drawing,
        "Nominal-side placement in the previously classified theist/non-theist set",
        "169 debates; the substantive theist position is overwhelmingly assigned to PRO",
        width,
    )
    left, right, y, h = 30, 30, 82, 38
    chart_w = width - left - right
    pro_w = chart_w * pro / total
    drawing.add(Rect(left, y, pro_w, h, fillColor=RUST, strokeColor=WHITE, strokeWidth=1))
    drawing.add(
        Rect(left + pro_w, y, chart_w - pro_w, h, fillColor=BLUE, strokeColor=WHITE, strokeWidth=1)
    )
    drawing.add(
        String(
            left + pro_w / 2,
            y + 15,
            f"Theist is PRO: {pro} ({pro / total:.1%})",
            textAnchor="middle",
            fontName="SLUGSans-Bold",
            fontSize=7.5,
            fillColor=WHITE,
        )
    )
    drawing.add(
        String(
            left + pro_w + (chart_w - pro_w) / 2,
            y + 15,
            f"CON: {con}",
            textAnchor="middle",
            fontName="SLUGSans-Bold",
            fontSize=7.3,
            fillColor=WHITE,
        )
    )
    drawing.add(
        String(
            width / 2,
            36,
            "Nominal role and substantive position are therefore strongly confounded",
            textAnchor="middle",
            fontName="SLUGSans-Bold",
            fontSize=7.2,
            fillColor=NAVY,
        )
    )
    return drawing


def crossover_speaker_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 450
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Within-speaker CON-minus-PRO differences",
        "29 speakers observed on both nominal sides; equal-speaker summary is +1.00 points",
        width,
    )
    plot_rows = sorted(rows, key=lambda row: row["con_minus_pro"], reverse=True)
    left, right, bottom, top = 124, 30, 50, height - 60
    x_min, x_max = -8, 9
    chart_w = width - left - right
    for tick in (-8, -4, 0, 4, 8):
        x = left + chart_w * (tick - x_min) / (x_max - x_min)
        drawing.add(
            Line(
                x,
                bottom,
                x,
                top,
                strokeColor=NAVY if tick == 0 else RULE,
                strokeWidth=1 if tick == 0 else 0.4,
            )
        )
        drawing.add(
            String(
                x,
                bottom - 14,
                f"{tick:+d}",
                textAnchor="middle",
                fontName="SLUGSans",
                fontSize=6.2,
                fillColor=MUTED,
            )
        )
    step = (top - bottom) / len(plot_rows)
    for index, row in enumerate(plot_rows):
        y = top - step * (index + 0.5)
        value = row["con_minus_pro"]
        x0 = left + chart_w * (0 - x_min) / (x_max - x_min)
        x = left + chart_w * (value - x_min) / (x_max - x_min)
        fill = BLUE if value >= 0 else RUST
        drawing.add(
            String(
                left - 8,
                y - 2.5,
                row["speaker"],
                textAnchor="end",
                fontName="SLUGSans",
                fontSize=5.8,
                fillColor=INK,
            )
        )
        drawing.add(Line(x0, y, x, y, strokeColor=fill, strokeWidth=1.2))
        drawing.add(Circle(x, y, 2.6, fillColor=fill, strokeColor=NAVY, strokeWidth=0.35))
        anchor = "start" if value >= 0 else "end"
        drawing.add(
            String(
                x + (5 if value >= 0 else -5),
                y - 2.5,
                f"{value:+.1f}",
                textAnchor=anchor,
                fontName="SLUGSans-Bold",
                fontSize=5.5,
                fillColor=INK,
            )
        )
    return drawing


def dimension_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 360
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Mean paired debate gap across the six scoring dimensions",
        "Dots are CON-minus-PRO differences; lines are 95% debate-bootstrap intervals",
        width,
    )
    plot_rows = sorted(rows, key=lambda row: row["mean_paired_debate_con_minus_pro"], reverse=True)
    left, right, bottom, top = 132, 34, 50, height - 62
    x_min, x_max = -2, 9
    chart_w = width - left - right
    for tick in (-2, 0, 2, 4, 6, 8):
        x = left + chart_w * (tick - x_min) / (x_max - x_min)
        drawing.add(
            Line(
                x,
                bottom,
                x,
                top,
                strokeColor=NAVY if tick == 0 else RULE,
                strokeWidth=1 if tick == 0 else 0.45,
            )
        )
        drawing.add(
            String(
                x,
                bottom - 14,
                f"{tick:+d}",
                textAnchor="middle",
                fontName="SLUGSans",
                fontSize=6.4,
                fillColor=MUTED,
            )
        )
    step = (top - bottom) / len(plot_rows)
    for index, row in enumerate(plot_rows):
        y = top - step * (index + 0.5)
        value = row["mean_paired_debate_con_minus_pro"]
        x1 = left + chart_w * (row["paired_debate_ci_lower"] - x_min) / (x_max - x_min)
        x2 = left + chart_w * (row["paired_debate_ci_upper"] - x_min) / (x_max - x_min)
        xm = left + chart_w * (value - x_min) / (x_max - x_min)
        outside = row["outside_set_mean_paired_gap"]
        xo = left + chart_w * (outside - x_min) / (x_max - x_min)
        drawing.add(
            String(
                left - 10,
                y - 3,
                row["label"],
                textAnchor="end",
                fontName="SLUGSans",
                fontSize=7,
                fillColor=INK,
            )
        )
        drawing.add(Line(x1, y + 5, x2, y + 5, strokeColor=BLUE_DARK, strokeWidth=2))
        drawing.add(Circle(xm, y + 5, 4.1, fillColor=BLUE, strokeColor=NAVY, strokeWidth=0.5))
        drawing.add(Circle(xo, y - 7, 3.2, fillColor=WHITE, strokeColor=RUST, strokeWidth=1.2))
        drawing.add(
            String(
                xm,
                y + 14,
                f"{value:+.2f}",
                textAnchor="middle",
                fontName="SLUGSans-Bold",
                fontSize=6.2,
                fillColor=INK,
            )
        )
    drawing.add(Circle(132, 22, 3.8, fillColor=BLUE, strokeColor=NAVY, strokeWidth=0.4))
    drawing.add(
        String(141, 19, "All 213 debates", fontName="SLUGSans", fontSize=6.5, fillColor=INK)
    )
    drawing.add(Circle(247, 22, 3.2, fillColor=WHITE, strokeColor=RUST, strokeWidth=1.1))
    drawing.add(
        String(
            256,
            19,
            "44 debates outside classified set",
            fontName="SLUGSans",
            fontSize=6.5,
            fillColor=INK,
        )
    )
    return drawing


def counterexample_chart(rows: list[dict]) -> Drawing:
    width, height = CONTENT_W, 390
    drawing = Drawing(width, height)
    chart_header(
        drawing,
        "Largest margins outside the 169-debate classified set",
        "Selected strongest PRO and CON advantages; positive values favor CON",
        width,
    )
    pro_rows = sorted(
        [row for row in rows if "PRO" in row["direction"]],
        key=lambda row: row["con_minus_pro"],
    )[:5]
    con_rows = sorted(
        [row for row in rows if "CON" in row["direction"]],
        key=lambda row: row["con_minus_pro"],
        reverse=True,
    )[:5]
    plot_rows = pro_rows + con_rows
    left, right, bottom, top = 158, 30, 50, height - 60
    x_min, x_max = -16, 16
    chart_w = width - left - right
    x0 = left + chart_w * (0 - x_min) / (x_max - x_min)
    for tick in (-15, -10, -5, 0, 5, 10, 15):
        x = left + chart_w * (tick - x_min) / (x_max - x_min)
        drawing.add(
            Line(
                x,
                bottom,
                x,
                top,
                strokeColor=NAVY if tick == 0 else RULE,
                strokeWidth=1 if tick == 0 else 0.4,
            )
        )
        drawing.add(
            String(
                x,
                bottom - 14,
                f"{tick:+d}",
                textAnchor="middle",
                fontName="SLUGSans",
                fontSize=6.2,
                fillColor=MUTED,
            )
        )
    step = (top - bottom) / len(plot_rows)
    for index, row in enumerate(plot_rows):
        y = top - step * (index + 0.5)
        value = row["con_minus_pro"]
        x = left + chart_w * (value - x_min) / (x_max - x_min)
        fill = BLUE if value > 0 else RUST
        label = f"#{row['number']}  {row['pro_speaker']} / {row['con_speaker']}"
        drawing.add(
            String(
                left - 8,
                y - 3,
                label,
                textAnchor="end",
                fontName="SLUGSans",
                fontSize=6.1,
                fillColor=INK,
            )
        )
        drawing.add(
            Rect(
                min(x0, x),
                y - 6,
                abs(x - x0),
                12,
                fillColor=fill,
                strokeColor=NAVY,
                strokeWidth=0.35,
            )
        )
        drawing.add(
            String(
                x + (6 if value > 0 else -6),
                y - 3,
                f"{value:+.0f}",
                textAnchor="start" if value > 0 else "end",
                fontName="SLUGSans-Bold",
                fontSize=6.4,
                fillColor=INK,
            )
        )
    return drawing


def first_page(canvas, doc) -> None:
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, PAGE_H - 0.18 * inch, PAGE_W, 0.18 * inch, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
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
    canvas.drawRightString(PAGE_W - RIGHT, PAGE_H - 0.33 * inch, "NOMINAL-SIDE ADVANTAGE")
    canvas.line(LEFT, 0.40 * inch, PAGE_W - RIGHT, 0.40 * inch)
    canvas.drawString(LEFT, 0.25 * inch, "September 1, 2026")
    canvas.drawRightString(PAGE_W - RIGHT, 0.25 * inch, str(doc.page))
    canvas.restoreState()


def load_csv(path: Path, numeric_fields: set[str]) -> list[dict]:
    with path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    for row in rows:
        for field in numeric_fields:
            row[field] = float(row[field])
    return rows


def short_estimate(source: dict, label: str) -> dict:
    return {
        "short_label": label,
        "mean_con_minus_pro": source["mean_con_minus_pro"],
        "ci_95": source["ci_95"],
    }


def build_story(results: dict, debates: list[dict], speakers: list[dict], counterexamples: list[dict], styles: dict) -> list:
    snapshot = results["snapshot"]
    raw = results["raw_pattern"]
    estimates = results["estimates"]
    orientation = results["theist_orientation"]
    bridge = results["speaker_role_bridge"]
    dimensions = results["dimension_gaps"]
    story = []

    # 1. Cover
    story.extend([
        Spacer(1, 0.32 * inch),
        Paragraph("CORPUS-LEVEL IDENTIFICATION PAPER", styles["cover_kicker"]),
        Paragraph("Does the CON Side Have an Inherent Advantage?", styles["cover_title"]),
        Paragraph(
            "Why a 4.69-point raw gap is real but does not establish a formal-role or scoring-label bias",
            styles["cover_subtitle"],
        ),
        Paragraph(
            "REPORT DATE  ·  SEPTEMBER 1, 2026 &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; "
            "CORPUS  ·  213 DEBATES / 426 APPEARANCES &nbsp;&nbsp;&nbsp; | &nbsp;&nbsp;&nbsp; "
            "LOCKED MOVE EVIDENCE  ·  4,497 MOVES",
            styles["cover_meta"],
        ),
        SectionRule(color=GOLD),
        Spacer(1, 8),
        Paragraph(
            "<b>Answer.</b> The published corpus contains a large and unmistakable nominal-side pattern: CON averages 83.17, PRO averages 78.48, and CON is higher in 159 of 213 debates. The mean paired advantage is 4.69 points, with a 95% debate-bootstrap interval from 3.78 to 5.62.",
            styles["cover_abstract"],
        ),
        Paragraph(
            "That pattern is not an identified formal-role effect. In 149 of the 169 previously classified theist-versus-non-theist debates, the theist position occupies PRO. When the theist position instead occupies CON, the nominal CON advantage reverses: CON averages 3.15 points below PRO. Outside the 169-debate set, the CON estimate falls to 1.21 points and its uncertainty includes zero.",
            styles["cover_abstract"],
        ),
        Paragraph(
            "Speaker controls tell the same story. The 29 speakers observed on both sides show an equal-speaker CON-minus-PRO difference of only 1.00 point, again with an interval crossing zero. The strongest current explanation is therefore corpus composition: motion polarity, proposition type, and speaker assignment are entangled with the PRO/CON labels.",
            styles["cover_abstract"],
        ),
        Spacer(1, 7),
        callout(
            "Strongest defensible conclusion",
            "Slugfester's raw CON advantage is <b>descriptively real but causally unassigned</b>. The present data do not show that opposing a motion is inherently easier, that the rubric rewards CON, or that changing only a side label would change a score.",
            styles,
            fill=GOLD_LIGHT,
            accent=GOLD,
        ),
        Spacer(1, 6),
        Paragraph(
            "Prepared from the complete September 1, 2026 locked-ledger snapshot. This paper evaluates the scores as data; it does not independently rescore the debates or judge which propositions are true.",
            styles["caption"],
        ),
        PageBreak(),
    ])

    # 2. Technical summary
    story.extend([
        Paragraph("Technical summary", styles["h1"]),
        metric_strip(
            [
                ("+4.69", "raw CON-minus-PRO mean"),
                ("159 / 213", "debates with CON higher"),
                ("+1.00", "equal-speaker crossover estimate"),
            ],
            styles,
        ),
        Spacer(1, 8),
        Paragraph("What is directly observed", styles["h2"]),
        bullet("Across 213 one-on-one locked assessments through Debate 229, mean overall score is 83.17 for CON and 78.48 for PRO.", styles),
        bullet("The mean paired difference is +4.69 points for CON; the median is +5, and the standardized paired difference is 0.69.", styles),
        bullet("CON is higher in 159 debates, PRO in 46, with eight ties. The exact sign test rejects a 50/50 direction split, but does not identify why the split occurs.", styles),
        Paragraph("What changes the interpretation", styles["h2"]),
        bullet("Theist positions occupy PRO in 149 of 169 previously classified theist/non-theist debates. That substantive position already has a documented score disadvantage.", styles),
        bullet("The nominal-side estimate reverses when the theist position is CON: -3.15 points for CON across 20 debates.", styles),
        bullet("Outside the classified set, the estimate is +1.20 points, with a 95% interval from -0.34 to +2.75.", styles),
        bullet("Among 29 crossover speakers, equal speaker weighting gives +1.00 point, with a 95% interval from -0.34 to +2.30.", styles),
        callout(
            "Decision-useful reading",
            "Use PRO and CON as descriptive catalogue labels. Do not interpret the raw side averages as a general penalty for affirming a motion or as proof that Slugfester's scorer favors opposition. A polarity-randomized experiment is required for that claim.",
            styles,
        ),
        PageBreak(),
    ])

    # 3. Scope and identification
    story.extend([
        Paragraph("The question is causal, but the available evidence is observational", styles["h1"]),
        Paragraph(
            "A raw side difference answers a simple descriptive question: how did sides carrying the published CON label score relative to sides carrying PRO? An inherent role advantage is a different claim. It asks what would happen if the same speaker defended the same proposition under a different formal label or under a logically equivalent reversed motion.",
            styles["body"],
        ),
        data_table(
            ["Quantity", "What it measures", "What it cannot establish"],
            [
                ["Raw CON-minus-PRO", "Observed side difference in this catalogue", "Effect of changing only formal role"],
                ["Generation-stratified gap", "Whether the raw pattern spans both scoring eras", "Removal of topic or speaker selection"],
                ["Theist-orientation strata", "Whether the gap follows nominal side or known position type", "A randomized position effect"],
                ["Outside-set estimate", "Pattern after removing the prior 169-debate classification", "A complete control for all proposition types"],
                ["Crossover-speaker bridge", "Within-speaker role association among 29 speakers", "Random opponent, topic, or motion assignment"],
                ["Polarity-reversal experiment", "Same content under randomized side labels", "Broad generalization beyond tested motions"],
            ],
            [104, 168, 176],
            styles,
            first_bold=True,
        ),
        Spacer(1, 9),
        Paragraph(
            "The primary unit is the debate. For each locked one-on-one assessment, the analysis computes CON overall score minus PRO overall score. Positive numbers favor CON; negative numbers favor PRO. Confidence intervals resample debates 20,000 times. Speaker-bridge intervals instead resample the 29 crossover speakers.",
            styles["body"],
        ),
        callout(
            "Identification rule",
            "A formal-role explanation should remain positive when substantive position and stable speaker identity are held more nearly constant. If the sign reverses with position and collapses within speakers, the raw role label is not the best-supported explanation.",
            styles,
            fill=TEAL_LIGHT,
            accent=TEAL,
        ),
        Paragraph("Scope", styles["h2"]),
        bullet(f"Snapshot date: September 1, 2026; {snapshot['comparable_debates']} comparable one-on-one debates and {snapshot['speaker_appearances']} speaker appearances.", styles),
        bullet(f"Move-level diagnostic layer: {snapshot['locked_moves']:,} scored moves across six rubric dimensions.", styles),
        bullet("Outcome: AI-assisted Slugfester argumentative-performance scores, not audience votes, truth, persuasion, or tournament adjudication.", styles),
        PageBreak(),
    ])

    # 4. Raw means and direction
    story.extend([
        Paragraph("The raw nominal-side difference is large and consistent", styles["h1"]),
        Paragraph(
            "CON averages 83.17 and PRO 78.48. Because every debate contributes one score to each side, the 4.69-point difference is a paired corpus statistic rather than a comparison of two unrelated samples. The interval from 3.78 to 5.62 excludes zero comfortably.",
            styles["body"],
        ),
        raw_mean_chart(debates),
        Paragraph(
            "<i>Figure 1. Absolute mean scores by nominal side. The zero-based scale preserves the magnitude of the scores; the exact paired difference is reported separately.</i>",
            styles["caption"],
        ),
        direction_chart(raw),
        Paragraph(
            "<i>Figure 2. CON is higher in 159 debates, PRO in 46, and eight are tied. Among non-ties, CON is higher 77.6% of the time.</i>",
            styles["caption"],
        ),
        Paragraph(
            "This establishes a report-worthy regularity. It does not yet distinguish three explanations: a true advantage of rebutting rather than affirming, a scorer response to the words PRO and CON, or a compositional effect in which harder propositions and systematically different speakers are assigned to PRO.",
            styles["body"],
        ),
        PageBreak(),
    ])

    # 5. Margin distribution
    story.extend([
        Paragraph("The pattern is distributed across the corpus, not produced by a few extremes", styles["h1"]),
        Paragraph(
            "The median CON-minus-PRO margin is five points, nearly identical to the 4.69-point mean. Large PRO wins exist, but the distribution contains many more positive than negative margins. The standardized paired difference of 0.69 is substantial for a score bounded from 0 to 100.",
            styles["body"],
        ),
        margin_distribution_chart(debates),
        Paragraph(
            "<i>Figure 3. Debate-level margins in five-point bands. The central zero-to-five bin includes ties and small CON leads; blue bins represent larger CON leads and rust bins PRO leads.</i>",
            styles["caption"],
        ),
        Paragraph(
            "A broad distribution matters because it rules out a trivial outlier story. Yet it remains compatible with catalogue composition. If one class of propositions is placed mostly on one nominal side and tends to score lower across many debates, the resulting role histogram will look exactly like a pervasive side advantage.",
            styles["body"],
        ),
        callout(
            "Observed pattern, unresolved cause",
            "The large sample makes the raw association precise. It does not make the role assignment random. Statistical precision around a confounded comparison is still precision around a confounded comparison.",
            styles,
            fill=RUST_LIGHT,
            accent=RUST,
        ),
        PageBreak(),
    ])

    # 6. Generations
    generation_rows = [
        short_estimate(estimates[1], "Earlier generation  n=179"),
        short_estimate(estimates[2], "Later generation  n=34"),
    ]
    story.extend([
        Paragraph("The raw gap appears in both assessment generations", styles["h1"]),
        Paragraph(
            "The earlier closed-findings generation gives CON a 4.94-point mean advantage. The later standalone generation gives CON a 3.41-point advantage. Their intervals overlap, and both estimates are positive, although the smaller later sample is naturally less precise.",
            styles["body"],
        ),
        forest_chart(
            "CON-minus-PRO gap by assessment generation",
            "Paired debate means and 95% bootstrap intervals; zero indicates no nominal-side difference",
            generation_rows,
            -2,
            8,
            250,
        ),
        Paragraph(
            "<i>Figure 4. The raw nominal-side association is not confined to one scoring generation. This check addresses measurement-era concentration, not substantive position assignment.</i>",
            styles["caption"],
        ),
        Paragraph(
            "This robustness check is important but limited. The known generation shift changes absolute scores for both sides and could have changed dimension behavior. Because PRO and CON are paired within every debate, however, the within-debate side margin is safer than comparing absolute scores across generations. The persistence of a positive margin says the association is repeatable; it still does not identify a formal-role mechanism.",
            styles["body"],
        ),
        callout(
            "Why this does not settle the issue",
            "The same proposition and speaker asymmetry exists in both generations. A repeated confound can create a repeated estimate.",
            styles,
        ),
        PageBreak(),
    ])

    # 7. Position reversal
    alignment_rows = [
        short_estimate(estimates[3], "Classified set  n=169"),
        short_estimate(estimates[4], "Theist position is PRO  n=149"),
        short_estimate(estimates[5], "Theist position is CON  n=20"),
        short_estimate(estimates[6], "Outside classified set  n=44"),
    ]
    story.extend([
        Paragraph("The nominal-side effect reverses with substantive position", styles["h1"]),
        Paragraph(
            "The decisive observational check is not whether CON remains ahead in another assessment generation, but whether it remains ahead when a familiar substantive position changes sides. It does not. When the theist position occupies PRO, CON leads by 6.78 points. When the theist position occupies CON, CON trails by 3.15 points.",
            styles["body"],
        ),
        forest_chart(
            "CON-minus-PRO gap by substantive position alignment",
            "Previously classified 169-debate theist/non-theist set plus the 44 debates outside it",
            alignment_rows,
            -8,
            10,
            340,
            label_width=182,
        ),
        Paragraph(
            "<i>Figure 5. Positive estimates favor CON. The role-only hypothesis predicts a positive CON effect regardless of which substantive position occupies that side; the observed sign reversal contradicts that simple account.</i>",
            styles["caption"],
        ),
        Paragraph(
            "The 20 theist-CON debates are a smaller and non-random subset, so the reversal is not a causal estimate of theism either. Its value is diagnostic: the nominal label does not dominate the known position effect. The score pattern follows what is being defended more closely than whether the defence is called PRO or CON.",
            styles["body"],
        ),
        PageBreak(),
    ])

    # 8. Composition
    story.extend([
        Paragraph("The classified corpus assigns the theist position to PRO 88.2% of the time", styles["h1"]),
        Paragraph(
            "Of the 169 previously classified theist-versus-non-theist assessments, 149 place the theist position on PRO and only 20 place it on CON. This is not a scoring error. It is a property of how public debate motions are commonly phrased: claims such as God exists, the resurrection occurred, or Christian theism explains some phenomenon are usually affirmative propositions.",
            styles["body"],
        ),
        orientation_chart(orientation),
        Paragraph(
            "<i>Figure 6. Nominal side and substantive position are strongly entangled. Since the theist side has a separately documented 6.35-point average disadvantage in the corrected relevant corpus, the imbalance mechanically loads much of that substantive difference onto PRO.</i>",
            styles["caption"],
        ),
        Paragraph(
            f"A descriptive 50/50 reweighting of the two theist-orientation strata reduces the classified-set CON estimate from 5.60 to {orientation['reweighted_50_50']['mean_con_minus_pro']:.2f} points. Its 95% interval is {orientation['reweighted_50_50']['ci_95'][0]:.2f} to {orientation['reweighted_50_50']['ci_95'][1]:.2f}. This is not a causal counterfactual, because the theist-CON and theist-PRO debates differ in more than side placement. It is a transparent measure of how much the observed orientation imbalance matters.",
            styles["body"],
        ),
        callout(
            "Interpretation",
            "The raw side gap partly republishes an already known substantive-position gap under a new label. Treating it as an independent debate-role effect would count the same structure twice.",
            styles,
            fill=GOLD_LIGHT,
            accent=GOLD,
        ),
        PageBreak(),
    ])

    # 9. Outside set
    story.extend([
        Paragraph("Outside the classified set, the CON estimate is small and uncertain", styles["h1"]),
        Paragraph(
            "Removing the 169 previously classified theist-versus-non-theist debates leaves 44 assessments spanning morality, free will, consciousness, personal identity, origins, history, intra-religious disputes, and other topics. In this remainder, CON leads by 1.20 points rather than 4.69.",
            styles["body"],
        ),
        metric_strip(
            [
                ("+1.20", "mean CON-minus-PRO"),
                ("-0.34 to +2.75", "95% bootstrap interval"),
                ("24 / 17 / 3", "CON / PRO / tied"),
            ],
            styles,
        ),
        Spacer(1, 12),
        Paragraph(
            "The exact sign test among the 41 non-tied debates gives p = 0.349. That does not prove the true role effect is zero; the sample is compatible with a modest CON advantage or disadvantage. It does show that the strong four-to-six-point claim is not reproduced once the main known proposition alignment is removed.",
            styles["body"],
        ),
        data_table(
            ["Sample", "Debates", "Mean CON-PRO", "95% interval", "Direction"],
            [
                ["All comparable", "213", "+4.69", "+3.78 to +5.62", "159 CON / 46 PRO / 8 ties"],
                ["Classified theist/non-theist", "169", "+5.60", "+4.57 to +6.64", "135 / 29 / 5"],
                ["Outside classified set", "44", "+1.20", "-0.34 to +2.75", "24 / 17 / 3"],
            ],
            [128, 52, 82, 94, 110],
            styles,
            first_bold=True,
        ),
        Spacer(1, 10),
        callout(
            "Important qualification",
            "The 44-debate remainder is not a clean randomized control group or a complete topic taxonomy. It is a sensitivity analysis showing that the headline side gap is concentrated in the previously identified substantive comparison.",
            styles,
        ),
        PageBreak(),
    ])

    # 10. Crossover speakers
    story.extend([
        Paragraph("Holding speaker identity more nearly fixed shrinks the gap again", styles["h1"]),
        Paragraph(
            "Twenty-nine canonical speakers appear at least once on PRO and at least once on CON, contributing 187 appearances. For each speaker, the analysis compares that speaker's mean CON score with the same speaker's mean PRO score, then weights speakers equally. The resulting difference is +1.00 point, not +4.69.",
            styles["body"],
        ),
        crossover_speaker_chart(speakers),
        Paragraph(
            "<i>Figure 7. Crossover-speaker differences are heterogeneous and occur on both sides of zero. The equal-speaker 95% interval is -0.34 to +2.30; the exact sign test is p = 0.136.</i>",
            styles["caption"],
        ),
        Paragraph(
            "A weighted within-speaker fixed-effect estimate is +0.98 points, with a 95% speaker-bootstrap interval from -0.23 to +2.13. After centering the known assessment-generation difference, it is +1.06 with an interval from approximately 0.00 to +2.13. These specifications consistently leave open a small residual while rejecting the idea that stable speaker identity is irrelevant.",
            styles["body"],
        ),
        Paragraph(
            "The bridge is still observational. Several speakers have one appearance on one side and many on the other; their topics, opponents, and career stages differ. Its proper conclusion is not that the role effect is exactly zero, but that most of the raw 4.69-point gap does not survive a basic speaker control.",
            styles["body"],
        ),
        PageBreak(),
    ])

    # 11. Dimension profile
    story.extend([
        Paragraph("The raw side gap is broad across the rubric, then narrows outside the main subset", styles["h1"]),
        Paragraph(
            "Across all 213 debates, CON leads on every move-level dimension. The largest paired debate differences are calibration and charity (+6.93), evidence and warrant (+6.08), and logical coherence (+5.24). Relevance and burden is much closer at +0.68.",
            styles["body"],
        ),
        dimension_chart(dimensions),
        Paragraph(
            "<i>Figure 8. Filled blue dots show all-debate paired gaps and bootstrap intervals. Open rust circles show point estimates in the 44 debates outside the classified set. Most outside-set estimates move close to zero; calibration and charity remains the clearest residual.</i>",
            styles["caption"],
        ),
        Paragraph(
            "This broad pattern argues against one narrow rubric switch that mechanically awards points to opposition. If the label CON directly triggered a relevance or rebuttal bonus, relevance and burden or responsiveness would be natural candidates for the dominant gap. Instead, the largest differences concern evidence, coherence, and epistemic calibration - dimensions already implicated in the substantive theist/non-theist analyses.",
            styles["body"],
        ),
        callout(
            "Descriptive, not independent causal evidence",
            "Overall scores are built from the same underlying judged moves and dimensions. The dimension analysis locates the published difference; it does not independently prove what caused it.",
            styles,
            fill=RUST_LIGHT,
            accent=RUST,
        ),
        PageBreak(),
    ])

    # 12. Identification ladder
    ladder_rows = [
        short_estimate(estimates[0], "Raw all-debate estimate"),
        short_estimate(estimates[3], "Classified set"),
        short_estimate(orientation["reweighted_50_50"], "Classified, 50/50 reweighted"),
        short_estimate(estimates[6], "Outside classified set"),
        short_estimate(bridge["equal_speaker_weight_raw"], "Crossover speakers, equal weight"),
        {
            "short_label": "Within-speaker fixed effect",
            **bridge["weighted_fixed_effects"]["raw_weighted_fixed_effect"],
        },
        {
            "short_label": "Within-speaker, generation adjusted",
            **bridge["weighted_fixed_effects"]["generation_adjusted_weighted_fixed_effect"],
        },
    ]
    story.extend([
        Paragraph("The estimate falls as proposition and speaker composition are addressed", styles["h1"]),
        Paragraph(
            "The raw estimate is not wrong; it answers a different question. Moving down the identification ladder replaces the broad catalogue comparison with narrower comparisons that better address position imbalance or stable speaker identity. Every such step sharply reduces the estimated CON advantage.",
            styles["body"],
        ),
        forest_chart(
            "Identification and sensitivity ladder",
            "CON-minus-PRO point estimates and 95% intervals; reweighting is descriptive, not causal",
            ladder_rows,
            -2,
            8,
            425,
            label_width=188,
        ),
        Paragraph(
            "<i>Figure 9. The strongest uncontrolled estimates are 4.69 to 5.60 points. The proposition-balanced and speaker-controlled estimates cluster around one to two points, and most intervals include zero.</i>",
            styles["caption"],
        ),
        Paragraph(
            "No single row is the true causal answer. The reweighted estimate assumes the two theist-orientation strata are meaningfully exchangeable; the outside-set estimate omits the dominant category but leaves other selection; the speaker estimates hold identity fixed but not topics or opponents. Their convergence is nevertheless informative: the data repeatedly weaken the inherent-role interpretation as major composition differences are reduced.",
            styles["body"],
        ),
        PageBreak(),
    ])

    # 13. Counterexamples
    story.extend([
        Paragraph("Substantial wins occur on both nominal sides outside the main confound", styles["h1"]),
        Paragraph(
            "A formal side advantage is probabilistic, not deterministic, so counterexamples alone cannot refute it. They can, however, prevent the raw average from being misread as an iron rule. In the 44-debate remainder, PRO records advantages as large as 14 points and CON advantages as large as 14 points.",
            styles["body"],
        ),
        counterexample_chart(counterexamples),
        Paragraph(
            "<i>Figure 10. The five largest margins in each direction outside the previously classified set. Debate numbers permit direct audit against the published scorecards.</i>",
            styles["caption"],
        ),
        Paragraph(
            "The largest PRO advantage is Lance Bush over Matt McAllister on moral anti-realism versus realism, 90 to 76. The largest CON advantage is Matt Dillahunty over Jaime Hernandez on the soul, 82 to 68. These cases differ in motion, evidence, speaker, opponent, and topic. That is the central identification problem in miniature: nominal side never varies alone.",
            styles["body"],
        ),
        callout(
            "Audit implication",
            "Readers should evaluate side effects through paired redesigns or matched content, not by treating PRO and CON as if they were randomly assigned demographic groups.",
            styles,
            fill=TEAL_LIGHT,
            accent=TEAL,
        ),
        PageBreak(),
    ])

    # 14. Methods
    story.extend([
        Paragraph("Methods and robustness checks", styles["h1"]),
        Paragraph("Analysis steps", styles["h2"]),
        bullet("Normalize all 213 tracked assessment ledgers through Debate 229 into one side-score and move-dimension schema; retain one canonical speaker per side.", styles),
        bullet("Compute one paired CON-minus-PRO overall-score difference per debate. Report means, medians, direction counts, standardized paired differences, and exact sign tests.", styles),
        bullet("Resample debates 20,000 times for primary and stratum confidence intervals. Preserve pairing by resampling whole debates rather than independent side scores.", styles),
        bullet("Reuse the previously established 169-debate theist/non-theist classification without changing its membership to fit the present result.", styles),
        bullet("Separate the 149 theist-PRO and 20 theist-CON debates; calculate a transparent 50/50 orientation reweighting as a sensitivity check.", styles),
        bullet("Construct a canonical 29-speaker crossover bridge, using both equal-speaker mean differences and an appearance-weighted within-speaker coefficient.", styles),
        bullet("Center scores on assessment-generation means as a bridge sensitivity check; do not treat centering as full score calibration.", styles),
        bullet("Compute six move-dimension gaps within each debate, then average those paired gaps and bootstrap at the debate level.", styles),
        Paragraph("Robustness summary", styles["h2"]),
        data_table(
            ["Check", "Result", "Interpretive value"],
            [
                ["Earlier generation", "+4.94; interval excludes zero", "Raw association is not generation-specific"],
                ["Later generation", "+3.41; interval excludes zero", "Association recurs under later protocol"],
                ["Theist position moves to CON", "-3.15", "Simple role-only sign reverses"],
                ["Outside classified set", "+1.20; interval crosses zero", "Dominant proposition confound removed"],
                ["Equal crossover speakers", "+1.00; interval crosses zero", "Stable identity sharply reduces estimate"],
                ["Generation-adjusted fixed effect", "+1.06; lower bound approximately zero", "Known score-era shift is not driving bridge"],
            ],
            [142, 118, 188],
            styles,
            first_bold=True,
        ),
        PageBreak(),
    ])

    # 15. Limits and next test
    story.extend([
        Paragraph("Limitations, uncertainty, and the decisive next test", styles["h1"]),
        data_table(
            ["Limitation", "Why it matters"],
            [
                ["No random side assignment", "Formal role is confounded with proposition, speaker, opponent, and motion wording"],
                ["No polarity-reversed transcripts", "The same argument is never scored under both labels"],
                ["Incomplete proposition taxonomy", "The 44-debate remainder still combines many unlike topics"],
                ["Only 29 crossover speakers", "Within-speaker estimates are less precise and role counts are often unbalanced"],
                ["Two assessment generations", "Absolute move-dimension values are not perfectly uniform across the corpus"],
                ["AI-assisted scorecards", "All estimates inherit judgment error and may change under future reassessment"],
                ["One website corpus", "Results do not generalize automatically to formal debate tournaments or persuasion"],
            ],
            [156, 292],
            styles,
            first_bold=True,
        ),
        Spacer(1, 9),
        Paragraph("Pre-registered polarity-reversal experiment", styles["h2"]),
        bullet("Select balanced motions from several topics before examining new scores.", styles),
        bullet("Create logically equivalent affirmative and negative phrasings while preserving the substantive claim and evidence.", styles),
        bullet("Blind the scorer to the study hypothesis and randomize whether otherwise identical material is marked PRO or CON.", styles),
        bullet("Use one locked model, rubric, move inventory, and adjudication process for every paired version.", styles),
        bullet("Estimate the residual label coefficient with debate-content and speaker identity held fixed.", styles),
        Paragraph(
            "A persistent positive CON coefficient in that design would support a formal-role or scoring-label effect. A near-zero coefficient would support the present compositional account. Until that experiment exists, the right conclusion is evidential restraint rather than either declaring a CON bias or declaring that no such bias is possible.",
            styles["body"],
        ),
        Paragraph("Further questions", styles["h2"]),
        bullet("Does the roughly one-point residual persist when identical content is polarity-reversed under one locked assessment generation?", styles),
        bullet("How much additional reduction follows from a complete proposition taxonomy and explicit matching on topic, opponent strength, and motion wording?", styles),
        callout(
            "Renewal policy",
            "Rerun this analysis after the planned roughly twice-yearly corpus reassessments as AI models permit more accurate, consistent, and objective judgments. The raw and controlled estimates should be compared across reruns rather than silently overwritten.",
            styles,
            fill=GOLD_LIGHT,
            accent=GOLD,
        ),
        PageBreak(),
    ])

    # 16. Conclusion
    story.extend([
        Paragraph("Conclusion: the CON advantage belongs to this corpus, not yet to the formal role", styles["h1"]),
        Paragraph(
            "<b>The raw result is strong: CON scores 4.69 points higher on average and finishes ahead in 159 of 213 comparable assessments through Debate 229. Any honest description of the current Slugfester corpus should report that pattern plainly.</b>",
            styles["conclusion"],
        ),
        Paragraph(
            "The explanatory question has a different answer. PRO and CON are not randomly assigned shells. They carry systematically different propositions, speakers, topics, and burdens. The most consequential imbalance is visible in the already classified theist/non-theist subset: 149 of 169 theist positions occupy PRO. When the theist position moves to CON, the nominal CON advantage becomes a 3.15-point disadvantage. A role effect that changes sign with the proposition is not well described as inherent to the role.",
            styles["body"],
        ),
        Paragraph(
            "The remaining checks reinforce that diagnosis. Outside the 169-debate set, the estimate shrinks to 1.20 points and becomes statistically uncertain. Among 29 speakers who have occupied both sides, it shrinks to 1.00; weighted and generation-adjusted within-speaker estimates remain near one point and include or nearly include zero. The six-dimension profile also narrows sharply outside the dominant substantive subset.",
            styles["body"],
        ),
        Paragraph(
            "These controls do not prove that the true formal-role effect is exactly zero. They establish something more important for current interpretation: the 4.69-point raw difference cannot responsibly be presented as that effect. Most of its evidential force dissolves when major composition differences are reduced, and the only design capable of isolating the label or role - randomized polarity reversal of matched content - has not yet been run.",
            styles["body"],
        ),
        callout(
            "Strongest salient conclusion",
            "<b>CON's published advantage is a property of who and what the current corpus places on CON.</b> It is not evidence that mere opposition is intrinsically superior, that Slugfester awards a hidden bonus to rebuttal, or that changing an argument's side label would improve its score. The disciplined interpretation is compositional until a controlled polarity-reversal test shows otherwise.",
            styles,
            fill=GOLD_LIGHT,
            accent=GOLD,
        ),
        Paragraph("Recommended public interpretation", styles["h2"]),
        bullet("Continue using PRO and CON as navigation labels, not ability or burden categories.", styles),
        bullet("When publishing corpus-wide side summaries, place the 4.69-point raw gap beside the position and speaker controls.", styles),
        bullet("Do not describe the raw gap as a causal affirmative penalty or opposition bonus.", styles),
        bullet("Pre-register and run matched polarity-reversal tests under one assessment generation.", styles),
        bullet("Reassess the result on the site's roughly twice-yearly renewal cycle.", styles),
        Spacer(1, 6),
        SectionRule(color=TEAL),
        Spacer(1, 6),
        Paragraph(
            "<b>Recommended citation:</b> SLUGFESTER. <i>Does the CON Side Have an Inherent Advantage? Why a 4.69-Point Raw Gap Is Real but Does Not Establish a Formal-Role or Scoring-Label Bias.</i> Corpus-level analysis report, September 1, 2026.",
            styles["caption"],
        ),
    ])
    return story


def build_pdf() -> Path:
    base.register_fonts()
    styles = base.make_styles()
    with RESULTS_PATH.open(encoding="utf-8") as handle:
        results = json.load(handle)
    debates = load_csv(
        DEBATES_PATH,
        {"number", "pro_score", "con_score", "con_minus_pro"},
    )
    speakers = load_csv(
        SPEAKERS_PATH,
        {
            "appearances",
            "pro_appearances",
            "con_appearances",
            "pro_score",
            "con_score",
            "con_minus_pro",
            "pro_generation_adjusted_score",
            "con_generation_adjusted_score",
            "generation_adjusted_con_minus_pro",
        },
    )
    counterexamples = load_csv(
        COUNTEREXAMPLES_PATH,
        {"number", "pro_score", "con_score", "con_minus_pro"},
    )

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
        title="Does the CON Side Have an Inherent Advantage?",
        author="SLUGFESTER",
        subject="Corpus-level analysis of nominal debate side, substantive position assignment, and speaker controls",
        creator="SLUGFESTER corpus-level analysis pipeline",
    )
    doc.addPageTemplates(
        [
            PageTemplate(id="cover", frames=[frame], onPage=first_page, autoNextPageTemplate="body"),
            PageTemplate(id="body", frames=[frame], onPage=later_page),
        ]
    )
    doc.build(build_story(results, debates, speakers, counterexamples, styles))
    return OUTPUT_PATH


if __name__ == "__main__":
    print(build_pdf())
