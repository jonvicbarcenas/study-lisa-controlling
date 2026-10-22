async (page) => {
 const assert=(ok,message)=>{if(!ok)throw new Error(message);};
 const errors=[]; page.on('pageerror',err=>errors.push(err.message));
 await page.reload();
 await page.evaluate(()=>{localStorage.removeItem('control-quest-v1');});
 await page.reload();
 await page.getByRole('button',{name:'Learn',exact:true}).click();
 await page.locator('.notes summary').click();
 await page.locator('#lesson-note').fill('My recall note: before, during, after. <safe>');
 await page.reload();
 await page.locator('.notes summary').click();
 assert(await page.locator('#lesson-note').inputValue()==='My recall note: before, during, after. <safe>','Personal note did not survive reload');
 await page.getByRole('button',{name:'Got it · complete lesson',exact:true}).click();
 assert(await page.locator('#xp-value').textContent()==='25 XP','Lesson XP incorrect');
 await page.reload();
 assert(await page.locator('#side-progress-detail').textContent()==='1 of 8 lessons explored','Lesson progress did not persist');
 // Complete the remaining lessons through the actual UI.
 for(let i=1;i<8;i++){
  await page.locator('.lesson-menu [data-lesson="'+i+'"]').click();
  await page.getByRole('button',{name:'Got it · complete lesson',exact:true}).click();
 }
 assert(await page.locator('#xp-value').textContent()==='200 XP','Eight lessons should grant 200 XP');
 await page.getByRole('button',{name:'Flashcards',exact:true}).click();
 await page.getByRole('button',{name:'Reveal answer',exact:true}).click();
 await page.getByRole('button',{name:'I know this',exact:true}).click();
 assert(await page.locator('#xp-value').textContent()==='205 XP','Flashcard XP incorrect');
 await page.getByRole('button',{name:'Previous flashcard'}).click();
 await page.keyboard.press('Space');
 await page.getByRole('button',{name:'Keep practicing',exact:true}).click();
 await page.getByRole('button',{name:'Previous flashcard'}).click();
 await page.getByRole('button',{name:'Reveal answer',exact:true}).click();
 await page.getByRole('button',{name:'I know this',exact:true}).click();
 assert(await page.locator('#xp-value').textContent()==='205 XP','Repeated known card farmed XP');
 await page.locator('#card-search').fill('halo');
 assert((await page.locator('.flashcard').textContent()).toLowerCase().includes('halo'),'Card search failed');
 await page.locator('#card-search').fill('no-such-topic-xyz');
 assert(await page.getByRole('heading',{name:'No matching cards'}).count()===1,'Empty search state failed');
 await page.getByRole('button',{name:'Show all flashcards',exact:true}).click();
 await page.locator('#card-topic').selectOption('0');
 await page.locator('#card-review').check();
 // Only 3 remaining unknown cards in this topic after first card was marked known.
 for(let i=0;i<3;i++){
  await page.getByRole('button',{name:'Reveal answer',exact:true}).click();
  await page.getByRole('button',{name:'I know this',exact:true}).click();
 }
 assert(await page.getByRole('heading',{name:'A clear deck. Nice work!'}).count()===1,'Review pile did not empty');
 await page.getByRole('button',{name:'Ward lab',exact:true}).click();
 // Deliberate wrong answer, then verify feedback and single-answer lock.
 await page.locator('[data-lab-answer="1"]').click();
 assert(await page.locator('.feedback.wrong').count()===1,'Wrong lab answer feedback missing');
 assert(await page.locator('[data-lab-answer]:disabled').count()===3,'Lab answers not locked after choice');
 await page.getByRole('button',{name:'Next case',exact:true}).click();
 await page.locator('[data-lab-answer="1"]').click();
 assert(await page.locator('.feedback:not(.wrong)').count()===1,'Correct lab answer feedback missing');
 // Test every case and correct feedback in all four rounds.
 for(let lab=0;lab<4;lab++){
  await page.locator('[data-lab="'+lab+'"]').click();
  // Start at the current case, loop once through the full round.
  for(let j=0;j<6;j++){
   const data=await page.evaluate(()=>({pos:labPositions[labIndex],answer:LABS[labIndex].cases[labPositions[labIndex]][2],answered:labChoices[labIndex]!==null}));
   if(!data.answered)await page.locator('[data-lab-answer="'+data.answer+'"]').click();
   await page.locator('[data-action="next-case"]').click();
  }
 }
 // First lab missed the deliberate wrong case; retry it correctly to complete all 24.
 await page.locator('[data-lab="0"]').click();
 for(let j=0;j<6;j++){
  const a=await page.evaluate(()=>LABS[labIndex].cases[labPositions[labIndex]][2]);
  if(await page.locator('[data-lab-answer="'+a+'"]').isEnabled())await page.locator('[data-lab-answer="'+a+'"]').click();
  await page.locator('[data-action="next-case"]').click();
 }
 assert(await page.evaluate(()=>state.labSolved.length)===24,'All 24 lab cases were not saved');
 const xpBeforeRepeat=await page.locator('#xp-value').textContent();
 await page.locator('[data-lab-answer="1"]').click();
 assert(await page.locator('#xp-value').textContent()===xpBeforeRepeat,'Repeated lab case farmed XP');
 await page.getByRole('button',{name:'Quiz',exact:true}).click();
 await page.locator('#quiz-size').selectOption('all');
 await page.getByRole('button',{name:'Start quiz',exact:true}).click();
 let s=await page.evaluate(()=>({len:state.session.items.length,q:QUESTIONS[state.session.items[0].id]}));
 assert(s.len===46,'Full quiz is not 46 questions');
 let wrong=(s.q.correct+1)%s.q.options.length;
 await page.locator('[data-quiz-answer="'+wrong+'"]').click();
 assert(await page.locator('.feedback.wrong').count()===1,'Wrong quiz feedback missing');
 assert(await page.locator('[data-quiz-answer]:disabled').count()===s.q.options.length,'Quiz answer not locked');
 await page.reload();
 assert(await page.locator('.feedback.wrong').count()===1,'Quiz answer did not persist through reload');
 await page.getByRole('button',{name:'Next question',exact:true}).click();
 for(let i=1;i<46;i++){
  const a=await page.evaluate(()=>QUESTIONS[state.session.items[state.session.pos].id].correct);
  await page.locator('[data-quiz-answer="'+a+'"]').click();
  assert(await page.locator('.feedback:not(.wrong)').count()===1,'Correct quiz feedback missing at '+i);
  await page.locator('[data-action="next-question"]').click();
 }
 assert(await page.getByRole('heading',{name:'45 out of 46 correct',exact:true}).count()===1,'Final quiz score wrong');
 assert(await page.evaluate(()=>state.missed.length)===1,'Missed-question pile wrong');
 await page.getByRole('button',{name:'Retry these 1',exact:true}).click();
 const a=await page.evaluate(()=>QUESTIONS[state.session.items[0].id].correct);
 await page.locator('[data-quiz-answer="'+a+'"]').click();
 await page.getByRole('button',{name:'See my results',exact:true}).click();
 assert(await page.getByRole('heading',{name:'1 out of 1 correct',exact:true}).count()===1,'Retry score wrong');
 assert(await page.evaluate(()=>state.missed.length)===0,'Correct retry did not clear missed pile');
 assert(await page.evaluate(()=>state.solved.length)===46,'All quiz mastery not saved');
 // No external requests are needed for loaded-file interactions.
 await page.context().setOffline(true);
 await page.getByRole('button',{name:'Flashcards',exact:true}).click();
 await page.getByRole('button',{name:'Reveal answer',exact:true}).click();
 assert(await page.locator('.flashcard.revealed').count()===1,'Offline interactions failed');
 await page.getByRole('button',{name:'Source & study guide',exact:true}).click();
 assert(await page.locator('#source-dialog').isVisible(),'Source dialog failed');
 const data=await page.locator('#download-source').getAttribute('href');
 assert(data.startsWith('data:application/pdf;base64,JVBER'),'Embedded PDF data is invalid');
 await page.getByRole('button',{name:'Back to studying',exact:true}).click();
 await page.context().setOffline(false);
 assert(errors.length===0,'JavaScript errors: '+errors.join('; '));
 console.log(JSON.stringify({status:'PASS',lessons:8,cards:46,cases:24,questions:46,quiz:'45/46 then 1/1 retry',persistence:true,offline:true,errors}));
}
