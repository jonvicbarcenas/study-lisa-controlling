async(page)=>{
 await page.emulateMedia({media:'screen'});
 await page.reload();
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>{window.scrollTo(0,0);document.getElementById('main').focus({preventScroll:true});});
 await page.screenshot({path:'tmp/qa/final-viewport.png',animations:'disabled'});
 const screen=await page.evaluate(()=>({sidebarTop:document.querySelector('.sidebar').getBoundingClientRect().top,skipBottom:document.querySelector('.skip').getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth}));
 if(screen.sidebarTop!==0||screen.skipBottom>0||screen.overflow)throw new Error('Viewport check failed: '+JSON.stringify(screen));
 await page.evaluate(()=>buildPrint());
 await page.emulateMedia({media:'print'});
 const print=await page.evaluate(()=>({lessons:document.querySelectorAll('.print-sheet article').length,skip:getComputedStyle(document.querySelector('.skip')).display}));
 if(print.lessons!==8||print.skip!=='none')throw new Error('Print check failed: '+JSON.stringify(print));
 await page.pdf({path:'tmp/qa/final-print.pdf',format:'A4',printBackground:true,margin:{top:'12mm',bottom:'12mm',left:'12mm',right:'12mm'}});
 await page.emulateMedia({media:'screen'});
 return {status:'PASS',screen,print};
}
