"""Record approved image text with surgical YAML edits; leave lesson teaching intact."""
import copy,hashlib,json,sys
from pathlib import Path
import yaml
from yaml.nodes import MappingNode,SequenceNode,ScalarNode
OUT=Path(__file__).resolve().parent;ROOT=OUT.parents[1]
sys.path.insert(0,str(ROOT/'backend'))
from app.curriculum import CONTENT_DIR,load

jobs=json.loads((OUT/'jobs.json').read_text(encoding='utf-8'))
wanted={job['id']:job['expected'] for job in jobs if job['expected']}
new_brief=('The glowing palm leaf shows its established first line in four clear vowel groups, '
           'and beneath it a second clear line of Devanagari syllables with vowel signs. '
           'The marks above, below, before and after the consonants are legible and correctly placed. '
           'Dhūmaka points at the second line; Dādī leans in, spectacles on.')
new_alt={'en':'The glowing leaf shows vowel groups and a clear line of syllables with vowel signs, while the little ghost points and the grandmother looks on',
         'hi':'चमकते पत्र पर स्वर-समूह और मात्राओं वाले स्पष्ट अक्षर हैं; नन्हा भूत संकेत करता है और दादी देखती हैं।'}
found=set();changes=[];pending=[]
def quote(value):return json.dumps(value,ensure_ascii=False)
def mappings(value):
    if isinstance(value,dict):
        yield value
        for item in value.values():yield from mappings(item)
    elif isinstance(value,list):
        for item in value:yield from mappings(item)
def nodes(value):
    if isinstance(value,MappingNode):
        yield value
        for _,item in value.value:yield from nodes(item)
    elif isinstance(value,SequenceNode):
        for item in value.value:yield from nodes(item)
for path in sorted(CONTENT_DIR.rglob('*.yaml')):
    raw=path.read_bytes();text=raw.decode('utf-8');parsed=yaml.safe_load(text)
    expected=copy.deepcopy(parsed);tree=yaml.compose(text);edits=[]
    for node in nodes(tree):
        fields={key.value:value for key,value in node.value}
        ident=fields.get('id')
        if not isinstance(ident,ScalarNode) or ident.value not in wanted or 'brief' not in fields or 'alt' not in fields:continue
        key=ident.value;found.add(key);value=quote(wanted[key]);existing=fields.get('text_in_image')
        if existing is not None:
            end=existing.end_mark.index
            if isinstance(existing,SequenceNode) and not existing.flow_style and existing.value:end=existing.value[-1].end_mark.index
            edits.append((existing.start_mark.index,end,value))
        elif node.flow_style:
            edits.append((node.end_mark.index-1,node.end_mark.index-1,', text_in_image: '+value))
        else:
            eol=text.find('\n',ident.end_mark.index)
            if eol<0:eol=len(text);insertion='\n'
            else:eol+=1;insertion=''
            newline='\r\n' if '\r\n' in text else '\n'
            indent=' '*node.value[0][0].start_mark.column
            edits.append((eol,eol,insertion+indent+'text_in_image: '+value+newline))
        if key=='vowels-signs-second-line':
            brief=fields['brief'];edits.append((brief.start_mark.index,brief.end_mark.index,quote(new_brief)))
            alt=fields['alt']
            for lang,scalar in alt.value:edits.append((scalar.start_mark.index,scalar.end_mark.index,quote(new_alt[lang.value])))
    if not edits:continue
    for value in mappings(expected):
        key=value.get('id')
        if key in wanted and 'brief' in value and 'alt' in value:
            value['text_in_image']=wanted[key]
            if key=='vowels-signs-second-line':value.update(brief=new_brief,alt=new_alt)
    result=text
    for start,end,replacement in sorted(edits,reverse=True):result=result[:start]+replacement+result[end:]
    assert yaml.safe_load(result)==expected, 'An edit affected content outside image metadata: '+str(path)
    final=result.encode('utf-8')
    if final!=raw:
        assert CONTENT_DIR.resolve() in path.resolve().parents
        pending.append((path,final));changes.append({'file':str(path.relative_to(ROOT)),'before_sha256':hashlib.sha256(raw).hexdigest(),'after_sha256':hashlib.sha256(final).hexdigest()})
assert found==set(wanted), 'Cannot locate image metadata: '+repr(set(wanted)-found)
if '--check' in sys.argv:
    print(f'Planned {len(found)} image-text lists in {len(pending)} YAML files; semantic comparison confirms teaching content is preserved.')
    raise SystemExit(0)
for path,raw in pending:path.write_bytes(raw)
loaded=load(CONTENT_DIR)
assert not loaded.issues, '\n'.join(map(str,loaded.issues))
(OUT/'content-integration.json').write_text(json.dumps({'text_images':len(found),'changes':changes,'teaching_content_unchanged':True},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'{len(found)} canonical image-text lists recorded; {len(changes)} YAML files changed; teaching content preserved.')
