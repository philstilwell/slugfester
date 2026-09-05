"""Four clearly keyed figures; refuses to chart unfinished research by default."""
from pathlib import Path
import json
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Patch
from matplotlib import font_manager

HERE=Path(__file__).resolve().parent
T='#B8603A'; N='#137D82'; INK='#17354B'; GREY='#637581'; PALE='#E5EBEE'
CONTRACTS=[]

def finish(fig,key,title,reading,metric,denominator):
    fig.savefig(HERE/'figures'/f'{key}.png',dpi=220,facecolor='white',bbox_inches='tight')
    fig.savefig(HERE/'figures'/f'{key}.svg',facecolor='white',bbox_inches='tight')
    plt.close(fig)
    CONTRACTS.append(dict(id=key,title=title,reading_key=reading,metric=metric,
        denominator=denominator,source='light-results.json / light-debates.json',
        colors={'theist':T,'non_theist':N},scope='187 relevant retained transcripts; one Light AI review each'))

def main():
    r=json.loads((HERE/'light-results.json').read_text())
    assert r['status']=='complete' and r['reviewedDebates']==187, 'Do not chart unfinished research'
    rows=json.loads((HERE/'light-debates.json').read_text())
    (HERE/'figures').mkdir(exist_ok=True)
    font_manager.fontManager.addfont('/System/Library/Fonts/Supplemental/Arial.ttf')
    font_manager.fontManager.addfont('/System/Library/Fonts/Supplemental/Arial Bold.ttf')
    plt.rcParams.update({'font.family':'Arial','font.size':13,'text.color':INK,
        'axes.labelcolor':INK,'axes.edgecolor':PALE,'xtick.color':GREY,'ytick.color':INK,
        'axes.spines.top':False,'axes.spines.right':False,'axes.spines.left':False,
        'axes.titleweight':'bold','axes.titlesize':14,'svg.fonttype':'none'})

    fig,axes=plt.subplots(1,2,figsize=(10,4.2))
    for ax,outcome,title in zip(axes,['unsupported','protected_slogan'],
            ['Unsupported slogans','Also protected from criticism']):
        s=r['statistics']['all'][outcome]
        vals=[s['theist_equal_debate_rate'],s['non_theist_equal_debate_rate']]
        ax.barh([1,0],vals,color=[T,N],height=.52)
        ax.set_yticks([1,0],['Theist','Non-theist']);ax.set_title(title,pad=16)
        ax.set_xlim(0,1.2);ax.set_xticks([0,.4,.8,1.2]);ax.set_xlabel('Uses per 10,000 words')
        ax.xaxis.grid(True,color=PALE);ax.set_axisbelow(True)
        for y,v in zip([1,0],vals):ax.text(v+ax.get_xlim()[1]*.025,y,f'{v:.2f}',va='center',fontweight='bold')
    fig.subplots_adjust(wspace=.48,bottom=.2)
    finish(fig,'p3-direct-rates','Two different tests, applied to both sides',
        'Rust = theist; teal = non-theist. Bar length shows detected uses per 10,000 caption words attributed to that side, averaged with equal weight for each of the 187 debates. Both panels use the same scale and start at zero. The right panel is a stricter subset of the left; do not add them together.',
        'Equal-debate average of side-specific episode rates','Attributed substantive caption words within each debate')

    fig,axes=plt.subplots(1,2,figsize=(10,4.5))
    names=['Both sides','Theist only','Non-theist only','Neither side']
    keys=['both','theist_only','non_theist_only','neither']
    for ax,outcome,title in zip(axes,['unsupported','protected_slogan'],['Unsupported slogans','Also protected from criticism']):
        s=r['statistics']['all'][outcome]; vals=[s['presence'].get(k,0) for k in keys]
        ax.barh(np.arange(4),vals,color=[INK,T,N,PALE],height=.58)
        ax.set_yticks(np.arange(4),names);ax.invert_yaxis();ax.set_xlim(0,187)
        ax.set_xlabel('Number of debates (out of 187)');ax.set_title(title,pad=16)
        for y,v in enumerate(vals):ax.text(v+3,y,str(v),va='center',fontweight='bold')
        ax.set_xlim(0,207);ax.set_xticks([0,50,100,150,187]);ax.xaxis.grid(True,color=PALE);ax.set_axisbelow(True)
    fig.subplots_adjust(wspace=.62,bottom=.18)
    finish(fig,'p3-direct-presence','How widely the detected uses appear',
        'Each bar counts debates, not slogans or speakers. Navy = at least one detected use on both sides; rust = only theist; teal = only non-theist; pale grey = neither. Each panel adds to 187. A debate with many uses still counts once. Neither means none detected under this rule, not proof of perfect reasoning.',
        'Presence of at least one eligible episode by side','187 debates per panel')

    fig,axes=plt.subplots(2,1,figsize=(9,6.2))
    cuts=['all','earlier','later','narrow','without_lennox']
    names=['All relevant debates','Earlier assessment group','Later assessment group','Narrower topic selection','Without Lennox debates']
    for ax,outcome,title in zip(axes,['unsupported','protected_slogan'],['Unsupported slogans','Also protected from criticism']):
        for y,cut in enumerate(cuts):
            s=r['statistics'][cut][outcome];lo,hi=s['gap_ci'];gap=s['mean_gap']
            ax.plot([lo,hi],[y,y],color=INK,lw=2);ax.scatter([gap],[y],s=45,color=T if gap>=0 else N,zorder=3)
        ax.axvline(0,color=GREY,ls='--',lw=1)
        labels=[f'{name} (n={r["statistics"][cut][outcome]["n"]})' for name,cut in zip(names,cuts)]
        ax.set_yticks(range(len(cuts)),labels);ax.invert_yaxis()
        ax.set_title(title,pad=12);ax.set_xlim(-.4,1.1)
        ax.set_xticks([-.4,0,.4,.8]);ax.set_xlabel('Theist rate minus non-theist rate (uses per 10,000 words)')
        ax.xaxis.grid(True,color=PALE);ax.set_axisbelow(True)
    fig.subplots_adjust(hspace=.85,bottom=.12,left=.38,right=.97)
    finish(fig,'p3-direct-checks','Does the direction survive different selections?',
        'Each dot is the average within-debate difference. Right of the dashed zero line means more theist uses; left means more non-theist uses. Each line covers the middle 95% of averages from 20,000 repeat draws of whole debates. Crossing zero means the direction changes in this exercise. Both panels use the same scale; n means debates. These are overlapping checks, not five independent studies, and the lines do not cover AI reading errors.',
        'Paired mean rate differences with percentile resampling ranges','Complete debates sampled as pairs; 20,000 draws; fixed seed 20260904')

    fig,ax=plt.subplots(figsize=(9,3.8))
    vals=[]; labels=[]
    for side,name in [('theist','Theist'),('non_theist','Non-theist')]:
        total=sum(x[side+'_unsupported'] for x in rows)
        emotion=sum(x[side+'_unsupported_with_emotion'] for x in rows)
        vals.append(100*emotion/total if total else 0);labels.append(f'{name}: {emotion} of {total} uses')
    ax.barh([1,0],vals,color=[T,N],height=.5);ax.set_yticks([1,0],labels)
    ax.set_xlim(0,108);ax.set_xticks([0,25,50,75,100]);ax.set_xlabel('Share of detected unsupported slogans (%)')
    ax.set_title('Emotional wording within the detected slogans',pad=18)
    for y,v in zip([1,0],vals):ax.text(v+2,y,f'{v:.1f}%',va='center',fontweight='bold')
    ax.xaxis.grid(True,color=PALE);ax.set_axisbelow(True)
    finish(fig,'p3-direct-emotion','Emotional wording is a separate observation',
        'Rust = theist; teal = non-theist. Bars show the percentage of detected unsupported slogans also marked for comfort, fear, shame, identity, or ridicule. The counts beside each bar show the denominator. This is not the percentage of all speech that is emotional. It measures wording, not a speaker’s motive, a listener’s reaction, or what causes religious belief.',
        'Share of confirmed unsupported episodes with at least one recorded emotional device','Detected unsupported slogans, separately by side')
    (HERE/'chart-contracts.json').write_text(json.dumps(CONTRACTS,indent=2,ensure_ascii=False)+'\n')

if __name__=='__main__':main()
