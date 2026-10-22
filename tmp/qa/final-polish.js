async (page)=>{
 await page.reload();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:1000});
 await page.screenshot({path:'tmp/qa/final-desktop.png',fullPage:true,animations:'disabled'});
 const desktop=await page.evaluate(()=>({mobileBrand:getComputedStyle(document.querySelector('.mobile-brand')).display,trophy:document.querySelector('.home-bottom .card svg.icon')?.getBoundingClientRect().width,activeNav:document.querySelectorAll('.nav [aria-current="page"]').length}));
 if(desktop.mobileBrand!=='none'||desktop.trophy>22||desktop.activeNav!==1)throw new Error('Desktop polish: '+JSON.stringify(desktop));
 await page.setViewportSize({width:375,height:812});
 await page.screenshot({path:'tmp/qa/final-mobile.png',fullPage:true,animations:'disabled'});
 const mobile=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,active:document.activeElement?.outerHTML.slice(0,100),skipTransform:getComputedStyle(document.querySelector('.skip')).transform,mobileBrand:getComputedStyle(document.querySelector('.mobile-brand')).display}));
 if(mobile.overflow||mobile.mobileBrand!=='flex')throw new Error('Mobile polish: '+JSON.stringify(mobile));
 await page.getByRole('button',{name:'Source & study guide',exact:true}).click();
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('link',{name:'Download original PDF',exact:true}).click();
 const download=await downloadPromise;
 await download.saveAs('tmp/qa/downloaded-source.pdf');
 await page.keyboard.press('Escape');
 if(await page.locator('#source-dialog').isVisible())throw new Error('Escape did not close dialog');
 // The skip link must preserve the current route.
 await page.locator('.nav [data-go="learn"]').click();
 const route=page.url();
 await page.locator('.skip').focus();
 await page.keyboard.press('Enter');
 if(page.url()!==route)throw new Error('Skip link changed the current lesson');
 await page.evaluate(()=>{buildPrint();});
 await page.emulateMedia({media:'print'});
 await page.pdf({path:'tmp/qa/final-print.pdf',format:'A4',printBackground:true,margin:{top:'12mm',bottom:'12mm',left:'12mm',right:'12mm'}});
 await page.emulateMedia({media:'screen'});
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('.nav [data-go="home"]').click();
 await page.screenshot({path:'tmp/qa/final-desktop.png',fullPage:true,animations:'disabled'});
 return {status:'PASS',desktop,mobile,download:download.suggestedFilename(),javascriptErrors:errors};
}
