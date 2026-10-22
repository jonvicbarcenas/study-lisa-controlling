async (page) => {
 const report=[];
 const data=await page.evaluate(()=>({lessons:state.read.length,known:state.known.length,cases:state.labSolved.length,solved:state.solved.length,missed:state.missed.length,sessionDone:state.session.done,score:quizScore(state.session)}));
 if(data.lessons!==8||data.cases!==24||data.solved!==46||data.missed!==0||!data.sessionDone||data.score!==1)throw new Error('Interaction checks did not reach expected final state: '+JSON.stringify(data));
 await page.evaluate(()=>{localStorage.removeItem('control-quest-v1');});
 await page.reload();
 // Every main route at small phone, landscape, and desktop widths.
 for(const [width,height] of [[375,812],[812,375],[1440,1000]]){
  await page.setViewportSize({width,height});
  for(const route of ['home','learn','cards','lab','quiz']){
   await page.locator('.nav [data-go="'+route+'"]').click();
   if(route==='learn')await page.locator('.lesson-menu [data-lesson="5"]').click();
   const measure=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,main:document.getElementById('main').getBoundingClientRect().width}));
   if(measure.scroll>measure.width+1)throw new Error('Horizontal overflow on '+route+' at '+width+': '+JSON.stringify(measure));
   report.push({width,height,route,overflow:false});
   if(width===375&&['home','learn','quiz'].includes(route))await page.screenshot({path:'tmp/qa/mobile-'+route+'.png',fullPage:true});
   if(width===1440&&route==='home')await page.screenshot({path:'tmp/qa/desktop-home.png',fullPage:true});
  }
 }
 await page.setViewportSize({width:375,height:812});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('.nav [data-go="lab"]').click();
 await page.locator('[data-lab-answer="0"]').click();
 await page.screenshot({path:'tmp/qa/mobile-lab.png',fullPage:true});
 await page.locator('.nav [data-go="quiz"]').click();
 await page.getByRole('button',{name:'Start quiz',exact:true}).click();
 const a=await page.evaluate(()=>QUESTIONS[state.session.items[0].id].correct);
 await page.locator('[data-quiz-answer="'+a+'"]').click();
 await page.screenshot({path:'tmp/qa/mobile-answer.png',fullPage:true});
 // Enlarged text must remain usable without horizontal document overflow.
 await page.evaluate(()=>{document.documentElement.style.fontSize='200%';document.body.style.fontSize='24px';});
 const zoom=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
 if(zoom.scroll>zoom.width+1)throw new Error('Text resize causes overflow: '+JSON.stringify(zoom));
 await page.evaluate(()=>{document.documentElement.style.fontSize='';document.body.style.fontSize='';buildPrint();});
 await page.emulateMedia({media:'print'});
 if(await page.locator('.print-sheet article').count()!==8)throw new Error('Print notes missing lessons');
 await page.pdf({path:'tmp/qa/print-notes.pdf',format:'A4',printBackground:true});
 await page.emulateMedia({media:'screen',reducedMotion:'no-preference'});
 await page.setViewportSize({width:1440,height:1000});
 // Leave the test browser on a clean, fresh overview.
 await page.evaluate(()=>{localStorage.removeItem('control-quest-v1');});
 await page.goto('http://127.0.0.1:8765/controlling-study.html#home');
 return {status:'PASS',interactionState:data,layouts:report,reducedMotion:true,textResize:true,printLessons:8};
}
