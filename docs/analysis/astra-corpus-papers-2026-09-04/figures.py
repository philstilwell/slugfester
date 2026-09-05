#!/usr/bin/env python3
"""Publication figures: one explicit source contract per chart, 300 dpi exports."""
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.text import Text
from collections import Counter
from scipy.stats import spearmanr

HERE=Path(__file__).resolve().parent
FIG=HERE/'figures'; FIG.mkdir(exist_ok=True)
R=json.loads((HERE/'results.json').read_text())
D=json.loads((HERE/'debates.json').read_text())
M=json.loads((HERE/'moves.json').read_text())
NAVY='#17354B'; TEAL='#137D82'; RUST='#B8603A'; GREY='#687984'; LIGHT='#DCE4E8'; PALE='#F3F6F7'
for f in ['Arial.ttf','Arial Bold.ttf']:
    font_manager.fontManager.addfont('/System/Library/Fonts/Supplemental/'+f)
plt.rcParams.update({'font.family':'Arial','font.size':10,'axes.labelcolor':NAVY,'text.color':NAVY,
  'xtick.color':GREY,'ytick.color':NAVY,'axes.edgecolor':LIGHT,'axes.spines.top':False,
  'axes.spines.right':False,'axes.spines.left':False,'axes.titleweight':'bold','axes.titlesize':13,
  'axes.titlepad':15,'savefig.facecolor':'white','figure.facecolor':'white','pdf.fonttype':42})
CONTRACTS=[]
READING=json.loads((HERE/'figure-reading-keys.json').read_text())
DIM=list(R['p1']['dimensions']); DL=['Logic','Support','Replies','Task','Clarity','Care']
TL={'Religion, culture & meaning':'Religion, culture & meaning','Scripture, revelation & doctrine':'Scripture & doctrine',
'Mind, reason & logic':'Mind, reason & logic','Evil, suffering & hiddenness':'Evil & hiddenness',
'Morality & moral foundations':'Morality','Cosmology, science & design':'Cosmology & design',
'General theism & naturalism':'General theism','Resurrection & historical evidence':'Resurrection'}

def save(fig,key,title,scope,unit,source):
    # The visible labels are deliberately shorter than the data field names.
    wording={'scoring dimensions':'scoring areas','dimension points':'area-score points',
      'dimension':'scoring area','Mean':'Average','mean':'average','Weak warrant':'Weak support',
      'weak warrant':'weak support','Evidence score':'Support score','Evidence gap':'Support gap',
      'evidence dimension':'support area','Original 169 debates':'Original comparisons (169)',
      '18 added comparisons':'Added comparisons (18)',
      'Unstable / missing qualification':'Changing / missing limits',
      'Material overclaim':'Overstated confidence','Rounding residual':'Rounding difference',
      'process families':'assessment groups','assessment-process families':'assessment groups',
      'pooled-variation model':'wider-record model','resamples':'repeated draws'}
    def plain(value):
        for old,new in wording.items():value=value.replace(old,new)
        return value
    # Categorical tick formatters may restore old labels when redrawn.
    for ax in fig.axes:
        for axis in ['x','y']:
            labels=[t.get_text() for t in getattr(ax,f'get_{axis}ticklabels')()]
            if any(plain(t)!=t for t in labels):
                getattr(ax,f'set_{axis}ticks')(getattr(ax,f'get_{axis}ticks')(),[plain(t) for t in labels])
    for obj in fig.findobj(match=Text):obj.set_text(plain(obj.get_text()))
    fig.savefig(FIG/f'{key}.png',dpi=300,bbox_inches='tight',pad_inches=.15)
    fig.savefig(FIG/f'{key}.pdf',bbox_inches='tight',pad_inches=.15)
    plt.close(fig)
    CONTRACTS.append(dict(id=key,title=title,scope=scope,unit=unit,source=source,
      reading_key=READING[key],
      design='Direct labels and an explicit reading key explain all marks and units. Bars start at zero; focused scatter axes are disclosed. Range meanings are chart-specific.'))

def forest(key,title,labels,values,cis,scope,unit,source,colors=None):
    fig,ax=plt.subplots(figsize=(7.3,max(3.2,.39*len(labels)+1.0)))
    y=np.arange(len(labels));colors=colors or [TEAL]*len(labels)
    for i,(v,ci,c) in enumerate(zip(values,cis,colors)):
        ax.plot(ci,[i,i],color=c,lw=2);ax.scatter(v,i,c=c,s=42,zorder=3)
        ax.text(max(max(x) for x in cis)+.25,i,f'{v:.2f}',va='center',fontsize=10,fontweight='bold',color=c)
    ax.set_yticks(y,labels);ax.invert_yaxis();ax.axvline(0,c=GREY,lw=.8)
    lo=min(0,min(min(x) for x in cis));hi=max(max(x) for x in cis)
    ax.set_xlim(lo-abs(hi-lo)*.04,hi+abs(hi-lo)*.16)
    ax.grid(axis='x',color=LIGHT,lw=.55);ax.set_axisbelow(True);ax.set_xlabel(unit);ax.set_title(title,loc='left')
    fig.tight_layout();save(fig,key,title,scope,unit,source)

def bars(key,title,labels,values,scope,unit,source,colors=None,percent=False):
    fig,ax=plt.subplots(figsize=(7.3,max(3.2,.43*len(labels)+1.1)))
    y=np.arange(len(labels));ax.barh(y,values,color=colors or TEAL,height=.58)
    for i,v in enumerate(values):ax.text(v+.012*max(values),i,(f'{v:.1f}%' if percent else f'{v:g}'),va='center',fontsize=10,fontweight='bold')
    ax.set_yticks(y,labels);ax.invert_yaxis();ax.set_xlim(0,100 if percent else max(values)*1.18)
    ax.grid(axis='x',color=LIGHT,lw=.55);ax.set_axisbelow(True);ax.set_xlabel(unit);ax.set_title(title,loc='left');fig.tight_layout()
    save(fig,key,title,scope,unit,source)

def margin_hist(key,title,rows,field,scope):
    fig,ax=plt.subplots(figsize=(7.3,3.6));vals=[d[field] for d in rows]
    bins=np.arange(min(vals)-.5,max(vals)+1.5,1);cnt,edges=np.histogram(vals,bins=bins)
    centers=edges[:-1]+.5
    ax.bar(centers,cnt,width=.84,color=[RUST if x<0 else GREY if x==0 else TEAL for x in centers])
    ax.axvline(0,color=NAVY,lw=.9);ax.axvline(np.mean(vals),color=NAVY,lw=1.3,ls='--')
    ax.text(np.mean(vals)+.5,max(cnt)*.91,f'Mean {np.mean(vals):.2f}',fontsize=10)
    ax.set_xlabel('Score difference (points out of 100)');ax.set_ylabel('Number of debates');ax.set_title(title,loc='left');ax.grid(axis='y',color=LIGHT,lw=.5);ax.set_axisbelow(True)
    fig.tight_layout();save(fig,key,title,scope,'Debates / score points',{'values':vals,'bins':bins.tolist()})

rel=[d for d in D if d.get('theist_side')];locked=[d for d in D if d['cohort']!='unlocked']
margin_hist('p1-distribution','Non-theist minus theist score',rel,'gap','187 broad religious-versus-skeptical debates')
p=R['p1'];cs=p['contributions'];labs=DL+['Rounding residual'];vs=list(cs.values())+[p['rounding']]
fig,ax=plt.subplots(figsize=(7.3,3.9));start=0
for i,v in enumerate(vs):
    ax.barh(i,v,left=start,color=TEAL if v>=0 else RUST,height=.6)
    x=start+v/2 if v>=.45 else start+v+.08 if v>=0 else start-.05
    ax.text(x,i,f'{v:+.2f}',va='center',ha='center' if v>=.45 else 'left' if v>=0 else 'right',color='white' if v>=.45 else NAVY if v>=0 else RUST,fontsize=9,fontweight='bold');start+=v
ax.barh(7,start,color=NAVY,height=.65);ax.text(start+.12,7,f'{start:.2f}',va='center',fontweight='bold')
ax.set_yticks(range(8),labs+['Total mean difference']);ax.invert_yaxis();ax.set_xlim(0,7.1);ax.grid(axis='x',color=LIGHT,lw=.5);ax.set_axisbelow(True)
ax.set_xlabel('Contribution to the overall score gap (points)');ax.set_title('How the 6.34-point gap adds up',loc='left');fig.tight_layout()
save(fig,'p1-decomposition','How the 6.34-point gap adds up','187 debates; official section and move weights','Overall score points',{'contributions':cs,'rounding':p['rounding'],'adjustment':p['adjustment']})
forest('p1-dimensions','Differences across six scoring dimensions',DL,[p['dimensions'][k]['mean'] for k in DIM],[p['dimensions'][k]['ci'] for k in DIM],'187 paired, officially weighted debate comparisons','Non-theist advantage (dimension points)',p['dimensions'])
skeys=['original169','added18','narrow','earlier','later','theist_con','without_four_frequent_skeptics']
sl=['Original 169 debates','18 added comparisons','Narrower God / supernatural set (146)','Earlier process (146)','Later process (41)','Theist occupies CON (23)','Four frequent skeptics removed (115)']
forest('p1-checks','Score gap under alternative selections',sl,[p['sensitivity'][k]['mean'] for k in skeys],[p['sensitivity'][k]['ci'] for k in skeys],'Each row states its own denominator','Mean non-theist advantage (points)',p['sensitivity'])
fig,ax=plt.subplots(figsize=(7.3,3.7));y=np.arange(3)
for s,c,off,label in [('theist',RUST,-.17,'Theist'),('non',TEAL,.17,'Non-theist')]:
    vs=[p['evidence_thresholds'][t][s] for t in ['60','70','80']];ax.barh(y+off,vs,height=.29,color=c,label=label)
    for i,v in enumerate(vs):ax.text(v+.9,i+off,f'{v:.1f}%',va='center',fontsize=9)
ax.set_yticks(y,['Evidence score below 60','Below 70','Below 80']);ax.invert_yaxis();ax.set_xlim(0,104);ax.set_xlabel('Mean within-debate share of moves (%)');ax.legend(frameon=False,loc='lower right');ax.set_title('Weak warrant is not a single-cutoff result',loc='left');ax.grid(axis='x',color=LIGHT,lw=.5);ax.set_axisbelow(True);fig.tight_layout()
save(fig,'p1-thresholds','Weak warrant is not a single-cutoff result','187 paired debates; each debate has equal weight','Percentage of moves within an average debate',p['evidence_thresholds'])

p=R['p2'];ts=sorted(p['topics'],key=lambda t:-t['mean'])
forest('p2-topics','Mean score difference by primary topic',[f"{TL[t['topic']]} ({t['n']})" for t in ts],[t['mean'] for t in ts],[t['ci'] for t in ts],'187 debates assigned once across eight themes','Non-theist advantage (score points)',ts)
fig,ax=plt.subplots(figsize=(7.3,4.1));y=np.arange(8)
for k,c,l in [('positive',TEAL,'Non-theist higher'),('zero',LIGHT,'Tie'),('negative',RUST,'Theist higher')]:
    left=np.array([0 if k=='positive' else t['positive'] if k=='zero' else t['positive']+t['zero'] for t in ts]);v=[t[k] for t in ts]
    ax.barh(y,v,left=left,color=c,label=l,height=.6)
    for i,x in enumerate(v):
        if x:ax.text(left[i]+x/2,i,str(x),ha='center',va='center',color=NAVY if k=='zero' else 'white',fontsize=9)
ax.set_yticks(y,[TL[t['topic']] for t in ts]);ax.invert_yaxis();ax.set_xlabel('Number of debates');ax.legend(frameon=False,loc='upper center',bbox_to_anchor=(.5,-.19),ncol=3,fontsize=9);ax.set_title('Direction counts, not just averages',loc='left');fig.tight_layout();save(fig,'p2-directions','Direction counts, not just averages','187 classified debates','Debates',ts)
fig,ax=plt.subplots(figsize=(7.3,4.2));matrix=np.array([[t['contributions'][k] for k in DIM] for t in ts]);im=ax.imshow(matrix,cmap='Blues',vmin=0,vmax=2.7,aspect='auto')
ax.set_xticks(range(6),DL,fontsize=9);ax.set_yticks(range(8),[TL[t['topic']] for t in ts]);ax.tick_params(length=0)
for i in range(8):
    for j in range(6):ax.text(j,i,f'{matrix[i,j]:.2f}',ha='center',va='center',fontsize=9,color='white' if matrix[i,j]>1.5 else NAVY)
ax.set_title('Weighted components of each topic gap',loc='left');fig.colorbar(im,ax=ax,shrink=.75,label='Overall score points');fig.tight_layout();save(fig,'p2-map','Weighted components of each topic gap','187 debates; official weights; rounding residual omitted','Overall score-point contributions',{'topics':ts,'dimensions':DIM})
bars('p2-order','Which topic ranks highest when cases are reweighted?',[TL[t['topic']] for t in ts],[100*t['highest_resample_share'] for t in ts],'20,000 independent within-topic resamples; exploratory, not population probabilities','Share of resamples (%)',ts,percent=True)
forest('p2-moves','Evidence gap by kind of assessed move',['All moves (187 paired debates)','High-importance moves (186)','Constructive moves (116)','Replies (186)'],[p['move_subsets'][k]['dimensions']['evidenceWarrant']['mean'] for k in ['all','major','constructive','reply']],[p['move_subsets'][k]['dimensions']['evidenceWarrant']['ci'] for k in ['all','major','constructive','reply']],'Only debates containing eligible moves on both sides; equal debate weights','Non-theist advantage (evidence dimension points)',p['move_subsets'])

p=R['p3'];fig,ax=plt.subplots(figsize=(7.3,4.0));keys=['low_warrant','overclaim','compression','slogan_risk'];y=np.arange(4)
for s,c,off,label in [('theist',RUST,-.17,'Theist: 1,393 moves'),('non',TEAL,.17,'Non-theist: 1,407 moves')]:
    v=[p['components'][k]['pooled'][s]['pct'] for k in keys];ax.barh(y+off,v,height=.3,color=c,label=label)
    for i,x in enumerate(v):ax.text(x+.9,i+off,f'{x:.1f}%',va='center',fontsize=9)
ax.set_yticks(y,['Weak warrant','Material overclaim','Unstable / missing qualification','All three together']);ax.invert_yaxis();ax.set_xlim(0,100);ax.set_xlabel('Share of assessed moves (%)');ax.set_title('The measured pattern: three conditions together',loc='left');ax.legend(frameon=False,fontsize=9,loc='lower right');ax.grid(axis='x',color=LIGHT,lw=.5);ax.set_axisbelow(True);fig.tight_layout();save(fig,'p3-components','The measured pattern: three conditions together','146 earlier-process debates; original finding fields available','Move percentage',p['components'])
forest('p3-checks','The paired three-part pattern under narrower checks',['All eligible debates (146)']+[f"{s.replace('_',' ').capitalize()} ({v['n']})" for s,v in p['checks'].items()],[p['components']['slogan_risk']['paired_pp']['mean']]+[v['mean'] for v in p['checks'].values()],[p['components']['slogan_risk']['paired_pp']['ci']]+[v['ci'] for v in p['checks'].values()],'Earlier process only; original three-part rule','Theist minus non-theist rate (percentage points)',p['checks'],colors=[RUST]*6)
forest('p3-proxy','A separate score-based check in the expanded corpus',[f'Earlier process (146)',f'Later process (41)',f'All comparable debates (187)'],[p['proxy'][k]['paired_pp']['mean'] for k in ['earlier','later','all']],[p['proxy'][k]['paired_pp']['ci'] for k in ['earlier','later','all']],'Evidence <70, precision <80, confidence/fairness <80 together; NOT literal non-falsifiability','Theist minus non-theist rate (percentage points)',p['proxy'],colors=[RUST]*3)

p=R['p4'];margin_hist('p4-distribution','CON minus PRO score',locked,'con_gap','237 comparable one-on-one debates')
keys=['theist_pro','theist_con','outside'];forest('p4-strata','The raw role contrast changes with the positions',[f"Theist is PRO ({p['strata']['theist_pro']['n']})",f"Theist is CON ({p['strata']['theist_con']['n']})",'Outside the religious comparison (50)'],[p['strata'][k]['mean'] for k in keys],[p['strata'][k]['ci'] for k in keys],'237 debates in three non-overlapping groups','CON minus PRO (score points)',p['strata'],colors=[TEAL,RUST,TEAL])
forest('p4-estimates','Different comparisons answer different role questions',['Raw archive gap (237 debates)','Religious orientations balanced 50/50','Same speakers, equal weight (31)','Same speakers, weighted (31)'],[p['raw']['mean'],p['orientation_balanced']['mean'],p['same_speaker_equal']['mean'],p['same_speaker_weighted']['estimate']],[p['raw']['ci'],p['orientation_balanced']['ci'],p['same_speaker_equal']['ci'],p['same_speaker_weighted']['ci']],'Different units and estimands; none randomly assigns debating roles','CON minus PRO (score points)',{k:v for k,v in p.items() if k!='cross_speakers'})
fig,ax=plt.subplots(figsize=(6.5,4.4));cross=p['cross_speakers'];ax.plot([67,91],[67,91],c=GREY,lw=1,ls='--')
ax.scatter([t['pro'] for t in cross],[t['con'] for t in cross],s=35,color=TEAL,alpha=.75,edgecolors='white')
for t in sorted(cross,key=lambda t:-abs(t['gap']))[:3]:ax.annotate(t['speaker'],(t['pro'],t['con']),xytext=(5,5),textcoords='offset points',fontsize=8)
ax.set_xlim(67,91);ax.set_ylim(67,91);ax.set_xlabel('Mean score while PRO');ax.set_ylabel('Mean score while CON');ax.set_title('31 speakers observed in both roles',loc='left');ax.text(68,89,'Above line: higher as CON',fontsize=9,color=GREY);fig.tight_layout();save(fig,'p4-speakers','31 speakers observed in both roles','31 people, different debates; one equal-sized dot per person','Mean score points',cross)

p=R['p5'];co=p['cohorts'];bars('p5-cohorts','Losses with no named-fallacy tag',['Whole archive: 150 / 243','Earlier process: 139 / 172','Later process: 8 / 55','Other formats: 3 / 16'],[100*p['losses_without_fallacy']/p['decisive']]+[100*co[k]['no_fallacy']/co[k]['n'] for k in ['earlier','later','unlocked']],'243 decisive assessments; 10 ties excluded','Percentage of lower-scoring sides',p,colors=[NAVY,TEAL,RUST,GREY],percent=True)
b=p['untagged_locked']['behind_distribution'];bars('p5-dimensions','How many scoring dimensions are lower?',[f'{i} of 6 dimensions' for i in range(6,1,-1)],[b.get(str(i),0) for i in range(6,1,-1)],'147 comparable losses with no named-fallacy tag','Number of lower-scoring sides',p['untagged_locked'])
dg=p['untagged_locked']['dimension_gaps'];forest('p5-gaps','Deficits in losses without a fallacy label',DL,[dg[k]['mean'] for k in DIM],[dg[k]['ci'] for k in DIM],'147 locked lower-scoring sides without named-fallacy tags','Higher minus lower side (dimension points)',dg)
tags=sorted(p['tag_inventory'].items(),key=lambda kv:-kv[1]);bars('p5-labels','The named fallacies actually recorded',[t for t,v in tags],[v for t,v in tags],'354 label instances on 345 of 5,492 public moves; multiple tags possible','Number of label instances',p['tag_inventory'])

p=R['p6'];fig,ax=plt.subplots(figsize=(7.3,3.7));rng=np.random.default_rng(20260904)
for j,(c,color,label) in enumerate([('earlier',TEAL,'Earlier process (179)'),('later',RUST,'Later process (58)')]):
    vals=[x['midpoint'] for x in p['sequence'] if x['cohort']==c];ax.scatter(vals,j+rng.uniform(-.2,.2,len(vals)),s=15,alpha=.42,c=color)
    mu=p['cohorts'][c]['midpoints']['mean'];ax.scatter(mu,j,s=110,c=NAVY,marker='D');ax.text(mu+.45,j-.27,f'Mean {mu:.2f}',fontsize=10,fontweight='bold')
ax.set_yticks([0,1],['Earlier process (179)','Later process (58)']);ax.set_ylim(-.5,1.5);ax.invert_yaxis();ax.set_xlabel('Average of the two side scores in a debate');ax.set_title('Score levels in two assessment-process families',loc='left');ax.grid(axis='x',color=LIGHT,lw=.5);ax.set_axisbelow(True);fig.tight_layout();save(fig,'p6-levels','Score levels in two assessment-process families','237 debate midpoints; focused score scale','Score points; each dot is one debate',p['sequence'])
fig,ax=plt.subplots(figsize=(6.5,4.4));br=p['bridge'];ax.plot([62,94],[62,94],c=GREY,lw=1,ls='--');ax.scatter([b['earlier'] for b in br],[b['later'] for b in br],s=30,color=TEAL,alpha=.8)
ax.set_xlim(62,94);ax.set_ylim(62,94);ax.set_xlabel('Mean earlier-process score');ax.set_ylabel('Mean later-process score');ax.set_title('51 speakers bridge the two process families',loc='left');ax.text(63,91,'45 lower later; 5 higher; 1 unchanged',fontsize=10);fig.tight_layout();save(fig,'p6-bridge','51 speakers bridge the two process families','One dot per speaker with appearances in both process families','Mean score points',br)
e=p['cohorts']['earlier'];l=p['cohorts']['later'];fig,ax=plt.subplots(figsize=(7.3,3.7));diff=[l['dimensions'][k]-e['dimensions'][k] for k in DIM]
ax.barh(range(6),diff,color=RUST,height=.58)
for i,v in enumerate(diff):ax.text(v-.13,i,f'{v:.2f}',va='center',ha='right',fontsize=10)
ax.set_yticks(range(6),DL);ax.invert_yaxis();ax.set_xlim(-5.5,.1);ax.axvline(0,c=GREY,lw=.8);ax.set_xlabel('Later minus earlier mean (dimension points)');ax.set_title('The change is not an equal shift in every dimension',loc='left');fig.tight_layout();save(fig,'p6-dimensions','The change is not an equal shift in every dimension','Equal debate weighting; 179 earlier, 58 later','Dimension points',{'earlier':e['dimensions'],'later':l['dimensions']})
fig,axs=plt.subplots(1,2,figsize=(7.3,4.0));labels=DL
for ax,c,label in zip(axs,['earlier','later'],['Earlier: 3,423 moves','Later: 1,859 moves']):
    mat=np.array(p['cohorts'][c]['corr']);im=ax.imshow(mat,vmin=-1,vmax=1,cmap='RdBu')
    ax.set_xticks(range(6),labels,rotation=55,ha='right',fontsize=8);ax.set_yticks(range(6),labels,fontsize=8);ax.set_title(label,fontsize=11,loc='left');ax.tick_params(length=0)
    for i in range(6):
        for j in range(6):ax.text(j,i,f'{0 if abs(mat[i,j])<.05 else mat[i,j]:.1f}',ha='center',va='center',fontsize=8,color='white' if abs(mat[i,j])>.6 else NAVY)
fig.subplots_adjust(wspace=.43,bottom=.24,top=.89,right=.91);cax=fig.add_axes([.93,.27,.015,.5]);fig.colorbar(im,cax=cax,label='Move together: -1 to +1')
save(fig,'p6-correlation','How tightly the dimensions move together','Unweighted move-level descriptive correlations; repeated observations','Pearson correlation, -1 to +1',{'earlier':e['corr'],'later':l['corr']})
bars('p6-tags','Moves carrying any fallacy or bias tag',['Earlier process: 87 / 3,423','Later process: 321 / 1,859'],[e['tag_pct'],l['tag_pct']],'5,282 locked moves; pooled rates','Percentage of assessed moves',{'earlier':e['tag_pct'],'later':l['tag_pct']},colors=[TEAL,RUST],percent=True)

# Additional descriptive check: how many distinct score values were used?
score_use={}
fig,axs=plt.subplots(1,2,figsize=(7.3,3.7),sharey=True)
for ax,dimension,label in zip(axs,['precisionClarity','relevanceBurden'],['Clarity','Task']):
    score_use[dimension]={}
    for cohort,color,offset in [('earlier',TEAL,-.23),('later',RUST,.23)]:
        scores=[m['dimensions'][dimension] for m in M if m['cohort']==cohort]
        counts=Counter(scores);n=len(scores)
        score_use[dimension][cohort]={'n':n,'distinct':len(counts),'counts':dict(sorted(counts.items()))}
        ax.bar(np.array(list(counts))+offset,[100*v/n for v in counts.values()],width=.46,color=color,label=cohort.capitalize())
    ax.set_xlim(0,100);ax.set_ylim(0,70);ax.set_xlabel('Exact score out of 100');ax.set_title(label,loc='left')
    ax.grid(axis='y',color=LIGHT,lw=.5);ax.set_axisbelow(True)
axs[0].set_ylabel('Share of moves (%)')
axs[0].text(4,63,'4 distinct marks earlier\n41 distinct marks later',fontsize=9)
axs[1].text(4,63,'Earlier: 63.7%\nreceive exactly 87',fontsize=9)
axs[1].legend(frameon=False,loc='upper left',bbox_to_anchor=(0,.77),fontsize=9)
fig.tight_layout()
assert score_use['precisionClarity']['earlier']['distinct']==4
assert score_use['precisionClarity']['later']['distinct']==41
assert score_use['relevanceBurden']['earlier']['counts'][87]==2179
save(fig,'p6-score-use','Earlier marks cluster at a few exact values','3,423 earlier moves and 1,859 later moves; same frozen source records','Percentage of moves at each score',score_use)

p=R['p7'];ranks=p['ranking'];ac=p['appearance_counts'];bands=[('1 appearance',lambda n:n==1),('2 appearances',lambda n:n==2),('3-5 appearances',lambda n:3<=n<=5),('6-10 appearances',lambda n:6<=n<=10),('11+ appearances',lambda n:n>=11)]
bars('p7-samples','How much evidence is available for each speaker?',[b for b,f in bands],[sum(v for k,v in ac.items() if f(int(k))) for b,f in bands],'158 speakers across 474 eligible appearances; minimum three for rankings','Number of speakers',ac,colors=[GREY,GREY,TEAL,TEAL,TEAL])
fig,ax=plt.subplots(figsize=(7.3,3.6));n=np.arange(1,16);rr=p['repeatability'];rel=rr['between_variance']/(rr['between_variance']+rr['within_variance']/n)
ax.plot(n,rel,c=TEAL,lw=2);ax.scatter([1,3,5,10],[rel[0],rel[2],rel[4],rel[9]],c=TEAL,s=40)
for i in [1,3,5,10]:ax.annotate(f'{rel[i-1]:.2f}',(i,rel[i-1]),xytext=(3,-17),textcoords='offset points',fontsize=10)
ax.set_ylim(0,1);ax.set_xlim(.7,15.4);ax.set_xlabel('Number of appearances averaged');ax.set_ylabel('Estimated repeatability (0 to 1)');ax.set_title('Averaging reduces ordinary performance variation',loc='left');ax.grid(axis='y',color=LIGHT,lw=.5);ax.set_axisbelow(True);fig.tight_layout();save(fig,'p7-repeatability','Averaging reduces ordinary performance variation','One-way repeatability model fitted to 334 appearances by 50 speakers; conditional projection','Reliability ratio, not probability of correctness',rr)
fig,ax=plt.subplots(figsize=(7.3,6.1));top=ranks[:15]
for i,r in enumerate(top):
    ax.plot(r['model_rank_ci'],[i+.12]*2,color=RUST,lw=2.4,ls='--')
    ax.plot(r['empirical_rank_ci'],[i-.12]*2,color=TEAL,lw=2.4)
    ax.scatter(r['rank'],i,c=NAVY,s=20,zorder=4)
ax.set_xticks([1,5,10,15,20,25,30])
ax.set_yticks(range(15),[f"{r['speaker']} ({r['n']})" for r in top],fontsize=9);ax.invert_yaxis();ax.set_xlim(.5,32);ax.set_xlabel('Rank within the fixed 50-speaker field (1 = highest)');ax.set_title('Current leaders: two ways to check their places',loc='left');ax.plot([],[],c=TEAL,lw=2,label='Resampled ranks');ax.plot([],[],c=RUST,lw=2,ls='--',label='Model ranks');ax.scatter([],[],c=NAVY,s=20,label='Current place');ax.legend(frameon=False,fontsize=9,loc='upper center',bbox_to_anchor=(.5,-.11),ncol=3);ax.grid(axis='x',color=LIGHT,lw=.5);ax.set_axisbelow(True);fig.tight_layout();save(fig,'p7-ranges','Current leaders: two ways to check their places','15 highest recorded averages; calculations include all 50 eligible speakers','Rank positions',top)
fig,ax=plt.subplots(figsize=(7.3,3.6));ax.scatter([r['n'] for r in ranks],[r['model_rank_ci'][1]-r['model_rank_ci'][0] for r in ranks],c=TEAL,s=35,alpha=.8)
for name in ['Matt Dillahunty','Ben Watkins','Ross Douthat']:
    r=next(r for r in ranks if r['speaker']==name);ax.annotate(name,(r['n'],r['model_rank_ci'][1]-r['model_rank_ci'][0]),xytext=(4,4),textcoords='offset points',fontsize=8)
ax.set_xlabel('Number of assessed appearances');ax.set_ylabel('Width of 95% model rank range');ax.set_title('Sample size helps, but position in the field matters too',loc='left');ax.set_xlim(0,34);ax.set_ylim(0,36);ax.grid(axis='y',color=LIGHT,lw=.5);ax.set_axisbelow(True);fig.tight_layout();save(fig,'p7-counts-width','Sample size helps, but position in the field matters too','50 ranked speakers; fitted pooled-variation model','Appearances / rank positions',ranks)
bars('p7-top10','How often does each person reach the model top ten?',[r['speaker'] for r in ranks[:12]],[100*r['model_top10'] for r in ranks[:12]],'20,000 model calculations; fixed group of 50; current top 12 shown','Share of model calculations in top ten (%)',ranks[:12],percent=True)

# Teaching example, explicitly separate from the measured debate results.
examples=[('Same order',[1,2,3,4,5],1.0),('B and C swap',[1,3,2,4,5],.9),('Reverse order',[5,4,3,2,1],-1.0)]
fig,axs=plt.subplots(1,3,figsize=(7.3,3.5),sharey=True)
for ax,(label,places,expected) in zip(axs,examples):
    result=float(spearmanr(range(1,6),places).statistic);assert abs(result-expected)<1e-12
    for i,(name,rank2) in enumerate(zip('ABCDE',places),1):
        color=TEAL if name=='B' else RUST if name=='C' else GREY
        ax.plot([0,1],[i,rank2],color=color,lw=1.8,alpha=.85)
        ax.text(-.10,i,f'{i}  {name}',ha='right',va='center',fontsize=10,color=color)
        ax.text(1.10,rank2,f'{name}  {rank2}',ha='left',va='center',fontsize=10,color=color)
    ax.set_xlim(-.45,1.45);ax.set_ylim(5.6,.3);ax.set_xticks([0,1],['List 1','List 2']);ax.set_yticks([])
    ax.set_title(f'{label}\nAgreement {result:+.2f}',loc='center',fontsize=11)
    for spine in ax.spines.values():spine.set_visible(False)
fig.tight_layout(w_pad=1.4)
save(fig,'p7-order-example','How similar are two orders?','Illustration only: five invented speakers, not assessment data','Spearman rank correlation from -1 to +1',{'illustrative':True,'examples':examples})
assert set(READING)=={c['id'] for c in CONTRACTS}
(HERE/'revision-checks.json').write_text(json.dumps({'score_use':score_use,'spearman_examples':examples},indent=2)+'\n')
(HERE/'chart-contracts.json').write_text(json.dumps(CONTRACTS,indent=2,ensure_ascii=False)+'\n')
print(f'Created {len(CONTRACTS)} figures, each in PNG and embedded-font PDF form.')
