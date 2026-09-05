"""Reuse the series' embedded-font design, replacing only the slogan paper."""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
import re
import sys
from pathlib import Path
from pypdf import PdfReader
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Flowable, Paragraph

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('series_design',ROOT/'docs/analysis/astra-corpus-papers-2026-09-04/build_papers.py')
design=importlib.util.module_from_spec(spec);spec.loader.exec_module(design)


class DirectCover(Flowable):
    def __init__(self,meta):
        Flowable.__init__(self);self.meta=meta;self.width=design.CW;self.height=663
    def draw(self):
        c=self.canv;m=self.meta;cw=design.CW
        c.setFillColor(design.TEAL);c.rect(0,642,32,4,stroke=0,fill=1)
        c.setFont('Sans-Bold',9);c.drawString(43,640,'SLUGFESTER  /  CORPUS RESEARCH')
        c.setFillColor(design.LIGHT);c.setFont('Sans-Bold',78);c.drawRightString(cw,582,'03')
        c.setFillColor(design.GREY);c.setFont('Sans',9);c.drawString(0,593,'DIRECT TRANSCRIPT STUDY / PLAIN-LANGUAGE EDITION')
        title=Paragraph(design.inline(m['title']),ParagraphStyle('directTitle',fontName='Body-Bold',fontSize=32,leading=37,textColor=design.NAVY))
        _,th=title.wrap(cw-30,180);title.drawOn(c,0,555-th)
        sub=Paragraph(design.inline(m['subtitle']),ParagraphStyle('directSub',fontName='Sans',fontSize=13,leading=19,textColor=design.GREY))
        _,sh=sub.wrap(cw-20,150);sub.drawOn(c,0,530-th-sh)
        c.setStrokeColor(design.LIGHT);c.line(0,289,cw,289)
        for i,(value,label) in enumerate(m['stats']):
            x=i*cw/3;c.setFillColor(design.TEAL if i!=1 else design.RUST)
            c.setFont('Sans-Bold',29);c.drawString(x,247,value)
            p=Paragraph(label.replace('\n','<br/>'),ParagraphStyle('directMetric',fontName='Sans',fontSize=8.5,leading=12,textColor=design.NAVY))
            p.wrap(cw/3-12,70);p.drawOn(c,x,210)
        p=Paragraph(design.inline(m['finding']),ParagraphStyle('directFinding',fontName='Body',fontSize=11.5,leading=17,textColor=design.NAVY))
        _,ph=p.wrap(cw-30,150);p.drawOn(c,0,173-ph)
        c.setFillColor(design.NAVY);c.setFont('Sans-Bold',9);c.drawString(0,51,'PHIL STILWELL  ·  SLUGFESTER')
        c.setFont('Sans',9);c.drawString(0,34,m['reportDate']+'  |  187 relevant debates')
        c.setFillColor(design.GREY);c.setFont('Sans',8);c.drawString(0,17,'Fresh slogan review. Original debate scores have not been changed.')


class DirectDocument(design.Document):
    def page(self,c,doc):
        if doc.page==1:return
        c.saveState();c.setStrokeColor(design.LIGHT)
        c.line(design.MARGIN,design.H-35,design.W-design.MARGIN,design.H-35)
        c.setFillColor(design.GREY);c.setFont('Sans',8)
        c.drawString(design.MARGIN,design.H-25,'03  /  Slogans, support, and protection from criticism')
        c.drawRightString(design.W-design.MARGIN,design.H-25,'SLUGFESTER RESEARCH')
        c.line(design.MARGIN,35,design.W-design.MARGIN,35)
        c.drawString(design.MARGIN,23,self.meta['reportDate']+'  ·  Direct review of 187 transcripts')
        c.drawRightString(design.W-design.MARGIN,23,str(doc.page));c.restoreState()


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--publish',action='store_true');args=parser.parse_args()
    results=json.loads((HERE/'light-results.json').read_text())
    assert results['status']=='complete' and results['reviewedDebates']==187, 'No partial research publication'
    meta=json.loads((HERE/'paper-metadata.json').read_text())
    assert meta['sourceCheckedExamples'] is True and meta['editorialStatus']=='ready'
    design.HERE=HERE;design.R=results
    design.CHARTS={c['id']:c for c in json.loads((HERE/'chart-contracts.json').read_text())}
    design.Cover=DirectCover
    manuscript=(HERE/'manuscript.md').read_text()
    assert '[[contents]]' not in manuscript, 'Use a direct-study reader guide, not the historical series boilerplate'
    assert not re.search(r'\b(TODO|TBD)\b',manuscript)
    output=ROOT/'output/pdf' if args.publish else HERE/'draft'
    output.mkdir(parents=True,exist_ok=True)
    path=output/'are-theist-arguments-more-often-slogan-like.pdf'
    story,figures=design.parse(meta,manuscript)
    doc=DirectDocument(path,meta)
    doc.subject=f"{meta['reportDate']}; direct slogan review of 187 debates in the September 4, 2026 frozen archive"
    doc.multiBuild(story)
    pdf=PdfReader(path)
    manifest=dict(**meta,pages=len(pdf.pages),figures=figures,
        manuscript_words=len(re.findall(r'\b\w+\b',design.expand_metrics(manuscript))),
        path=str(path.relative_to(ROOT)),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
        resultsSha256=hashlib.sha256((HERE/'light-results.json').read_bytes()).hexdigest(),
        reviewModel='gpt-6-astra',reasoningEffort='low',reviewsPerDebate=1)
    (HERE/('publication-manifest.json' if args.publish else 'draft-manifest.json')).write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps(manifest,indent=2))


if __name__=='__main__':main()
