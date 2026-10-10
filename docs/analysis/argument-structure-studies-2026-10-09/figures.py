"""Render source-bound research figures for the PDFs and existing Insights page."""
from pathlib import Path
import json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
HERE=Path(__file__).resolve().parent
R=json.loads((HERE/'results.json').read_text())
OUT=HERE/'figures';OUT.mkdir(exist_ok=True)
INK='#17354B';TEAL='#137D82';RED='#B64A3A';GOLD='#946C13';GREY='#637581';PALE='#E5EEEF'
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':11,'axes.labelcolor':INK,'text.color':INK,'xtick.color':GREY,'ytick.color':INK,'axes.spines.top':False,'axes.spines.right':False,'axes.spines.left':False,'axes.spines.bottom':False,'savefig.facecolor':'white'})
contracts=[]
def finish(fig,key,title,scope,reading,inputs):
    fig.savefig(OUT/f'{key}.png',dpi=190,bbox_inches='tight',pad_inches=.22)
    plt.close(fig)
    from PIL import Image
    with Image.open(OUT/f'{key}.png') as im:w,h=im.size
    contracts.append(dict(id=key,title=title,scope=scope,reading=reading,inputs=inputs,width=w,height=h))

g=R['reply_graph'];values=[g['reply_to_reply_edges'],g['edges']-g['reply_to_reply_edges']]
fig,ax=plt.subplots(figsize=(7.8,4.2));fig.subplots_adjust(left=.31,bottom=.18,right=.95,top=.78)
fig.suptitle('What is a recorded reply answering?',x=.03,ha='left',fontsize=17,fontweight='bold')
fig.text(.03,.84,'2,978 links from 2,444 replies · 112 debates',color=GREY,fontsize=11)
ax.barh([1,0],values,color=[TEAL,GOLD],height=.44)
for y,v in zip([1,0],values):ax.text(v+30,y,f'{v:,}  ({v/g["edges"]:.1%})',va='center',fontweight='bold',fontsize=11)
ax.set_yticks([1,0],['Another reply','A constructive\nargument']);ax.set_xlim(0,2300);ax.set_xticks([0,500,1000,1500,2000]);ax.set_xlabel('Recorded reply-to-target links');ax.grid(axis='x',alpha=.15);ax.set_axisbelow(True);ax.tick_params(length=0)
finish(fig,'p8-targets','Most recorded links lead to another reply','112 later-process comparable debates; links, not unique replies.','Bar length counts recorded links. A reply can have more than one target. Teal means its target is another reply; gold means a constructive argument. Both bars start at zero. These categories describe the stored links, not whether a reply succeeds.',dict(reply=values[0],constructive=values[1],denominator=g['edges']))

fig,ax=plt.subplots(figsize=(7.5,7.1));ax.set_xlim(0,1);ax.set_ylim(0,1);ax.axis('off')
ax.text(0,1,'A cause is not every further conclusion',fontsize=17,fontweight='bold',va='top')
ax.text(0,.925,'Five distinct questions · not a required sequence',fontsize=11,color=GREY)
nodes=[('1','Foundation or cause','Why must there be this kind of source?'),('2','Intelligence or agency','Why a mind rather than an impersonal source?'),('3','Purposes and goodness','Why these preferences or moral attributes?'),('4','Unlimited attributes','Why without limits—and why this combination?'),('5','Religious identification','What distinguishes this revelation or tradition?')]
for i,(n,title,desc) in enumerate(nodes):
    y=.78-i*.163
    ax.add_patch(FancyBboxPatch((.0,y),.99,.128,boxstyle='round,pad=.005,rounding_size=.014',facecolor='#F4F8F8',edgecolor='#CADDDD'))
    ax.text(.042,y+.078,n,color=TEAL,fontweight='bold',fontsize=24,va='center')
    ax.text(.125,y+.082,title,fontsize=13,fontweight='bold',va='center')
    ax.text(.125,y+.038,desc,fontsize=10.5,va='center')
ax.text(0,.018,'A biological designer is not necessarily a cosmic creator.\nArguments may enter at different points or combine several routes.',fontsize=10,color=GREY,va='bottom')
finish(fig,'p9-bridges','Keep the next claim visible','An explanatory framework illustrated by eight passages in six debates.','The numbered boxes identify distinct claims and the question needed to support each. They are not measured frequencies, proof steps, or a ranking of religions. A successful argument for one claim does not automatically establish the others.',nodes)

pairs=json.loads((HERE/'repeated-pairs.json').read_text())
fig,ax=plt.subplots(figsize=(8.1,8.0));fig.subplots_adjust(left=.46,right=.96,top=.89,bottom=.095)
fig.suptitle('Most repeated pairs keep the same lead',x=.02,ha='left',fontsize=16,fontweight='bold')
fig.text(.02,.925,'Score margin: first named person minus second',fontsize=10.5,color=GREY)
for y,p in enumerate(pairs):
    vals=[e['first_minus_second'] for e in p['entries']]
    color=RED if p['strict_reversal'] else TEAL
    ax.plot([min(vals),max(vals)],[y,y],color=color,lw=2,zorder=1)
    for e in p['entries']:
        ax.scatter(e['first_minus_second'],y,marker='o' if e['cohort']=='earlier' else 's',s=35,color=color,edgecolors='white',linewidth=.6,zorder=2)
ax.axvline(0,color=GREY,lw=1,ls='--');ax.set_yticks(range(len(pairs)),[' / '.join(p['speakers']) for p in pairs],fontsize=8.7)
ax.invert_yaxis();ax.set_xlim(-19,20);ax.set_xticks([-15,-10,-5,0,5,10,15,20]);ax.set_xlabel('Overall score difference (points / 100)',fontsize=10)
ax.tick_params(length=0);ax.grid(axis='x',alpha=.15);ax.set_axisbelow(True)
fig.text(.02,.022,'Circles: earlier procedure   Squares: later procedure\nRed: the lead changes sides. A tie alone is not a reversal.',fontsize=9,color=GREY)
finish(fig,'p10-pairs','Only two of 21 repeated pairs reverse their lead','43 debates; all repeated pairs in the comparable archive.','Each row is one pair. A mark gives the first named person’s score minus the second’s in one meeting. Circles use the earlier procedure; squares use the later one. The line joins the smallest and largest margins. Red rows cross zero with strictly opposite leads. Overlapping marks can hide repeated identical margins. These are observed meetings, not uncertainty intervals.',pairs)

labels=['Same person only','+ procedure and role','+ broad topic','Equal weight per person','Opponent: 5+ other appearances','Earlier procedure only','Later procedure only','Same-procedure opponent average']
keys=list(R['models']); vals=[R['models'][k]['own_score_change_per_5_opponent_points'] for k in keys]
fig,ax=plt.subplots(figsize=(8,5.5));fig.subplots_adjust(left=.49,right=.96,top=.82,bottom=.16)
fig.suptitle('The small association is not dependable',x=.02,ha='left',fontsize=17,fontweight='bold')
fig.text(.02,.88,'Own-score change for a 5-point higher opponent average',fontsize=11,color=GREY)
ax.axvline(0,color=GREY,lw=1,ls='--');ax.scatter(vals,range(8),s=65,c=[TEAL]*7+[RED])
for i,v in enumerate(vals):ax.text(v+(.04 if v>=0 else -.04),i,f'{v:+.2f}',ha='left' if v>=0 else 'right',va='center',fontsize=10,fontweight='bold')
ax.set_yticks(range(8),labels,fontsize=10);ax.invert_yaxis();ax.set_xlim(-1.15,.4);ax.set_xticks([-1,-.5,0]);ax.set_xlabel('Fitted difference in own score (points / 100)',fontsize=10)
ax.grid(axis='x',alpha=.15);ax.set_axisbelow(True);ax.tick_params(length=0)
finish(fig,'p10-models','The opponent association depends on the comparison set','Eight descriptive specifications; eligibility changes in several checks.','Each dot is a fitted association, not a causal effect or uncertainty interval. Negative values mean a lower own score with a higher opponent average elsewhere. All meetings of the pair are excluded from that opponent average. The red final row also requires those outside scores to use the same procedure; its eligible sample is smaller. There are no error bars because sampling uncertainty is not estimated.',[dict(key=k,label=l,**R['models'][k]) for k,l in zip(keys,labels)])
(HERE/'chart-contracts.json').write_text(json.dumps(contracts,indent=2,ensure_ascii=False)+'\n')
print('Rendered',len(contracts),'source-bound figures')
