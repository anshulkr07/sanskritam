"""Extend the existing acceptance harness with the real reading fixtures."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / "mobile/scripts/check-story.mjs"
text = path.read_text(encoding="utf-8")


def replace(old, new):
    global text
    assert text.count(old) == 1, old[:100]
    text = text.replace(old, new)


replace("const {derive, courseOrder} = load('state.ts');", "const readingFixtures=JSON.parse(readFileSync(new URL('../src/story/__fixtures__/readings.json',import.meta.url),'utf8'));\nObject.assign(lessons,readingFixtures.lessons);\nconst {derive, courseOrder} = load('state.ts');")
replace("import pack from '../__fixtures__/pack.json';", "import pack from '../__fixtures__/pack.json';import readingPack from '../__fixtures__/readings.json';import UnitSheet from '../screens/UnitSheet';import {courseOrder} from '../state';Object.assign(pack.lessons,readingPack.lessons);")
replace("[point,setPoint]=useState('new');", "[point,setPoint]=useState('new'),[readingUnit,setReadingUnit]=useState('who-does');const allRequired=courseOrder(readingPack.index).filter(s=>s.lesson_id&&s.role!=='reading'&&s.role!=='revision').map(s=>s.lesson_id);const readingState=derive(readingPack.index,allRequired);")
replace("window.qa={fixture:", "window.qa={showUnitReading:id=>{setReadingUnit(id);setMode('readingUnit');},fixture:")
replace("{mode==='review'?<StoryReview/>", "{mode==='readingUnit'?<UnitSheet index={readingPack.index} state={readingState} unitId={readingUnit} onClose={()=>setMode('home')} onLesson={id=>{setLesson(id);setMode('lesson');setDone(false);}}/>:mode==='review'?<StoryReview/>")
replace(" // A Hindi, enlarged-text sample remains scrollable at phone width.", """ // Optional readings remain available in completed units and open the shared player.
 for(const theme of ['light','dark']){
  await page.evaluate(theme=>window.qa.theme(theme),theme);
  await page.evaluate(()=>window.qa.showUnitReading('who-does'));await button(readingFixtures.lessons['who.reading'].title.en).waitFor();await shot('unit-reading-'+theme);await button(readingFixtures.lessons['who.reading'].title.en).click();await page.getByTestId('lesson-card-0').waitFor();await button('Gloss: बालकः',page.getByTestId('lesson-card-0')).click();await page.getByText('boy',{exact:true}).waitFor();await shot('reading-gloss-'+theme);
 }
 for(const [id,l] of Object.entries(readingFixtures.lessons).filter(([,l])=>l.template==='episode')){
  await page.evaluate(id=>window.qa.showLesson(id),id);
  for(let i=0;i<l.cards.length;i++){
   const card=l.cards[i],scope=page.getByTestId('lesson-card-'+i);await scope.waitFor();
   if(card.kind==='practice'){const correct=card.options.find(o=>o.correct);await button(correct.text.en,scope).click();}
   if(i===l.cards.length-1)await button('Finish lesson').click();else await button('Continue').click();
  }
  await page.waitForFunction(()=>document.querySelector('#qa-state').dataset.done==='true');await page.waitForTimeout(100);
  const writes=posts.filter(p=>p.body.lesson_id===id);assert.deepEqual(writes.map(w=>w.path),['/progress/card-lesson','/learn/attempts']);assert.equal(writes[0].body.checks_right,2);assert.equal(writes[0].body.checks_total,2);
 }
 for(const [id,card] of [['vs.revision','blocked'],['m1.revision','exceptions'],['split.revision','conditions']]){await showCard(id,card);await shot('revision-'+readingFixtures.lessons[id].cards.find(c=>c.id===card).section+'-dark');}
 console.log('Four real Sanskrit episodes completed with ordered posts; word glosses, optional unit links and three revision sections passed');
 // A Hindi, enlarged-text sample remains scrollable at phone width.""")
replace("'review attempts only','320/430/tablet/landscape fitting'", "'review attempts only','four optional Sanskrit episodes and glosses','optional/blocked/splitting revision sections','320/430/tablet/landscape fitting'")
path.write_text(text, encoding="utf-8")
print("Reading acceptance cases added to the existing harness")
