"""Clause boundaries, family paths, nested constituents and technical markers."""
import copy
import json
from pathlib import Path
import yaml
from author_source_figures import bi,item

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[3]


def main():
    paths={};lessons={}
    for p in (ROOT/'backend/app/curriculum/content/acts').glob('*/*/*.yaml'):
        if p.name=='unit.yaml':continue
        d=yaml.safe_load(p.read_text('utf-8'));paths[d['id']]=p;lessons[d['id']]=d
    changed=set();figures=0
    def add(lid,cid,figure):
        nonlocal figures
        card=next(c for c in lessons[lid]['cards'] if c['id']==cid)
        card['visuals']=[v for v in card.get('visuals',[]) if v['id']!=figure['id']];card['visuals'].insert(0,figure);changed.add(lid);figures+=1
    for lid in ['syn.if','avy.iti']:
        card=next(c for c in lessons[lid]['cards'] if c['id']=='t1')
        for i,example in enumerate(card['examples']):
            words=example['words']
            if lid=='syn.if':
                at=next(n for n,w in enumerate(words) if w['sa']=='तर्हि')
                left=words[:at];right=words[at:]
                nodes=[{'id':'condition','sa':' '.join(w['sa'] for w in left),'words':copy.deepcopy(left),'label':bi('Condition','शर्त')},
                       {'id':'result','sa':' '.join(w['sa'] for w in right),'words':copy.deepcopy(right),'label':bi('Result within this conditional statement','इस शर्त वाले कथन का परिणाम')}]
                edges=[{'source':'condition','target':'result','label':bi('If the condition holds, this is the stated result','शर्त पूरी हो तो कथन यह परिणाम बताता है')}]
                explanation=bi('Keep the two clauses distinct. These examples illustrate choices of tense and mood; context determines the intended kind of condition.',
                               'दोनों उपवाक्यों को अलग पहचानें। ये उदाहरण काल और अर्थवृत्ति के चुनाव दिखाते हैं; शर्त का अभिप्राय सन्दर्भ से तय होता है।')
            else:
                at=next(n for n,w in enumerate(words) if w['sa']=='इति')
                nodes=[item(0,words[0],bi('Speaker or thinker','बोलने या सोचने वाला')),
                       {'id':'quote','sa':' '.join(w['sa'] for w in words[1:at]),'words':copy.deepcopy(words[1:at]),'label':bi('Quoted words or thought','उद्धृत वचन या विचार')},
                       item(2,words[at],bi('Quotation boundary','उद्धरण की सीमा')),item(3,words[-1],bi('Reporting action','कहने या सोचने की क्रिया'))]
                edges=[{'source':'quote','target':'i2','label':bi('इति follows the quotation','उद्धरण के बाद इति')},
                       {'source':'i0','target':'i3','label':bi('who speaks or thinks','जो कहता या सोचता है')},
                       {'source':'quote','target':'i3','label':bi('the words being reported','बताए जा रहे शब्द')}]
                explanation=bi('The words inside the quotation use the quoted speaker’s viewpoint. The narrator’s reporting verb remains outside it.',
                               'उद्धरण के शब्द उद्धृत वक्ता के दृष्टिकोण से हैं। कथावाचक की कहने वाली क्रिया उसके बाहर रहती है।')
            nodes.insert(0,item(99,example,bi('Unchanged source sentence','मूल वाक्य')))
            add(lid,'t1',{'id':'v-structure-'+str(i),'kind':'relations','title':bi('Read the clause boundaries','उपवाक्य की सीमाएँ पढ़ें'),'explanation':explanation,'items':nodes,'edges':edges})
    for i,(first,second,result,en,hi) in enumerate([
        ('पितुः','माता','पितामही',"Father’s mother","पिता की माता"),
        ('मातुः','पिता','मातामहः',"Mother’s father","माता के पिता")]):
        add('of.family','t2',{'id':'v-family-path-'+str(i),'kind':'relations','title':bi(en,hi),'items':[
            {'id':'self','label':bi('The speaker','बोलने वाला')},
            {'id':'parent','sa':first,'meaning':bi('father' if i==0 else 'mother','पिता' if i==0 else 'माता')},
            {'id':'grandparent','sa':second,'meaning':bi(en,hi)},
            {'id':'name','sa':result,'meaning':bi('Name of this relationship','इस रिश्ते का नाम')}],
            'edges':[{'source':'self','target':'parent','label':bi('First follow this parent','पहले इस अभिभावक तक जाएँ')},
                     {'source':'parent','target':'grandparent','label':bi('Then follow that person’s parent','फिर उनके अभिभावक तक जाएँ')},
                     {'source':'grandparent','target':'name','label':bi('This is the grandparent named here','इस पथ से यही रिश्ता मिलता है')}]})
    add('c2.long','tb1',{'id':'v-nested-constituents','kind':'sequence','title':bi('Nested groups, then the whole referent','भीतर के समूह, फिर पूरा अभिप्राय'),
        'explanation':bi('Brackets below are reading aids. Identify the relationship at each join and check the whole compound in context.',
                         'नीचे के कोष्ठक पढ़ने की सहायता हैं। हर जोड़ का सम्बन्ध पहचानें और पूरे समास को सन्दर्भ में जाँचें।'),
        'items':[{'id':'whole','sa':'सूर्यकोटिसमाभासः','meaning':bi('Shining like ten million suns.','करोड़ सूर्यों-सा चमकने वाला।')},
                 {'id':'parts','sa':'[ सूर्य + कोटि ] + सम + आभास','meaning':bi('First group sun and ten million. Then connect the comparison and brightness.','पहले सूर्य और कोटि को समूहित करें। फिर समानता और आभास को जोड़ें।')},
                 {'id':'comparison','sa':'[ [ सूर्य + कोटि ] + सम ] + आभास','meaning':bi('The comparison belongs to the brightness, not to an isolated word read without context.','समानता आभास के सम्बन्ध में है; शब्दों को सन्दर्भ से अलग न पढ़ें।')},
                 {'id':'referent','sa':'सूर्यकोटिसमाभासः','meaning':bi('Return to the person or thing described by the complete expression.','पूरे पद से वर्णित व्यक्ति या वस्तु पर लौटें।')}]})
    for i,(before,marker,after) in enumerate([('तिप्','प्','ति'),('लँट्','अँ + ट्','ल्')]):
        add('pg.it','t1',{'id':'v-marker-removal-'+str(i),'kind':'sequence','title':bi('Name the marker, then remove it','इत् पहचानें, फिर लोप करें'),
            'items':[{'id':'taught','sa':before,'label':bi('The taught technical form','उपदेश का तकनीकी रूप')},
                     {'id':'marker','sa':marker,'label':bi('The marker elements in this example','इस उदाहरण के इत् तत्व')},
                     {'id':'result','sa':after,'compare_from':before,'label':bi('What remains after marker deletion','इत्-लोप के बाद शेष रूप')}],
            'explanation':bi('These are technical examples. A sound is not deleted merely because the same letter occurs in an ordinary word.',
                             'ये तकनीकी उदाहरण हैं। सामान्य शब्द में वही अक्षर दिख जाने से उसका लोप नहीं किया जाता।')})
    add('kss.naming','tb1',{'id':'v-kss-inner-compound','kind':'sequence','title':bi('Inside कामदेवावतारः','कामदेवावतारः के भीतर'),
        'items':[{'id':'whole','sa':'कामदेवावतारः','meaning':bi('An incarnation of Kāmadeva.','कामदेव का अवतार।')},
                 {'id':'members','sa':'कामदेव + अवतारः','meaning':bi('Identify the two members before reading the surrounding sentence.','आसपास का वाक्य पढ़ने से पहले दोनों सदस्य पहचानें।')},
                 {'id':'join','sa':'कामदेवावतारः','compare_from':'कामदेव अवतारः','check':{'type':'sandhi','first':'कामदेव','second':'अवतारः','joined':'कामदेवावतारः'},
                  'meaning':bi('The adjoining अ vowels merge into आ. Return to the source phrase and its referent.','पास-पास आए अ मिलकर आ होते हैं। मूल पद और उसके अभिप्राय पर लौटें।')}]})
    for lid in changed:paths[lid].write_text(yaml.safe_dump(lessons[lid],allow_unicode=True,sort_keys=False,width=120),encoding='utf-8')
    (HERE/'structural-figures.json').write_text(json.dumps({'figures':figures,'lessons':sorted(changed)},indent=2)+'\n','utf-8');print(figures,'structural figures')


if __name__=='__main__':main()
