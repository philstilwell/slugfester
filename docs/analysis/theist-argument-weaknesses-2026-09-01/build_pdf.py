#!/usr/bin/env python3
"""Build the comprehensive PDF defense of the epistemic bleed-through hypothesis."""

from __future__ import annotations

import json
import math
from pathlib import Path

from reportlab import rl_config
from reportlab.graphics import shapes as graphics_shapes
from reportlab.graphics.shapes import Drawing, Line, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import tables as platypus_tables
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
ANALYSIS_DIR = Path(__file__).resolve().parent
RESULTS_PATH = ANALYSIS_DIR / "results.json"
BASE_RESULTS_PATH = REPO_ROOT / "docs/analysis/non-theist-vs-theist-2026-09-01/results.json"
OUTPUT_PATH = REPO_ROOT / "output/pdf/why-do-the-theist-sides-score-lower.pdf"

FONT_DIR = Path("/System/Library/Fonts/Supplemental")
FONT_FILES = {
    "SLUGSans": FONT_DIR / "Arial.ttf",
    "SLUGSans-Bold": FONT_DIR / "Arial Bold.ttf",
    "SLUGSans-Italic": FONT_DIR / "Arial Italic.ttf",
    "SLUGSans-BoldItalic": FONT_DIR / "Arial Bold Italic.ttf",
}

NAVY = colors.HexColor("#12233F")
BLUE = colors.HexColor("#276AA8")
BLUE_DARK = colors.HexColor("#1F568A")
BLUE_LIGHT = colors.HexColor("#DCEAF6")
TEAL = colors.HexColor("#21857C")
TEAL_LIGHT = colors.HexColor("#DDF1EE")
RUST = colors.HexColor("#B4553D")
RUST_LIGHT = colors.HexColor("#F6E5DF")
GOLD = colors.HexColor("#D39B2A")
INK = colors.HexColor("#263448")
MUTED = colors.HexColor("#64748B")
RULE = colors.HexColor("#D7DEE8")
PAPER = colors.HexColor("#F5F7FA")
WHITE = colors.white

PAGE_W, PAGE_H = letter
LEFT = 0.68 * inch
RIGHT = 0.68 * inch
TOP = 0.70 * inch
BOTTOM = 0.62 * inch
CONTENT_W = PAGE_W - LEFT - RIGHT


def register_fonts() -> None:
    for name, path in FONT_FILES.items():
        if not path.exists():
            raise FileNotFoundError(f"Required embeddable font is missing: {path}")
        pdfmetrics.registerFont(TTFont(name, str(path)))
    pdfmetrics.registerFontFamily(
        "SLUGSans",
        normal="SLUGSans",
        bold="SLUGSans-Bold",
        italic="SLUGSans-Italic",
        boldItalic="SLUGSans-BoldItalic",
    )
    # ReportLab otherwise emits unused Helvetica and Times-Roman font resources
    # when it initializes a page canvas and a vector drawing. Point those
    # defaults at the embedded family as well so every declared PDF font is
    # embedded, not merely every visible glyph.
    rl_config.canvas_basefontname = "SLUGSans"
    graphics_shapes.STATE_DEFAULTS["fontName"] = "SLUGSans"
    platypus_tables._baseFontName = "SLUGSans"
    platypus_tables.CellStyle.fontname = "SLUGSans"


def styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "cover_kicker": ParagraphStyle(
            "cover_kicker",
            parent=base["Normal"],
            fontName="SLUGSans-Bold",
            fontSize=8.5,
            leading=11,
            textColor=BLUE,
            spaceAfter=12,
            tracking=1.1,
        ),
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base["Title"],
            fontName="SLUGSans-Bold",
            fontSize=27,
            leading=30,
            textColor=NAVY,
            alignment=TA_LEFT,
            spaceAfter=10,
        ),
        "cover_subtitle": ParagraphStyle(
            "cover_subtitle",
            parent=base["Normal"],
            fontName="SLUGSans",
            fontSize=14,
            leading=18,
            textColor=BLUE_DARK,
            spaceAfter=18,
        ),
        "cover_abstract": ParagraphStyle(
            "cover_abstract",
            parent=base["BodyText"],
            fontName="SLUGSans",
            fontSize=9.4,
            leading=13.2,
            textColor=INK,
            spaceAfter=8,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Heading1"],
            fontName="SLUGSans-Bold",
            fontSize=18,
            leading=22,
            textColor=NAVY,
            spaceBefore=4,
            spaceAfter=9,
            keepWithNext=True,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Heading2"],
            fontName="SLUGSans-Bold",
            fontSize=13,
            leading=16,
            textColor=BLUE_DARK,
            spaceBefore=7,
            spaceAfter=5,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["BodyText"],
            fontName="SLUGSans",
            fontSize=9.25,
            leading=13.1,
            textColor=INK,
            spaceAfter=6,
            allowWidows=0,
            allowOrphans=0,
        ),
        "body_small": ParagraphStyle(
            "body_small",
            parent=base["BodyText"],
            fontName="SLUGSans",
            fontSize=8.1,
            leading=10.8,
            textColor=INK,
            spaceAfter=4,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=base["BodyText"],
            fontName="SLUGSans",
            fontSize=9.1,
            leading=12.6,
            leftIndent=13,
            firstLineIndent=-8,
            bulletIndent=0,
            textColor=INK,
            spaceAfter=4,
        ),
        "caption": ParagraphStyle(
            "caption",
            parent=base["Normal"],
            fontName="SLUGSans-Italic",
            fontSize=7.6,
            leading=10,
            textColor=MUTED,
            spaceBefore=3,
            spaceAfter=8,
        ),
        "callout_title": ParagraphStyle(
            "callout_title",
            parent=base["Normal"],
            fontName="SLUGSans-Bold",
            fontSize=9.5,
            leading=12,
            textColor=NAVY,
            spaceAfter=3,
        ),
        "callout_body": ParagraphStyle(
            "callout_body",
            parent=base["BodyText"],
            fontName="SLUGSans",
            fontSize=8.8,
            leading=12.2,
            textColor=INK,
        ),
        "metric": ParagraphStyle(
            "metric",
            parent=base["Normal"],
            fontName="SLUGSans-Bold",
            fontSize=20,
            leading=22,
            textColor=NAVY,
            alignment=TA_CENTER,
            spaceAfter=2,
        ),
        "metric_label": ParagraphStyle(
            "metric_label",
            parent=base["Normal"],
            fontName="SLUGSans",
            fontSize=7.8,
            leading=10.2,
            textColor=INK,
            alignment=TA_CENTER,
        ),
        "table_header": ParagraphStyle(
            "table_header",
            parent=base["Normal"],
            fontName="SLUGSans-Bold",
            fontSize=7.6,
            leading=9.3,
            textColor=WHITE,
        ),
        "table_cell": ParagraphStyle(
            "table_cell",
            parent=base["Normal"],
            fontName="SLUGSans",
            fontSize=7.6,
            leading=9.5,
            textColor=INK,
        ),
        "table_cell_bold": ParagraphStyle(
            "table_cell_bold",
            parent=base["Normal"],
            fontName="SLUGSans-Bold",
            fontSize=7.6,
            leading=9.5,
            textColor=INK,
        ),
        "case_title": ParagraphStyle(
            "case_title",
            parent=base["Normal"],
            fontName="SLUGSans-Bold",
            fontSize=9.2,
            leading=11.3,
            textColor=NAVY,
            spaceAfter=3,
        ),
        "case_meta": ParagraphStyle(
            "case_meta",
            parent=base["Normal"],
            fontName="SLUGSans-Italic",
            fontSize=7.5,
            leading=9.4,
            textColor=MUTED,
            spaceAfter=4,
        ),
    }


class SectionRule(Flowable):
    def __init__(self, width: float, color=BLUE, thickness: float = 2.5):
        super().__init__()
        self.width = width
        self.height = 7
        self.color = color
        self.thickness = thickness

    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.rect(0, 4, self.width, self.thickness, stroke=0, fill=1)


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text, style)


def bullet(text: str, st: dict[str, ParagraphStyle]) -> Paragraph:
    return Paragraph(f"- {text}", st["bullet"])


def callout(title: str, body: str, st: dict[str, ParagraphStyle], *, background=BLUE_LIGHT, accent=BLUE) -> Table:
    inner = [p(title, st["callout_title"]), p(body, st["callout_body"])]
    table = Table([[inner]], colWidths=[CONTENT_W], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background),
                ("BOX", (0, 0), (-1, -1), 0.6, accent),
                ("LINEBEFORE", (0, 0), (0, -1), 4, accent),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]
        )
    )
    return table


def metric_card(value: str, label: str, st: dict[str, ParagraphStyle]) -> list[Paragraph]:
    return [p(value, st["metric"]), p(label, st["metric_label"])]


def metric_grid(st: dict[str, ParagraphStyle]) -> Table:
    data = [
        [
            metric_card("6.35", "mean non-theist score advantage", st),
            metric_card("61.5%", "theist moves below 70 on evidence", st),
        ],
        [
            metric_card("72.8%", "theist moves rated overstated", st),
            metric_card("55.7%", "theist replies with strong target contact", st),
        ],
    ]
    table = Table(data, colWidths=[CONTENT_W / 2 - 5, CONTENT_W / 2 - 5], rowHeights=[0.78 * inch, 0.78 * inch], hAlign="CENTER")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PAPER),
                ("BOX", (0, 0), (-1, -1), 0.5, RULE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, RULE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def chart_label(d: Drawing, text: str, x: float, y: float, *, size=8.2, color=INK, anchor="start", bold=False):
    d.add(
        String(
            x,
            y,
            text,
            fontName="SLUGSans-Bold" if bold else "SLUGSans",
            fontSize=size,
            fillColor=color,
            textAnchor=anchor,
        )
    )


def dimension_chart(rows: list[dict]) -> Drawing:
    rows = sorted(rows, key=lambda row: row["score_gap_contribution"], reverse=True)
    width, height = CONTENT_W, 245
    d = Drawing(width, height)
    label_x, bar_x, bar_w = 148, 160, width - 204
    top, row_h, max_value = 210, 31, 2.0
    d.add(Rect(0, 0, width, height, fillColor=WHITE, strokeColor=None))
    chart_label(d, "Contribution to the 6.35-point gap", 0, height - 16, size=9.2, bold=True, color=NAVY)
    for tick in (0, 0.5, 1.0, 1.5, 2.0):
        x = bar_x + tick / max_value * bar_w
        d.add(Line(x, 18, x, top + 12, strokeColor=RULE, strokeWidth=0.45))
        chart_label(d, f"{tick:.1f}", x, 7, size=6.8, color=MUTED, anchor="middle")
    palette = [BLUE_DARK, BLUE, TEAL, colors.HexColor("#4E92C6"), GOLD, colors.HexColor("#8AA5BF")]
    for index, (row, fill) in enumerate(zip(rows, palette)):
        y = top - index * row_h
        value = row["score_gap_contribution"]
        chart_label(d, row["label"], label_x, y + 3, size=7.9, anchor="end")
        d.add(Rect(bar_x, y - 4, value / max_value * bar_w, 13, fillColor=fill, strokeColor=None))
        chart_label(d, f"{value:.2f}  ({row['share_of_official_gap']:.1%})", bar_x + value / max_value * bar_w + 5, y, size=7.1, color=NAVY, bold=True)
    return d


def paired_percent_chart(items: list[tuple[str, float, float]], title: str, *, height: float = 230, note: str | None = None) -> Drawing:
    width = CONTENT_W
    d = Drawing(width, height)
    label_x, bar_x, bar_w = 155, 166, width - 190
    top = height - 52
    row_h = (top - 24) / max(1, len(items))
    d.add(Rect(0, 0, width, height, fillColor=WHITE, strokeColor=None))
    chart_label(d, title, 0, height - 16, size=9.2, bold=True, color=NAVY)
    d.add(Rect(bar_x, height - 29, 9, 9, fillColor=RUST, strokeColor=None))
    chart_label(d, "Theist", bar_x + 13, height - 27, size=7.1)
    d.add(Rect(bar_x + 72, height - 29, 9, 9, fillColor=BLUE, strokeColor=None))
    chart_label(d, "Non-theist", bar_x + 85, height - 27, size=7.1)
    for tick in (0, 25, 50, 75, 100):
        x = bar_x + tick / 100 * bar_w
        d.add(Line(x, 18, x, top + 10, strokeColor=RULE, strokeWidth=0.4))
        chart_label(d, f"{tick}%", x, 7, size=6.7, color=MUTED, anchor="middle")
    for index, (label, theist, non) in enumerate(items):
        y = top - index * row_h
        chart_label(d, label, label_x, y + 2, size=7.7, anchor="end")
        d.add(Rect(bar_x, y + 2, theist * bar_w, 8, fillColor=RUST, strokeColor=None))
        d.add(Rect(bar_x, y - 9, non * bar_w, 8, fillColor=BLUE, strokeColor=None))
        chart_label(d, f"{theist:.1%}", bar_x + theist * bar_w + 4, y + 3, size=6.7, color=RUST, bold=True)
        chart_label(d, f"{non:.1%}", bar_x + non * bar_w + 4, y - 8, size=6.7, color=BLUE_DARK, bold=True)
    if note:
        chart_label(d, note, 0, 18, size=6.6, color=MUTED)
    return d


def subset_gap_chart(subsets: list[dict]) -> Drawing:
    wanted = [
        ("All scored moves", "All moves"),
        ("Constructive moves only", "Constructives"),
        ("Replies only", "Replies"),
        ("Load-bearing moves only", "Load-bearing"),
        ("Debates with theist side stored as con", "Theist stored as con"),
    ]
    lookup = {row["subset"]: row for row in subsets}
    items = [(short, lookup[name]["evidence_warrant_gap"]) for name, short in wanted]
    width, height = CONTENT_W, 220
    d = Drawing(width, height)
    label_x, bar_x, bar_w = 150, 161, width - 205
    top, row_h, max_value = 172, 29, 10.0
    d.add(Rect(0, 0, width, height, fillColor=WHITE, strokeColor=None))
    chart_label(d, "Evidence/warrant gap survives role and orientation checks", 0, height - 16, size=9.2, bold=True, color=NAVY)
    chart_label(d, "Dimension points: non-theist mean minus theist mean", 0, height - 30, size=6.9, color=MUTED)
    for tick in (0, 2, 4, 6, 8, 10):
        x = bar_x + tick / max_value * bar_w
        d.add(Line(x, 18, x, top + 10, strokeColor=RULE, strokeWidth=0.4))
        chart_label(d, str(tick), x, 7, size=6.7, color=MUTED, anchor="middle")
    for index, (label, value) in enumerate(items):
        y = top - index * row_h
        chart_label(d, label, label_x, y + 2, size=7.8, anchor="end")
        fill = TEAL if label != "Theist stored as con" else GOLD
        d.add(Rect(bar_x, y - 4, value / max_value * bar_w, 13, fillColor=fill, strokeColor=None))
        chart_label(d, f"{value:.2f}", bar_x + value / max_value * bar_w + 5, y, size=7, color=NAVY, bold=True)
    return d


def causal_chain_chart() -> Drawing:
    width, height = CONTENT_W, 120
    d = Drawing(width, height)
    d.add(Rect(0, 0, width, height, fillColor=WHITE, strokeColor=None))
    boxes = [
        ("Faith-permissive\nepistemic standards", RUST_LIGHT, RUST),
        ("Lower demand for\npublic warrant", colors.HexColor("#F8EED4"), GOLD),
        ("Inferential shortcuts\nand overclaiming", TEAL_LIGHT, TEAL),
        ("Lower evidence, logic,\nand response scores", BLUE_LIGHT, BLUE),
    ]
    gap = 16
    box_w = (width - gap * 3) / 4
    y, box_h = 39, 54
    for index, (label, background, accent) in enumerate(boxes):
        x = index * (box_w + gap)
        d.add(Rect(x, y, box_w, box_h, rx=4, ry=4, fillColor=background, strokeColor=accent, strokeWidth=0.8))
        lines = label.split("\n")
        for j, line in enumerate(lines):
            chart_label(d, line, x + box_w / 2, y + 31 - j * 12, size=7.4, color=NAVY, anchor="middle", bold=True)
        if index < len(boxes) - 1:
            ax = x + box_w
            d.add(Line(ax + 2, y + box_h / 2, ax + gap - 4, y + box_h / 2, strokeColor=MUTED, strokeWidth=1.2))
            d.add(Line(ax + gap - 8, y + box_h / 2 + 3, ax + gap - 4, y + box_h / 2, strokeColor=MUTED, strokeWidth=1.2))
            d.add(Line(ax + gap - 8, y + box_h / 2 - 3, ax + gap - 4, y + box_h / 2, strokeColor=MUTED, strokeWidth=1.2))
    chart_label(d, "The proposed explanatory chain", 0, height - 14, size=9.1, bold=True, color=NAVY)
    chart_label(d, "The data directly observe the final three links; the first link is the causal interpretation defended here.", 0, 12, size=6.8, color=MUTED)
    return d


def data_table(headers: list[str], rows: list[list], widths: list[float], st: dict[str, ParagraphStyle], *, aligns: dict[int, str] | None = None) -> Table:
    wrapped_headers = [p(header, st["table_header"]) for header in headers]
    wrapped_rows = []
    for row in rows:
        wrapped = []
        for index, value in enumerate(row):
            style = st["table_cell_bold"] if index == 0 else st["table_cell"]
            wrapped.append(value if isinstance(value, Flowable) else p(str(value), style))
        wrapped_rows.append(wrapped)
    table = Table([wrapped_headers, *wrapped_rows], colWidths=widths, repeatRows=1, hAlign="LEFT")
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("GRID", (0, 0), (-1, -1), 0.4, RULE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for row_index in range(1, len(wrapped_rows) + 1):
        if row_index % 2 == 0:
            commands.append(("BACKGROUND", (0, row_index), (-1, row_index), PAPER))
    if aligns:
        for column, align in aligns.items():
            commands.append(("ALIGN", (column, 1), (column, -1), align))
    table.setStyle(TableStyle(commands))
    return table


def section_heading(title: str, st: dict[str, ParagraphStyle]) -> list[Flowable]:
    return [SectionRule(CONTENT_W), p(title, st["h1"])]


def case_card(row: dict, st: dict[str, ParagraphStyle]) -> Table:
    meta = f"Debate {int(row['number'])} | {row['speaker']} | Importance {row['importance']} | Evidence {row['evidence_warrant']} | Logic {row['logical_coherence']}"
    content = [
        p(row["pattern"], st["case_title"]),
        p(meta, st["case_meta"]),
        p(f"<b>Claim:</b> {row['proposition']}", st["body_small"]),
        p(f"<b>Defect:</b> {row['diagnostic']}", st["body_small"]),
    ]
    table = Table([[content]], colWidths=[CONTENT_W], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PAPER),
                ("BOX", (0, 0), (-1, -1), 0.55, RULE),
                ("LINEBEFORE", (0, 0), (0, -1), 3, RUST),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def page_chrome(canvas, doc):
    canvas.saveState()
    canvas.setFont("SLUGSans", 7.3)
    canvas.setFillColor(MUTED)
    if doc.page > 1:
        canvas.drawString(LEFT, PAGE_H - 0.37 * inch, "WHY DO THE THEIST SIDES SCORE LOWER?")
        canvas.setStrokeColor(RULE)
        canvas.setLineWidth(0.5)
        canvas.line(LEFT, PAGE_H - 0.44 * inch, PAGE_W - RIGHT, PAGE_H - 0.44 * inch)
    canvas.setStrokeColor(RULE)
    canvas.line(LEFT, 0.43 * inch, PAGE_W - RIGHT, 0.43 * inch)
    canvas.drawString(LEFT, 0.25 * inch, "SLUGFESTER | Epistemic bleed-through hypothesis")
    canvas.drawRightString(PAGE_W - RIGHT, 0.25 * inch, f"{doc.page}")
    canvas.restoreState()


def build_story(results: dict, base_results: dict, st: dict[str, ParagraphStyle]) -> list[Flowable]:
    primary = results["primary"]
    dimensions = results["dimension_decomposition"]
    evidence = results["evidence_bands"]
    subsets = results["subset_checks"]
    legacy = results["legacy_closed_findings"]
    epistemic_core_labels = {
        "Logical coherence",
        "Evidence and warrant",
        "Responsiveness",
        "Calibration and charity",
    }
    epistemic_core_points = sum(
        row["score_gap_contribution"]
        for row in dimensions
        if row["label"] in epistemic_core_labels
    )
    epistemic_core_share = epistemic_core_points / primary["mean_margin"]
    story: list[Flowable] = []

    # Cover
    story.extend(
        [
            Spacer(1, 0.34 * inch),
            p("SLUGFESTER CORPUS DIAGNOSTIC | SEPTEMBER 2026", st["cover_kicker"]),
            p("Why Do the Theist Sides Score Lower?", st["cover_title"]),
            p("A Defense of the Epistemic Bleed-Through Hypothesis", st["cover_subtitle"]),
            SectionRule(CONTENT_W, color=RUST, thickness=3.5),
            Spacer(1, 0.08 * inch),
            callout(
                "Hypothesis defended",
                "The theist-side disadvantage is best explained, in substantial part, by the migration of faith-permissive epistemic standards into public argument: conclusions are accepted with less independent warrant, weaker comparison with alternatives, and less calibration than the debate rubric requires.",
                st,
                background=RUST_LIGHT,
                accent=RUST,
            ),
            Spacer(1, 0.18 * inch),
            metric_grid(st),
            Spacer(1, 0.18 * inch),
            p(
                "This report defends the hypothesis through a preregistered-style prediction test. The hypothesis does not merely predict lower totals. It predicts a distinctive cluster: weak evidence and warrant, strong conclusions relative to support, shortcuts from explanatory gaps to divine conclusions, incomplete engagement with alternatives, and persistence after role and side-order checks. The 169-debate, 3,502-move record matches that cluster.",
                st["cover_abstract"],
            ),
            p(
                "The defense is an inference to the best explanation, not an experimental proof of private motive. It argues that epistemic bleed-through explains the observed pattern better than the principal rival explanations currently available.",
                st["cover_abstract"],
            ),
            Spacer(1, 0.12 * inch),
            p("Prepared from the locked SLUGFESTER assessment ledgers and corrected position taxonomy.", st["caption"]),
            PageBreak(),
        ]
    )

    # Executive summary
    story.extend(section_heading("Executive argument", st))
    story.append(
        callout(
            "Verdict",
            "The data strongly support the narrower causal model proposed by the hypothesis: theist-side arguments are penalized not mainly for irrelevance, style, or side placement, but because they more often ask the public argument to carry conclusions that the supplied evidence and inferential bridges do not sustain.",
            st,
            background=TEAL_LIGHT,
            accent=TEAL,
        )
    )
    story.append(Spacer(1, 8))
    for text in [
        "<b>Prediction 1 - substantiation deficit:</b> evidence/warrant contributes 1.71 points, or 27.0%, of the 6.35-point score gap. Theist moves fall below 70 on evidence 61.5% of the time, versus 23.3% for non-theist moves.",
        "<b>Prediction 2 - inferential overreach:</b> logical coherence is the largest component at 1.81 points. The lower scores record missing bridges, false alternatives, scope jumps, and movement from possibility or explanatory difficulty to probability.",
        "<b>Prediction 3 - poor calibration:</b> 72.8% of theist moves are rated at least slightly overstated relative to warrant, versus 40.4%. Material or radical overstatement is 36.3% versus 10.0%.",
        "<b>Prediction 4 - weaker treatment of live alternatives:</b> strong target contact occurs in 55.7% of theist replies versus 79.0% of non-theist replies; tested low-charity ratings are also much more common.",
        "<b>Prediction 5 - persistence under controls:</b> the evidence gap remains in constructives, replies, load-bearing moves, and debates where the theist side is stored as con.",
    ]:
        story.append(bullet(text, st))
    story.append(Spacer(1, 5))
    story.append(dimension_chart(dimensions))
    story.append(p("Figure 1. Fixed-weight decomposition of the corrected paired overall margin. The six contributions plus a -0.06 rounding residual reproduce the 6.35-point gap.", st["caption"]))
    story.append(PageBreak())

    # Hypothesis and mechanism
    story.extend(section_heading("1. The hypothesis and its observable predictions", st))
    story.append(p(
        "The epistemic bleed-through hypothesis claims that faith is not contained within a private religious compartment. A permission structure learned inside faith - accepting testimony, experience, revelation, theological possibility, or inherited doctrine without the degree of public validation demanded elsewhere - can travel with the reasoner into a public debate. Once there, it appears as a lower threshold for treating a premise as established and a higher tolerance for gaps between premise and conclusion.",
        st["body"],
    ))
    story.append(p(
        "The relevant contrast is therefore not between people who use assumptions and people who do not. Every argument begins from some background commitments. The contrast concerns what must happen before those commitments may obligate an opponent. A private experience, sacred authority, or internally coherent doctrine can be a sincere reason for the believer while still failing as a public reason for someone who does not already accept the source. Bleed-through occurs when that difference is blurred and the personal license to believe is treated as though it were shared evidential entitlement.",
        st["body"],
    ))
    story.append(causal_chain_chart())
    story.append(p("Figure 2. The proposed causal chain. The score data directly measure public warrant, inference, calibration, response, and final performance. They do not directly measure the speaker's private faith psychology.", st["caption"]))
    story.append(p(
        "The hypothesis earns support only if the score disadvantage has the right internal structure. A generic worldview disadvantage could arise from topic selection, weak speakers, affirmative burdens, or evaluator preference. Epistemic bleed-through instead predicts a linked profile: claims will be relevant but under-supported; confidence will exceed warrant; alternatives will be treated incompletely; and negative difficulties for natural explanations will be converted too quickly into positive evidence for theism.",
        st["body"],
    ))
    story.append(p(
        "This makes the hypothesis more demanding than the loose observation that theists lose more often. It could have failed even if the overall score gap remained. For example, a gap concentrated in relevance would suggest misunderstanding of the motions; a gap confined to affirmative constructives would suggest burden asymmetry; and a gap produced by a few repeat speakers would suggest corpus composition. The evidential force comes from finding the specific pattern the mechanism predicts while those alternative patterns are weak or absent.",
        st["body"],
    ))
    story.append(p("Operational predictions", st["h2"]))
    for text in [
        "Theist moves should have lower evidence/warrant scores at roughly equal move counts.",
        "The deficit should be largest among high-importance moves, where the worldview's core commitments bear the most weight.",
        "Logical coherence and calibration should also suffer, because permissive support standards license stronger inferential transitions and conclusions.",
        "The pattern should survive comparisons within constructives and replies and should not vanish when the theist occupies the con side.",
        "Relevance/burden should be a relatively small contributor: the failure should concern evidential entitlement, not merely talking about the wrong topic.",
    ]:
        story.append(bullet(text, st))
    story.append(PageBreak())

    # Evidence gap
    story.extend(section_heading("2. The direct substantiation deficit", st))
    story.append(p(
        "The strongest direct evidence for the hypothesis is the evidence/warrant dimension itself. Under the rubric, a score from 50 through 69 means that assertion, anecdote, authority, selective examples, or speculation carries substantial argumentative weight. A score from 70 through 79 means that a material warrant or verification step remains compressed. These are not labels imposed after seeing the worldview comparison; they are the operational anchors used to score each move.",
        st["body"],
    ))
    evidence_items = [
        ("Below 50", evidence["theist"]["below_50_share"], evidence["non_theist"]["below_50_share"]),
        ("Below 70", evidence["theist"]["below_70_share"], evidence["non_theist"]["below_70_share"]),
        ("Below 80", evidence["theist"]["below_80_share"], evidence["non_theist"]["below_80_share"]),
    ]
    story.append(paired_percent_chart(evidence_items, "Evidence/warrant shortfall by side", height=220))
    story.append(p("Figure 3. Share of all scored moves below each evidence/warrant threshold. Side move counts are nearly equal: 1,746 theist and 1,756 non-theist moves.", st["caption"]))
    rows = [
        ["Theist/religious", "1,746", f"{evidence['theist']['mean']:.2f}", f"{evidence['theist']['below_70_share']:.1%}", f"{evidence['theist']['below_80_share']:.1%}"],
        ["Non-theist/skeptical", "1,756", f"{evidence['non_theist']['mean']:.2f}", f"{evidence['non_theist']['below_70_share']:.1%}", f"{evidence['non_theist']['below_80_share']:.1%}"],
    ]
    story.append(data_table(["Side", "Moves", "Mean evidence", "Below 70", "Below 80"], rows, [1.65 * inch, 0.68 * inch, 1.0 * inch, 0.86 * inch, 0.86 * inch], st, aligns={1: "RIGHT", 2: "RIGHT", 3: "RIGHT", 4: "RIGHT"}))
    story.append(Spacer(1, 7))
    story.append(p(
        "A score below 70 does not mean that a proposition is false. It means that the move has not supplied enough public warrant for the argumentative weight placed upon it. That distinction matters. The diagnosis is not that theists never cite facts, scholarship, or experience; it is that those materials more often remain one inferential step short of the conclusion. The missing step may be source independence, a likelihood comparison, a reason to exclude natural alternatives, or a justification for moving from possibility to probability.",
        st["body"],
    ))
    story.append(p(
        "The distribution also matters more than an isolated average. Nearly two thirds of theist moves fall below 70, compared with fewer than one quarter of non-theist moves. With almost identical move counts, this is not an artifact of one side having more arguments selected for analysis. It is a recurring difference in how much evidential work the chosen premises are able to perform.",
        st["body"],
    ))
    story.append(callout(
        "Why this supports bleed-through",
        "The pattern is not simply that theists lose more debates. Their moves repeatedly occupy the rubric bands reserved for conclusions carried by assertion, authority, anecdote, selective evidence, speculation, or a missing verification step. That is the empirical signature the hypothesis predicts.",
        st,
        background=RUST_LIGHT,
        accent=RUST,
    ))
    story.append(PageBreak())

    # Role checks
    story.extend(section_heading("3. The deficit survives the main burden controls", st))
    story.append(p(
        "The most important rival explanation is burden asymmetry. The theist side is pro in 149 of the 169 debates and therefore often presents the affirmative case. If the gap were merely the ordinary cost of carrying an affirmative burden, it should shrink sharply or disappear when comparisons are limited by move role or reversed side placement.",
        st["body"],
    ))
    story.append(subset_gap_chart(subsets))
    story.append(p("Figure 4. The evidence/warrant gap remains positive in every restricted comparison. The theist-con subset is smaller, so its 5.06-point estimate is less stable, but it does not reverse.", st["caption"]))
    subset_lookup = {row["subset"]: row for row in subsets}
    rows = []
    for name, short in [
        ("All scored moves", "All moves"),
        ("Constructive moves only", "Constructives"),
        ("Replies only", "Replies"),
        ("Load-bearing moves only", "Load-bearing"),
        ("Debates with theist side stored as con", "Theist stored as con"),
    ]:
        row = subset_lookup[name]
        rows.append([short, f"{row['evidence_warrant_gap']:.2f}", f"{row['theist_evidence_below_70_share']:.1%}", f"{row['non_theist_evidence_below_70_share']:.1%}"])
    story.append(data_table(["Comparison", "Evidence gap", "Theist below 70", "Non-theist below 70"], rows, [1.65 * inch, 0.9 * inch, 1.15 * inch, 1.25 * inch], st, aligns={1: "RIGHT", 2: "RIGHT", 3: "RIGHT"}))
    story.append(Spacer(1, 7))
    story.append(p(
        "The load-bearing comparison is especially damaging to the rival explanation. Importance-3 moves produce a 9.25-point evidence gap, larger than the all-move gap, and 61.1% of theist load-bearing moves fall below 70 versus 18.5% of non-theist load-bearing moves. The weakness therefore intensifies where the worldview's central argumentative commitments are most exposed.",
        st["body"],
    ))
    story.append(p(
        "The reversed-orientation check is equally important. When the theist side is stored as con, it can often win by showing that the affirmative has not met its burden; it need not construct a complete alternative worldview. Yet the evidence gap remains 5.06 points. The smaller subset warrants caution about the exact size, but its direction shows that the deficit is not created solely by asking theists to prove more. Constructives, replies, central moves, and reversed side placement all point the same way.",
        st["body"],
    ))
    story.append(PageBreak())

    # Logic and calibration
    story.extend(section_heading("4. The failure pattern is epistemic, not merely evidential", st))
    story.append(p(
        "Direct evidence weakness accounts for 27.0% of the score gap, but logical coherence accounts for slightly more: 28.6%. This is not double-counting. The rubric explicitly directs a missing fact or weak documentation to evidence/warrant and reserves logical deductions for a distinct inferential failure. The logic result therefore identifies a second layer: even when the premises are granted for argument's sake, the conclusion often does not follow with the asserted force.",
        st["body"],
    ))
    story.append(p("Recurring inferential forms", st["h2"]))
    for text in [
        "<b>Gap-to-agency:</b> a difficulty for a natural explanation is treated as positive evidence for intelligent or divine agency without discriminating predictions.",
        "<b>Possibility-to-probability:</b> showing that intervention, resurrection, objective value, or divine purpose is possible is treated as making it probable or necessary.",
        "<b>Compatibility-to-explanation:</b> showing that faith is compatible with science, meaning, or morality is treated as showing that faith explains or grounds them.",
        "<b>Limited-target-to-general-conclusion:</b> a criticism of one naturalistic account is broadened into the failure of naturalism or secular explanation generally.",
        "<b>Usefulness-to-truth:</b> religious consolation, social cohesion, personal enrichment, or moral motivation is allowed to support metaphysical truth without an independent bridge.",
    ]:
        story.append(bullet(text, st))
    structural_items = [
        ("Any overstatement", legacy["calibration"]["theist"]["any_overstatement_share"], legacy["calibration"]["non_theist"]["any_overstatement_share"]),
        ("Material/radical", legacy["calibration"]["theist"]["material_or_radical_overstatement_share"], legacy["calibration"]["non_theist"]["material_or_radical_overstatement_share"]),
        ("Strong reply contact", legacy["response_contact"]["theist"]["full_diagnostic_or_justified_reframe_share"], legacy["response_contact"]["non_theist"]["full_diagnostic_or_justified_reframe_share"]),
        ("Low charity when tested", legacy["charity"]["theist"]["below_70_share"], legacy["charity"]["non_theist"]["below_70_share"]),
    ]
    story.append(paired_percent_chart(structural_items, "Calibration, response, and treatment of alternatives", height=250, note="Higher is worse except for strong reply contact, where higher is better."))
    story.append(p("Figure 5. Closed subfield findings from 146 debates and 2,800 moves; reply contact uses 2,140 replies and charity uses 2,427 tested moves.", st["caption"]))
    story.append(p(
        "These findings show why 'needs more citations' is too shallow a diagnosis. Under-substantiation changes the rest of the argument. When weak support is treated as sufficient, conclusions are stated too strongly; when confidence is already high, rival explanations are less likely to receive their strongest formulation; and replies more often answer a convenient fragment instead of the opponent's load-bearing point. The evidence, logic, calibration, and response deficits are therefore not four unrelated complaints. They are the expected downstream expressions of the same permissive epistemic threshold.",
        st["body"],
    ))
    story.append(PageBreak())

    # Interpretation of structural findings
    story.extend(section_heading("5. Why the converging profile favors the hypothesis", st))
    story.append(p(
        "A single low dimension could have many explanations. The case for epistemic bleed-through rests on convergence. Theist arguments do not merely have fewer facts. They more often combine thin warrant with conclusions stronger than the warrant, incomplete treatment of the opponent's strongest route, and weaker representation of live alternatives. Those are mutually reinforcing failures of epistemic discipline.",
        st["body"],
    ))
    rows = []
    for row in sorted(dimensions, key=lambda item: item["score_gap_contribution"], reverse=True):
        rows.append([
            row["label"],
            f"{row['theist_mean']:.2f}",
            f"{row['non_theist_mean']:.2f}",
            f"{row['dimension_gap']:.2f}",
            f"{row['score_gap_contribution']:.2f}",
            f"{row['share_of_official_gap']:.1%}",
        ])
    story.append(data_table(["Dimension", "Theist", "Non-theist", "Raw gap", "Score contribution", "Share"], rows, [1.45 * inch, 0.66 * inch, 0.78 * inch, 0.68 * inch, 0.9 * inch, 0.62 * inch], st, aligns={1: "RIGHT", 2: "RIGHT", 3: "RIGHT", 4: "RIGHT", 5: "RIGHT"}))
    story.append(Spacer(1, 8))
    story.append(p(
        "Relevance and burden contributes only 0.21 points, or 3.3% of the gap. This is decisive for interpretation. The theist side is generally addressing the motion and its assigned burden. The disadvantage arises after contact with the right subject: in what is accepted as support, what is inferred from it, how confidently the result is stated, and whether the strongest alternatives are answered.",
        st["body"],
    ))
    story.append(p(
        f"The four dimensions most directly tied to epistemic discipline - evidence and warrant, logical coherence, responsiveness, and calibration and charity - contribute {epistemic_core_points:.2f} of the {primary['mean_margin']:.2f} points in the overall gap, or {epistemic_core_share:.1%}. That concentration gives the hypothesis explanatory specificity. It is not being rescued after the fact by counting every weakness as faith-related; the great majority of the measured disadvantage lies exactly where the proposed mechanism says it should lie.",
        st["body"],
    ))
    story.append(p(
        "Convergence is important because each measure constrains the interpretation of the others. Low evidence scores alone might reflect unusually difficult factual topics. Low response scores alone might reflect debate style. Overstatement alone might reflect rhetoric. Their repeated co-occurrence, together with a small relevance gap and persistence under role controls, identifies a more coherent pattern: the public standard of entitlement is too permissive, and the argument behaves accordingly at each later stage.",
        st["body"],
    ))
    story.append(callout(
        "The central inference",
        "A worldview-specific pattern concentrated in warrant, inference, calibration, and alternative handling - but not relevance - is more naturally explained by a difference in epistemic permission than by generic debating incompetence or topical mismatch.",
        st,
        background=TEAL_LIGHT,
        accent=TEAL,
    ))
    story.append(PageBreak())

    # Cases
    story.extend(section_heading("6. Representative locations of epistemic bleed-through", st))
    story.append(p(
        "The aggregate pattern is visible in concrete load-bearing moves. These examples are illustrative rather than a second prevalence estimate. They were selected because the ledger records make the missing epistemic bridge unusually explicit.",
        st["body"],
    ))
    for index, row in enumerate(results["examples"]):
        story.append(case_card(row, st))
        story.append(Spacer(1, 7))
        if index == 2:
            story.append(PageBreak())
            story.extend(section_heading("6. Representative locations, continued", st))
    story.append(p("What the cases jointly show", st["h2"]))
    story.append(p(
        "The subject matter changes across these examples - religious experience, origins, morality, cellular organization, and ultimate belief - but the argumentative defect is stable. In each case, the premise can make the theistic conclusion intelligible or compatible with what is observed. What it does not yet do is discriminate that conclusion from serious alternatives. The argument then treats intelligibility, compatibility, or an explanatory gap as though it supplied comparative confirmation.",
        st["body"],
    ))
    story.append(p(
        "That repeated substitution is the concrete form of bleed-through. A claim already regarded as permissible within the faith framework is not forced through the additional public tests that would show why an outsider should prefer it: independent verification, relative likelihood, risky prediction, exclusion of alternatives, or calibrated uncertainty. The result is not always an absurd argument. More often it is an incomplete argument presented with the confidence of a completed one.",
        st["body"],
    ))
    story.append(PageBreak())

    # Rival explanations
    story.extend(section_heading("7. Rival explanations and why they are insufficient", st))
    rival_rows = [
        ["Affirmative burden", "Theist is usually pro, so it must build more.", "The evidence gap persists within constructives and replies and remains 5.06 points when theist is con."],
        ["Topic or burden mismatch", "Theists may simply address harder or less relevant motions.", "Relevance/burden contributes only 0.21 points; the main deficits occur after the right issue is engaged."],
        ["A few dominant skeptics", "A handful of strong non-theists may create the result.", f"The prior corpus analysis still shows a {base_results['concentration']['without_top_four_non_theist_speakers']['mean_margin']:.2f}-point gap after removing the four most frequent non-theist speakers."],
        ["Unequal move inventory", "One side may have more selected arguments.", "Move counts are nearly equal: 1,746 theist moves and 1,756 non-theist moves."],
        ["Pure scoring-style bias", "The evaluator may simply prefer skeptical rhetoric.", "The gap appears across separately anchored dimensions and structural response classes, but human blind replication is still required to rule this out decisively."],
        ["Topic selection", "The catalogue may contain unusually difficult theist motions.", "This remains a genuine limitation. Role controls reduce but do not remove topic selection; a topic-matched audit is the next strongest test."],
    ]
    story.append(data_table(["Rival explanation", "What it predicts", "Assessment"], rival_rows, [1.22 * inch, 1.65 * inch, 3.27 * inch], st))
    story.append(Spacer(1, 8))
    story.append(p(
        "No single observational dataset eliminates every rival. The defense is cumulative: burden, role, relevance, inventory size, and repeated-speaker concentration each fail to explain the full pattern. Epistemic bleed-through accounts for both the direction and the internal structure of the difference with fewer auxiliary assumptions.",
        st["body"],
    ))
    story.append(p(
        "Some rivals may still contribute modestly. Theist motions may be harder on average, affirmative advocacy may impose costs, and the scoring system may retain preferences that blind human replication should test. But a contributing factor is not automatically the main explanation. To displace bleed-through, a rival must explain why the deficit is largest in warrant and inference, why it intensifies in load-bearing moves, why overstatement and weak reply contact accompany it, why relevance contributes so little, and why the gap survives the major role checks. None of the available rivals presently explains that full configuration.",
        st["body"],
    ))
    story.append(p(
        "The hypothesis is therefore supported comparatively, not merely because it can be made consistent with the observations. It earns preference because it anticipated the observations as a connected set. A lower public-validation threshold naturally produces weak substantiation, stronger-than-supported conclusions, less pressure to test alternatives, and replies that stop before the opponent's decisive route is fully met. One mechanism explains several otherwise separate score differences.",
        st["body"],
    ))
    story.append(PageBreak())

    # Causal status
    story.extend(section_heading("8. The causal status of the defense", st))
    story.append(p(
        "The score decomposition establishes a mechanical claim: theists score lower partly because the rubric assigns their moves lower evidence/warrant, logic, response, calibration/charity, and precision ratings. It also establishes a descriptive claim: the relevant defects are much more concentrated on the theist side. The final step - identifying faith-permissive standards as the source of those defects - is an inference to the best explanation.",
        st["body"],
    ))
    story.append(p(
        "An inference to the best explanation is not a guess inserted where direct measurement is absent. It compares candidate causes by asking which one predicted the observed pattern, fits the known mechanism, survives discriminating checks, and explains the most facts without special pleading. On those criteria, epistemic bleed-through is stronger than the alternatives currently available. The causal claim should remain revisable, but it is already evidentially asymmetric: the data fit it substantially better than they fit a neutral story in which worldview-specific standards play no role.",
        st["body"],
    ))
    story.append(callout(
        "What is directly established",
        "Under-substantiation, inferential overreach, overstatement, incomplete reply contact, and weaker treatment of alternatives are concentrated on the theist side and jointly produce the overall score gap.",
        st,
        background=BLUE_LIGHT,
        accent=BLUE,
    ))
    story.append(Spacer(1, 7))
    story.append(callout(
        "What is inferred",
        "The cluster is best explained by lower epistemic thresholds learned or licensed within faith-based reasoning and carried into public argument. This inference is strong because the cluster matches the hypothesis's distinctive predictions and survives the leading burden controls.",
        st,
        background=RUST_LIGHT,
        accent=RUST,
    ))
    story.append(Spacer(1, 7))
    story.append(callout(
        "What remains unproven",
        "The ledgers do not measure private belief formation, preparation, individual sincerity, or how the same speaker would reason under a different worldview. The evidence supports a corpus-level explanatory model, not a claim about every theist or a laboratory demonstration of personal causation.",
        st,
        background=PAPER,
        accent=MUTED,
    ))
    story.append(Spacer(1, 10))
    story.append(p(
        "This limitation does not reduce the defense to neutrality. Observational explanations are often justified by prediction, convergence, mechanism, and failure of rivals. The proper conclusion is therefore neither 'faith causation has been experimentally proven' nor 'the data say nothing about faith.' It is that epistemic bleed-through is the best-supported current explanation of the observed score structure and merits targeted causal testing.",
        st["body"],
    ))
    story.append(p(
        "The claim is also about argumentative practice, not intellectual worth. It does not imply that every theist reasons poorly, that non-theists are uniformly rigorous, or that religious claims are false by definition. It says something narrower and testable: in this corpus, the standards used to license theistic conclusions more often fail to supply the common evidential ground required to make those conclusions rationally compelling to an opponent.",
        st["body"],
    ))
    story.append(PageBreak())

    # Test design and recommendations
    story.extend(section_heading("9. A decisive next test", st))
    story.append(p(
        "A stronger test should examine the proposed causal link directly rather than merely repeat the side comparison. The key is to code the source and epistemic standard of each premise before raters know which side offered it.",
        st["body"],
    ))
    for text in [
        "Blind the side and speaker identity, then classify premise source: public empirical evidence, historical testimony, religious experience, scripture, intuition, conceptual necessity, or inference to the best explanation.",
        "Record the public validation supplied: independence, source reliability, base rates, rival likelihoods, risky predictions, falsification conditions, and uncertainty.",
        "Match moves by topic, constructive/reply role, importance, and burden tier before comparing warrant and calibration.",
        "Model speaker and debate as repeated sources so frequent participants do not receive artificial statistical weight.",
        "Reveal side only after coding and test whether faith-sourced premises predict lower evidence/warrant and greater overstatement after the controls.",
        "Have trained human raters repeat a stratified sample to test whether the AI-assisted dimension pattern replicates.",
    ]:
        story.append(bullet(text, st))
    story.append(Spacer(1, 7))
    story.append(callout(
        "Falsification condition",
        "The hypothesis would be weakened if blind premise-source coding showed no association between faith-sourced premises and lower public warrant after topic, role, speaker, and debate controls - or if human raters did not reproduce the score profile.",
        st,
        background=TEAL_LIGHT,
        accent=TEAL,
    ))
    story.append(p("Further questions", st["h2"]))
    for text in [
        "Is the effect strongest in religious experience, resurrection history, morality, cosmology, or design arguments?",
        "Do particular faith traditions or apologetic methods show different warrant and calibration profiles?",
        "Are historical and testimonial standards applied symmetrically to religious and nonreligious claims?",
        "Does the same speaker's epistemic profile change across religious and nonreligious topics?",
    ]:
        story.append(bullet(text, st))
    story.append(PageBreak())

    # Methodology
    story.extend(section_heading("10. Methodology and validation", st))
    story.append(p(
        "The analysis joins the corrected 169-debate position taxonomy to each debate's locked assessment ledger. It reconstructs or reads the six final move dimensions, checks every deterministic move score, importance-weights moves within sections, applies locked section weights, and calculates a paired non-theist-minus-theist dimension difference for each debate. The mean difference multiplied by each fixed rubric weight is the dimension's contribution to the overall score gap.",
        st["body"],
    ))
    validation_rows = [
        ["Classified debates", "169", "All have matching adapter ledgers"],
        ["Scored moves", "3,502", "1,746 theist; 1,756 non-theist"],
        ["Move-score checks", "3,502", "All match deterministic ledger output"],
        ["Side-section checks", "1,778", "All match; section weights sum to 100"],
        ["Side-overall checks", "338", "All match published scores"],
        ["Burden adjustments", "0 nonzero", "No residual adjustment drives the result"],
        ["Gap reconciliation", "Exact", "Six contributions plus -0.06 rounding residual = 6.3491"],
        ["Closed subfields", "146 debates", "Calibration, response class, precision, and charity"],
    ]
    story.append(data_table(["Validation item", "Result", "Meaning"], validation_rows, [1.55 * inch, 0.95 * inch, 3.65 * inch], st))
    story.append(Spacer(1, 8))
    story.append(p("Rubric dimensions", st["h2"]))
    rubric_rows = [
        ["Logical coherence", "25%", "Premises, bridges, scope, and conclusion fit"],
        ["Evidence and warrant", "20%", "Sourceable support and comparison with alternatives"],
        ["Responsiveness", "20%", "Contact with the strongest relevant target"],
        ["Relevance and burden", "15%", "Advancement of the adopted route and motion"],
        ["Precision and clarity", "10%", "Stable proposition, terms, scope, and qualification"],
        ["Calibration and charity", "10%", "Confidence fits warrant and alternatives are represented fairly"],
    ]
    story.append(data_table(["Dimension", "Weight", "Operational focus"], rubric_rows, [1.65 * inch, 0.68 * inch, 3.82 * inch], st))
    story.append(Spacer(1, 8))
    story.append(p(
        "The paired design matters because every debate supplies both sides of the comparison. The analysis is not comparing theists in one set of topics with non-theists in an unrelated set; it asks how the opposed sides performed inside the same debate, under the same motion, transcript, and scoring rules. The dimension decomposition then shows where the paired margin was produced. This does not solve speaker repetition or topic selection, but it sharply reduces the possibility that the headline gap is merely a by-product of unrelated debate conditions.",
        st["body"],
    ))
    story.append(PageBreak())

    # Caveats and sources
    story.extend(section_heading("11. Caveats, scope, and source record", st))
    for text in [
        "The corpus is selected rather than randomly sampled from all theist and non-theist debates.",
        "Speakers repeat, and moves are nested within debates; the rows are not independent observations.",
        "The side classification concerns the position argued in the scorecard, not private belief, character, or sincerity.",
        "The theist side is pro in 149 of 169 debates. Role and orientation checks reduce but do not erase selection concerns.",
        "The calibration/charity dimension combines overclaiming with representational fairness, so its 0.85-point full-corpus contribution cannot be assigned wholly to substantiation.",
        "Closed calibration and response-class findings cover 146 debates; the remaining 23 expose the same six final dimensions but not those closed subfields.",
        "The scores are AI-assisted, transcript-grounded judgments under a fixed rubric. Blind human replication remains an important test.",
        "Debate 191 was corrected so the intelligent-design side is the theist side; the corrected overall result is 145 non-theist higher, 5 ties, and 19 theist higher.",
    ]:
        story.append(bullet(text, st))
    story.append(p("Primary source record", st["h2"]))
    source_rows = [
        ["Executed diagnosis", "docs/analysis/theist-argument-weaknesses-2026-09-01/results.json"],
        ["Move audit trail", "docs/analysis/theist-argument-weaknesses-2026-09-01/move-diagnostics.csv"],
        ["Debate decomposition", "docs/analysis/theist-argument-weaknesses-2026-09-01/debate-decomposition.csv"],
        ["Corrected taxonomy", "docs/analysis/non-theist-vs-theist-2026-09-01/taxonomy.csv"],
        ["Assessment ledgers", "docs/assessment-ledgers/*.json and their locked final-ledger evidence"],
        ["Scoring rubric", "docs/reassessment-rubric-v4.0.md and v4.0.1"],
        ["Interactive HTML report", "docs/analysis/theist-argument-weaknesses-2026-09-01/report.html"],
    ]
    story.append(data_table(["Artifact", "Repository path"], source_rows, [1.5 * inch, 4.65 * inch], st))
    story.append(PageBreak())

    # Conclusion
    story.extend(section_heading("12. Conclusion: the public-evidence deficit is the point", st))
    story.append(callout(
        "The finding in one sentence",
        "In this corpus, theists do not score lower mainly because they address the wrong questions or happen to occupy the harder side; they score lower because they more often treat what faith permits them to believe as though it were what shared evidence compels an opponent to accept.",
        st,
        background=RUST_LIGHT,
        accent=RUST,
    ))
    story.append(Spacer(1, 9))
    story.append(p(
        f"The headline result is substantial: non-theists score higher in {primary['non_theist_higher']} of {primary['n_debates']} debates, with only {primary['theist_higher']} debates favoring the theist side and {primary['ties']} ties. The mean advantage is {primary['mean_margin']:.2f} points. But a win-loss count, by itself, would not defend the hypothesis. The defense comes from opening the score difference and asking exactly what produced it.",
        st["body"],
    ))
    story.append(p("The structure of the deficit", st["h2"]))
    story.append(p(
        f"The answer is strikingly concentrated. Evidence and warrant, logical coherence, responsiveness, and calibration and charity together account for {epistemic_core_points:.2f} points, or {epistemic_core_share:.1%}, of the {primary['mean_margin']:.2f}-point gap. Relevance and burden accounts for only 0.21 points. Theists are generally debating the assigned issue; the loss occurs in whether their reasons publicly establish the claim, whether the conclusion follows at the stated strength, whether the strongest objection is actually answered, and whether confidence is proportioned to support.",
        st["body"],
    ))
    story.append(p(
        "The surrounding diagnostics reinforce that interpretation. Theist moves fall below 70 on evidence 61.5% of the time, compared with 23.3% for non-theist moves. Overstatement appears in 72.8% of theist moves, and material or radical overstatement in 36.3%. Strong reply contact is much less common. The evidence gap remains in constructives, replies, load-bearing moves, and the subset where the theist argues con. These are not random blemishes around an otherwise neutral result. They form the connected epistemic profile predicted by bleed-through.",
        st["body"],
    ))
    story.append(p("The explanatory verdict", st["h2"]))
    story.append(p(
        "Faith traditions can rationally license commitment for insiders through revelation, testimony, religious experience, inherited authority, or a sense of theological fit. Public debate imposes a further demand: the reasons must be inspectable and weight-bearing for people who do not already grant those sources. The recurring defect in these debates is the failure to complete that translation. Compatibility is offered where comparative confirmation is needed; possibility stands in for probability; a gap in one natural account becomes evidence for agency; and a personally meaningful explanation is presented as a publicly established one.",
        st["body"],
    ))
    story.append(p(
        "Burden asymmetry, topic selection, repeated speakers, and evaluator effects remain legitimate qualifications, but they do not presently explain the pattern as well. They do not jointly predict the concentration in warrant and inference, the intensified deficit in load-bearing moves, the accompanying overstatement and weak reply contact, the small relevance contribution, and persistence under role controls. Epistemic bleed-through does. It unifies the findings with one mechanism and does so without claiming that every theist, every religious argument, or every act of faith exhibits the defect.",
        st["body"],
    ))
    story.append(callout(
        "Final conclusion",
        "The best-supported reading of the SLUGFESTER data is that the theist-side disadvantage is substantially epistemic. Faith-permissive standards appear to carry into public reasoning, where they license premises too early, support inferential bridges too weakly, and sustain conclusions too confidently. The result is incomplete substantiation presented as completed argument. That is the precise weakness recorded by the scores, and it is why the epistemic bleed-through hypothesis presently offers the strongest explanation of why the theist sides score lower.",
        st,
        background=TEAL_LIGHT,
        accent=TEAL,
    ))
    return story


def build_pdf() -> Path:
    register_fonts()
    with RESULTS_PATH.open(encoding="utf-8") as handle:
        results = json.load(handle)
    with BASE_RESULTS_PATH.open(encoding="utf-8") as handle:
        base_results = json.load(handle)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUTPUT_PATH),
        pagesize=letter,
        leftMargin=LEFT,
        rightMargin=RIGHT,
        topMargin=TOP,
        bottomMargin=BOTTOM,
        title="Why Do the Theist Sides Score Lower? A Defense of the Epistemic Bleed-Through Hypothesis",
        author="SLUGFESTER",
        subject="A move-level defense of the epistemic bleed-through hypothesis",
        creator="SLUGFESTER ReportLab PDF pipeline",
    )
    frame = Frame(LEFT, BOTTOM, CONTENT_W, PAGE_H - TOP - BOTTOM, id="body", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=page_chrome)])
    doc.multiBuild(build_story(results, base_results, styles()))
    return OUTPUT_PATH


if __name__ == "__main__":
    print(build_pdf().relative_to(REPO_ROOT))
