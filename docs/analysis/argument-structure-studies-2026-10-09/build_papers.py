"""Typeset three new manuscripts; reuse the site's embedded-font design system."""
from pathlib import Path
import importlib.util,json,re,hashlib
from reportlab.platypus import Paragraph,Spacer,PageBreak,Image,KeepTogether,Flowable
from reportlab.lib.styles import ParagraphStyle
from pypdf import PdfReader
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
spec=importlib.util.spec_from_file_location('existing_pdf_style',ROOT/'docs/analysis/corpus-papers-2026-10-09/build_papers.py')
style=importlib.util.module_from_spec(spec);spec.loader.exec_module(style)
S=style.S;CW=style.CW
META=json.loads((HERE/'editorial.json').read_text())
CHARTS={x['id']:x for x in json.loads((HERE/'chart-contracts.json').read_text())}

class Cover(Flowable):
    def __init__(self,m):super().__init__();self.m=m;self.width=CW;self.height=655
    def draw(self):
        c=self.canv;m=self.m
        c.setFillColor(style.TEAL);c.rect(0,625,38,4,stroke=0,fill=1)
        c.setFont('Sans-Bold',10);c.drawString(50,623,'SLUGFESTER / RESEARCH')
        c.setFillColor(style.GREY);c.setFont('Sans',9);c.drawString(0,584,'OCTOBER 2026 / ARGUMENTS AND OPPONENTS')
        p=Paragraph(style.inline(m['title']),ParagraphStyle('title',fontName='Body-Bold',fontSize=30,leading=36,textColor=style.NAVY))
        _,h=p.wrap(CW,240);p.drawOn(c,0,550-h)
        p=Paragraph(style.inline(m['subtitle']),ParagraphStyle('subtitle',fontName='Sans',fontSize=13,leading=19,textColor=style.GREY));_,sh=p.wrap(CW,150);p.drawOn(c,0,527-h-sh)
        c.setStrokeColor(style.LIGHT);c.line(0,284,CW,284)
        for i,(value,label) in enumerate(m['stats']):
            x=i*CW/3;c.setFillColor(style.TEAL if i!=1 else style.RUST);c.setFont('Sans-Bold',29);c.drawString(x,243,value)
            p=Paragraph(style.inline(label),ParagraphStyle('stat',fontName='Sans',fontSize=9,leading=12,textColor=style.NAVY));_,lh=p.wrap(CW/3-13,70);p.drawOn(c,x,225-lh)
        p=Paragraph(style.inline(m['finding']),ParagraphStyle('finding',fontName='Body',fontSize=12,leading=18,textColor=style.NAVY));_,h=p.wrap(CW,150);p.drawOn(c,0,164-h)
        c.setFillColor(style.NAVY);c.setFont('Sans-Bold',10);c.drawString(0,48,'PHIL STILWELL / SLUGFESTER')
        c.setFont('Sans',9);c.drawString(0,28,'October 9, 2026 | Frozen source archive: 308 assessments')
        c.setFillColor(style.GREY);c.setFont('Sans',8);c.drawString(0,10,'Source-linked editorial analysis. No debate scores changed.')

def parse(meta,text):
    lines=text.splitlines();story=[Cover(meta),PageBreak()];i=0;nfig=0;nh=0
    while i<len(lines):
        l=lines[i].strip()
        if not l:i+=1;continue
        if l.startswith('## '):
            nh+=1;p=Paragraph(style.inline(l[3:]),S['h1']);p.toc_key=f's{nh}';story.append(p);i+=1;continue
        if l.startswith('### '):story.append(Paragraph(style.inline(l[4:]),S['h2']));i+=1;continue
        if l.startswith('!['):
            m=re.fullmatch(r'!\[(.*?)\]\((.*?)\)',l);key=m[2];chart=CHARTS[key];nfig+=1
            im=Image(str(HERE/'figures'/f'{key}.png'));max_height=270 if key=='p10-models' else 475;factor=min(CW/im.imageWidth,max_height/im.imageHeight);im.drawWidth=im.imageWidth*factor;im.drawHeight=im.imageHeight*factor;im.hAlign='CENTER'
            story.append(KeepTogether([Spacer(1,8),im,Paragraph(f'<b>Figure {nfig}.</b> '+style.inline(m[1]),S['caption']),Paragraph('<b>How to read it.</b> '+style.inline(chart['reading']),S['reading'])]));i+=1;continue
        if l.startswith('|'):
            rows=[]
            while i<len(lines) and lines[i].strip().startswith('|'):
                row=[x.strip() for x in lines[i].strip().strip('|').split('|')];i+=1
                if all(re.fullmatch(r':?-+:?',x) for x in row):continue
                rows.append(row)
            story+=[style.table(rows),Spacer(1,12)];continue
        if l.startswith('> '):story+=[Paragraph(style.inline(l[2:]),S['box']),Spacer(1,15)];i+=1;continue
        parts=[l];i+=1
        while i<len(lines) and lines[i].strip() and not lines[i].strip().startswith(('##','|','![','> ')):
            parts.append(lines[i].strip());i+=1
        story.append(Paragraph(style.inline(' '.join(parts)),S['body']))
    return story,nfig

manifest=[]
for m in META:
    text=(HERE/'manuscripts'/f"{m['number']:02d}.md").read_text();story,nfig=parse(m,text)
    p=ROOT/'output/pdf'/f"{m['pdf']}.pdf"
    doc=style.Document(p,dict(m,id=m['number']));doc.multiBuild(story)
    reader=PdfReader(p)
    manifest.append(dict(number=m['number'],id=m['id'],title=m['title'],path=str(p.relative_to(ROOT)),pdf=m['pdf'],pages=len(reader.pages),figures=nfig,words=len(re.findall(r'\b\w+\b',text)),sha256=hashlib.sha256(p.read_bytes()).hexdigest()))
    print(m['number'],len(reader.pages),'pages,',nfig,'figures')
(HERE/'publication-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
