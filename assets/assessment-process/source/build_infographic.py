from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, Color, white
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parent.parent
W, H = 1000, 1400
ART = ImageReader(str(Path(__file__).resolve().parent / "character-illustrations.jpg"))
INK = HexColor("#13201f")
MUTED = HexColor("#526460")
BG = HexColor("#f4f8f7")
LINE = HexColor("#d8e1de")
RED = HexColor("#b91f24")
GOLD = HexColor("#bc9019")
TEAL = HexColor("#2f8f85")
BLUE = HexColor("#2d5f8b")
PALE_GOLD = HexColor("#fbf5e2")
PALE_TEAL = HexColor("#e4f1ee")

FONTS = Path("/System/Library/Fonts/Supplemental")
for family, filename in [("Body", "Arial.ttf"), ("Bold", "Arial Bold.ttf"), ("Heavy", "Arial Black.ttf")]:
    pdfmetrics.registerFont(TTFont(family, str(FONTS / filename)))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="Bold", italic="Body", boldItalic="Bold")

def box(c, x, y, w, h, fill=white, border=LINE, r=12):
    c.setFillColor(fill)
    c.setStrokeColor(border or fill)
    c.setLineWidth(1)
    c.roundRect(x, H-y-h, w, h, r, fill=1, stroke=bool(border))

def line(c, x1, y1, x2, y2, color=LINE, thickness=1):
    c.setStrokeColor(color)
    c.setLineWidth(thickness)
    c.line(x1, H-y1, x2, H-y2)

def text(c, value, x, y, size=16, font="Body", color=INK):
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawString(x, H-y-size, value)

def para(c, value, x, y, w, size=16, leading=23, color=INK, maxh=None, font="Body"):
    style = ParagraphStyle("body", fontName=font, fontSize=size, leading=leading,
                           textColor=color, spaceAfter=0, allowWidows=0, allowOrphans=0)
    p = Paragraph(value, style)
    _, height = p.wrap(w, 2000)
    if maxh is not None and height > maxh + .01:
        raise ValueError(f"Text overflow {height} > {maxh}: {value[:90]}")
    p.drawOn(c, x, H-y-height)
    return height

def arrow(c, x1, y1, x2, y2, color=TEAL):
    import math
    line(c, x1,y1,x2,y2,color,2)
    a = math.atan2(y2-y1,x2-x1)
    for d in [-.6,.6]:
        line(c, x2,y2,x2-8*math.cos(a+d),y2-8*math.sin(a+d),color,2)

def art(c, part, x, y, w):
    h = w * 1184 / (3584/3)
    c.saveState()
    clip = c.beginPath()
    clip.rect(x, H-y-h, w, h)
    c.clipPath(clip, stroke=0)
    c.drawImage(ART, x-w*part, H-y-h, width=w*3, height=h, mask='auto')
    c.restoreState()

def stage(c, n, title, x, y, w, h, color=RED):
    box(c,x,y,w,h)
    text(c,f"{n:02}",x+20,y+18,28,"Heavy",color)
    para(c,title,x+77,y+22,w-96,19,23,maxh=47,font="Bold")

def header(c, part, title, intro, accent):
    c.setFillColor(BG)
    c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(accent)
    c.rect(0,H-8,W,8,fill=1,stroke=0)
    text(c,"Slugfester!",54,28,30,"Heavy",RED)
    text(c,"FROM DEBATE TO SCORECARD",54,77,12,"Bold",MUTED)
    para(c,title,54,111,580,48,53,maxh=112,font="Heavy")
    para(c,intro,56,235,545,17,24,maxh=72,color=MUTED)
    art(c,part,650,30,294)
    line(c,54,319,946,319,accent,2)

def footer(c, part, label, accent):
    line(c,54,1346,946,1346,LINE,1)
    text(c,"slugfester.com",54,1362,13,"Bold",accent)
    text(c,"Workflow: September 2026 • AI roles clarified October 2026",197,1363,11,"Body",MUTED)
    text(c,f"{part+1} / 3   {label}",744,1363,11,"Bold",accent)
    c.linkURL("https://slugfester.com/backend/",(54,H-1382,180,H-1358),relative=1,thickness=0)

def panel_one(c):
    header(c,0,"Evidence before<br/>verdicts.",
           "The process starts by fixing what is being assessed - before anyone sees a score.",RED)
    stage(c,1,"Define the debate",54,343,434,201,RED)
    para(c,"Check for duplicates. Identify the recording, speakers, event year and one <b>neutral question</b>. Record what each side must establish: its burden. A critic need not prove an alternative unless that burden is adopted.",
         75,405,390,16,22,maxh=126)
    stage(c,2,"Secure the complete source",512,343,434,201,RED)
    para(c,"Check transcript coverage, material gaps and speaker changes against the <b>full debate</b>. Use complete captions; transcribe if needed. Preserve timestamps and digital fingerprints that reveal later changes to the evidence.",
         533,405,390,16,22,maxh=126)

    stage(c,3,"Map the arguments, then lock the evidence",54,568,892,207,RED)
    para(c,"Identify important claims, replies, concessions and unanswered objections. Tie each selected <b>move</b> to an exact source passage, speaker, topic and relevant burden or reply. Explain unequal coverage: never invent symmetry or drop arguments just to fit the display.",
         77,635,496,16,22,maxh=123)
    box(c,601,635,322,127,PALE_GOLD,None,9)
    text(c,"FIXED BEFORE JUDGMENT",618,648,12,"Bold",HexColor("#805908"))
    para(c,"<b>Section weights:</b> total 100%.<br/><b>Move importance:</b> 1, 2 or 3.<br/>Source, scope and assessment rules are frozen with the inventory.",
         618,670,286,14,20,maxh=80)

    stage(c,4,"Two isolated AI reviews",54,799,434,345,RED)
    para(c,"The administrative AI calls two independent AI agents to rate every selected move against the <b>same locked evidence</b>, with reasons. Neither sees prior scorecards, published commentary, winner labels or the other's judgments.",
         77,865,388,16,22,maxh=113)
    text(c,"SAME EVIDENCE",199,985,11,"Bold",MUTED)
    arrow(c,264,1009,161,1036,GOLD)
    arrow(c,276,1009,381,1036,TEAL)
    box(c,88,1040,144,38,PALE_GOLD,None,7)
    box(c,305,1040,144,38,PALE_TEAL,None,7)
    text(c,"AI REVIEW A",109,1049,13,"Bold",HexColor("#805908"))
    text(c,"AI REVIEW B",326,1049,13,"Bold",TEAL)
    arrow(c,161,1080,256,1103,GOLD)
    arrow(c,378,1080,280,1103,TEAL)
    text(c,"COMPARE & RESOLVE",186,1112,12,"Bold",INK)

    stage(c,5,"Resolve differences",512,799,434,345,RED)
    para(c,"Check audio whenever speaker attribution is below high confidence. A fresh independent <b>AI adjudicator, called by the administrative AI,</b> reviews flagged differences using source evidence and anonymous options. Undisputed numerical ratings use rounded means. Freeze the resolved record.",
         535,865,388,16,22,maxh=157)
    line(c,535,1025,923,1025)
    text(c,"REVIEW TRIGGERS",535,1037,12,"Bold",BLUE)
    para(c,"Dimension gap <b>&gt;8</b> points • Move-score gap <b>&gt;4</b><br/>Adjustment gap <b>&gt;2</b> • Relevant categorical differences",535,1063,388,14,21,maxh=67)

    box(c,54,1170,892,147,INK,None,12)
    text(c,"CONTROLLED INPUTS. NOT PERFECT OBJECTIVITY.",77,1190,15,"Bold",HexColor("#a7d9d2"))
    para(c,"<b>Reviewers and adjudicators are independent AI agents called by the administrative AI.</b> Independence means separate AI contexts with controlled inputs, not necessarily different models. Shared model biases and mistakes can remain. Selection is curated, not representative.",
         77,1224,846,16,24,white,maxh=82)
    footer(c,0,"EVIDENCE",RED)

def panel_two(c):
    header(c,1,"Judgments become<br/>scores.",
           "A score is earned move by move. Fixed rules turn the resolved ratings into section and overall scores.",GOLD)
    text(c,"06",54,342,28,"Heavy",GOLD)
    text(c,"Six dimensions, one move score",118,348,22,"Bold")
    text(c,"Every dimension is rated from 0 to 100.",118,382,15,"Body",MUTED)
    dimensions = [
        (25,"Logical coherence","Does the conclusion follow from its premises?",RED),
        (20,"Evidence and warrant","Is the support adequate and connected to the conclusion?",HexColor("#c77532")),
        (20,"Responsiveness","Does it answer the actual live challenge?",GOLD),
        (15,"Relevance and burden","Does it advance or challenge what must be established?",HexColor("#8a9439")),
        (10,"Precision and clarity","Are terms, scope and qualifications clear?",TEAL),
        (10,"Calibration and charity","Is confidence justified, and the opposing argument represented fairly?",TEAL),
    ]
    for i,(percent,title,question,col) in enumerate(dimensions):
        y=420+i*49
        box(c,54,y,892,47,white,None,6)
        box(c,54,y,91,47,col,None,6)
        text(c,f"{percent}%",70,y+8,23,"Bold",white)
        text(c,title,164,y+11,16,"Bold")
        para(c,question,465,y+9,455,14.2,17.5,maxh=37,color=MUTED)

    for x,title,content in [
        (54,"MOVE","Multiply each of the six ratings by its fixed weight, add them, then round to a whole number."),
        (362,"SECTION","For each side, average its move scores using their prelocked importance weights of 1, 2 or 3. Then round."),
        (670,"OVERALL","Take the section-weighted average. Add the burden-completion adjustment, then round. Keep the result within 0-100."),
    ]:
        box(c,x,741,276,175,white,LINE,10)
        text(c,title,x+20,758,14,"Bold",TEAL)
        para(c,content,x+20,791,236,15,21,maxh=115)
    arrow(c,335,820,356,820,GOLD)
    arrow(c,643,820,664,820,GOLD)

    box(c,54,937,892,104,PALE_GOLD,None,10)
    text(c,"THE ONLY OVERALL ADJUSTMENT: -5 TO +5",76,953,14,"Bold",HexColor("#805908"))
    para(c,"An integer for consequential case completion not already counted in the moves. It cannot reward style or penalize the same defect twice. Section weights total 100% and cannot be tuned after judgment.",
         76,983,847,15,21,maxh=51)

    text(c,"WORKED EXAMPLES",54,1061,13,"Bold",BLUE)
    text(c,"Illustrations only, not actual debate results.",221,1061,13,"Body",MUTED)
    box(c,54,1090,434,147,white,LINE,10)
    text(c,"SECTION",75,1106,13,"Bold",MUTED)
    para(c,"Move scores <b>80</b> and <b>70</b>; importance <b>2</b> and <b>1</b>.",75,1132,390,14,19,maxh=38)
    text(c,"(80 × 2 + 70 × 1) ÷ 3 ≈ 76.67",75,1173,17,"Bold")
    text(c,"Rounded section score",75,1205,13,"Body",MUTED)
    text(c,"77",417,1184,33,"Heavy",TEAL)
    box(c,512,1090,434,147,white,LINE,10)
    text(c,"OVERALL",533,1106,13,"Bold",MUTED)
    para(c,"Section scores <b>80</b> and <b>70</b>; weights <b>60%</b> and <b>40%</b>; adjustment <b>+2</b>.",533,1132,390,14,19,maxh=38)
    text(c,"48 + 28 + 2 =",533,1180,22,"Bold")
    text(c,"78",847,1181,35,"Heavy",TEAL)
    text(c,"A separate example, not a continuation of the left one.",533,1213,10.2,"Body",MUTED)

    para(c,"<b>Calculate once. Then lock.</b> Code derives the final totals; models do not author totals, and people do not hand-adjust them. Stability checks compare the result with both initial passes. Failed checks block acceptance rather than invite score tuning.",
         54,1261,892,15,22,maxh=76)
    footer(c,1,"SCORING",GOLD)

def panel_three(c):
    header(c,2,"Explain. Challenge.<br/>Verify.",
           "After the scores are locked, the work turns to clear explanations, careful labels and publication checks.",TEAL)
    stage(c,7,"Explain the locked result",54,343,892,142,TEAL)
    para(c,"Publish every selected move exactly once, with accurate quotations and timestamps. Explain its <b>strongest feature, principal limitation, remaining burden and score</b>. Overall commentary identifies concrete strengths and material blunders for both sides. Explanations cannot change the locked scoring record.",
         77,406,846,16,23,maxh=72)

    stage(c,8,"Check fallacies and cognitive biases",54,509,892,373,TEAL)
    para(c,"After scores <b>and critiques</b> are locked, the administrative AI calls two independent AI agents to review every move using <b>LogFall</b> and <b>CogBias</b> definitions. Neither sees existing tags or the other's review. It calls a fresh independent AI adjudicator to decide <b>every candidate</b> raised by either agent.",
         77,575,846,16,23,maxh=92)
    for x,w,title,sub in [
        (77,177,"EVERY MOVE","Complete coverage"),
        (286,181,"TWO AI REVIEWS","Separate blind passes"),
        (499,181,"ALL CANDIDATES","Either AI review agent"),
        (712,211,"AI ADJUDICATION","Decide each candidate"),
    ]:
        box(c,x,675,w,73,PALE_TEAL,None,8)
        text(c,title,x+12,689,12,"Bold",TEAL)
        text(c,sub,x+12,717,11,"Body",MUTED)
    for a,b in [(258,282),(471,495),(684,708)]:
        arrow(c,a,711,b,711,TEAL)
    text(c,"LABELS NEVER ADD A SCORE PENALTY",77,769,16,"Bold",RED)
    para(c,"A tag must identify a source-supported defect <b>already reflected in the critique</b>. A contested premise is not automatically circular reasoning; citing an expert is not automatically an appeal-to-authority fallacy. Distinct labels require distinct failures. <b>Finding no applicable labels is valid.</b>",
         77,802,846,15,21,maxh=68)

    stage(c,9,"Separate the AI contribution",54,906,434,229,TEAL)
    para(c,"Clearly label strengthened arguments and genuinely new ideas for both sides. Check that they add specific reasoning rather than recycled filler. These are <b>not statements by the speakers</b> and never affect participant scores. Biography research also stays outside judgment packets.",
         77,973,388,16,22,maxh=150)
    stage(c,10,"Verify before publication",512,906,434,229,TEAL)
    para(c,"Check evidence fingerprints, calculations, quotations, tag decisions and complete move coverage. Compare explanation depth with <b>25 earlier debates</b>, without targeting their scores or tag rates. Test desktop, mobile and keyboard access. Preserve the audit record; unresolved failures block publication.",
         535,973,388,16,22,maxh=150)

    box(c,54,1159,892,167,INK,None,12)
    text(c,"WHAT THE SCORE MEANS",77,1177,13,"Bold",HexColor("#a7d9d2"))
    para(c,"An estimate of the reasoning presented, <b>not the truth of a worldview or a person's worth</b>. Fame, applause and speaking polish earn no automatic bonus.",
         77,1204,382,14.5,21,white,maxh=107)
    line(c,486,1180,486,1303,HexColor("#3b514c"),1)
    text(c,"STANDARD ROUTE: ONE ADVOCATE PER SIDE",511,1177,12,"Bold",HexColor("#a7d9d2"))
    para(c,"Panels are not forced into this method. Authorized two-team assessments use a separately disclosed approach; moves retain their actual speaker. <b>Team scores do not enter individual one-on-one averages.</b>",
         511,1204,412,14.5,21,white,maxh=107)
    footer(c,2,"VERIFICATION",TEAL)

PANELS = [panel_one, panel_two, panel_three]

def make_pdf(path, continuous=False):
    height = H*3 if continuous else H
    c = canvas.Canvas(str(path),pagesize=(W,height),initialFontName="Body",pageCompression=1)
    c.setTitle("From Debate to Scorecard | Slugfester")
    c.setAuthor("Slugfester")
    c.setSubject("Source-grounded assessment process: evidence, scoring, fallacy review and publication")
    for i,draw in enumerate(PANELS):
        c.saveState()
        if continuous:
            c.translate(0,(2-i)*H)
        draw(c)
        c.restoreState()
        if not continuous:
            c.showPage()
    if continuous:
        c.showPage()
    c.save()

if __name__ == "__main__":
    make_pdf(ROOT / "slugfester-assessment-process.pdf")
    print("Created the three-page assessment-process guide.")
