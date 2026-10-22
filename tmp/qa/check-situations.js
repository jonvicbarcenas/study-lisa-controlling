async(page)=>{
 const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/controlling-study.html#home');
 const data=await page.evaluate(()=>({total:QUESTIONS.length,cases:SCENARIOS.length,ids:QUESTIONS.map(q=>q.id),counts:LESSONS.map((_,i)=>SCENARIOS.filter(q=>q.lesson===i).length),valid:SCENARIOS.every(q=>q.options.length===4&&q.rationale.length===4&&q.correct>=0&&q.correct<4&&q.story&&q.clue&&q.why&&q.rationale.every(Boolean))}));
 assert(data.total===70&&data.cases===24&&data.valid,'Scenario data invalid');
 assert(data.counts.every(n=>n===3),'Expected 3 situations per lesson');
 assert(new Set(data.ids).size===70,'Duplicate question IDs');
 // Simulate previously saved progress and an original quiz in this isolated QA browser.
 await page.evaluate(()=>{const s=freshState();Object.assign(s,{read:[0],known:[0],solved:[0],notes:{0:'My existing note'},awards:['lesson:0','card:0','quiz:0'],session:{items:[{id:0,order:[0,1,2,3]}],answers:[null],pos:0,done:false,review:false}});localStorage.setItem(STORE_KEY,JSON.stringify(s));});
 await page.reload();
 const legacy=await page.evaluate(()=>({read:state.read[0],known:state.known[0],solved:state.solved[0],note:state.notes[0],xp:xpTotal(),id:state.session.items[0].id}));
 assert(legacy.xp===40&&legacy.note==='My existing note'&&legacy.id===0,'Existing progress changed');
 await page.locator('.nav [data-go="quiz"]').click();
 assert(await page.locator('.scenario-story').count()===0,'Original question unexpectedly became a scenario');
 await page.locator('[data-action="quiz-setup"]').click();
 assert(await page.locator('#quiz-kind').inputValue()==='situational','Situational mode should be selected by default');
 await page.locator('#quiz-topic').selectOption('5');
 await page.locator('#quiz-size').selectOption('all');
 await page.locator('[data-action="start-quiz"]').click();
 assert(await page.evaluate(()=>state.session.items.length)===3,'Topic filter did not yield 3 scenarios');
 await page.locator('[data-action="quiz-setup"]').click();
 await page.locator('#quiz-topic').selectOption('all');
 await page.locator('#quiz-kind').selectOption('core');
 assert(await page.locator('#quiz-size option[value="all"]').textContent()==='Full selection · 46','Core bank count changed');
 await page.locator('#quiz-kind').selectOption('all');
 assert(await page.locator('#quiz-size option[value="all"]').textContent()==='Full selection · 70','Mixed count incorrect');
 await page.locator('#quiz-kind').selectOption('situational');
 await page.locator('#quiz-size').selectOption('all');
 await page.locator('[data-action="start-quiz"]').click();
 assert(await page.evaluate(()=>state.session.items.length)===24,'Full situation bank should contain 24');
 assert(await page.locator('.scenario-feedback').count()===0,'Clue revealed before answering');
 // Miss one situation, answer the other 23 correctly, and inspect every explanation.
 for(let i=0;i<24;i++){
  const info=await page.evaluate(()=>{const q=QUESTIONS[state.session.items[state.session.pos].id];return {correct:q.correct,story:q.story,id:q.id};});
  assert(await page.locator('.scenario-story').count()===1,'Missing scenario story at '+i);
  const pick=i===0?(info.correct+1)%4:info.correct;
  await page.locator('[data-quiz-answer="'+pick+'"]').click();
  assert(await page.locator('.scenario-feedback').count()===1,'Missing clue after answer at '+i);
  await page.locator('.distractor-review summary').click();
  assert(await page.locator('.distractor-review li').count()===3,'Missing distractor explanations at '+i);
  assert(await page.locator('[data-quiz-answer]:disabled').count()===4,'Answered options not locked');
  if(i===0){await page.reload();assert(await page.locator('.feedback.wrong').count()===1,'Scenario answer not restored');}
  await page.locator('[data-action="next-question"]').click();
 }
 assert(await page.getByRole('heading',{name:'23 out of 24 correct',exact:true}).count()===1,'Situation score wrong');
 await page.locator('.result-review > details').first().locator('summary').first().click();
 assert(await page.locator('.result-review > details').first().locator('.scenario-story').count()===1,'Scenario not in results review');
 await page.locator('[data-action="retry-round"]').click();
 const correct=await page.evaluate(()=>QUESTIONS[state.session.items[0].id].correct);
 await page.locator('[data-quiz-answer="'+correct+'"]').click();
 await page.locator('[data-action="next-question"]').click();
 assert(await page.evaluate(()=>state.missed.length)===0,'Correct retry not removed from missed pile');
 assert(await page.evaluate(()=>state.solved.filter(id=>QUESTIONS[id].situational).length)===24,'Case mastery incomplete');
 await page.locator('.nav [data-go="home"]').click();
 assert((await page.locator('.scenario-progress').textContent()).includes('24 / 24'),'Scenario progress missing on home');
 await page.locator('[data-action="start-situational"]').click();
 assert(await page.evaluate(()=>state.session.items.length===10&&state.session.items.every(it=>QUESTIONS[it.id].situational)),'Home CTA did not start 10 scenario questions');
 // Check the longer stories and feedback on a phone, including a detailed example screenshot.
 await page.setViewportSize({width:375,height:812});
 const answer=await page.evaluate(()=>QUESTIONS[state.session.items[0].id].correct);
 await page.locator('[data-quiz-answer="'+answer+'"]').click();
 await page.locator('.distractor-review summary').click();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile scenario overflow');
 await page.screenshot({path:'tmp/qa/situational-phone.png',fullPage:true,animations:'disabled'});
 await page.context().setOffline(true);
 await page.locator('[data-action="next-question"]').click();
 assert(await page.locator('.scenario-story').count()===1,'Offline scenario navigation failed');
 await page.context().setOffline(false);
 await page.setViewportSize({width:1440,height:1000});
 await page.screenshot({path:'tmp/qa/situational-desktop.png',fullPage:true,animations:'disabled'});
 assert(errors.length===0,'JS errors: '+errors.join(';'));
 await page.evaluate(()=>{localStorage.removeItem(STORE_KEY);});
 await page.goto('http://127.0.0.1:8765/controlling-study.html#home');
 await page.screenshot({path:'tmp/qa/situational-home.png',fullPage:true,animations:'disabled'});
 return {status:'PASS',totalQuestions:data.total,situations:data.cases,perLesson:data.counts,legacyProgress:legacy,wrongAnswerRetry:true,explanations:true,mobile:true,offline:true,javascriptErrors:errors};
}
