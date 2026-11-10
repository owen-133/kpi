// R-035
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {browserSkipReason,startBrowserHarness,HARNESS_ADMIN,HARNESS_VIEWER} from '../../../../../../portal/testing/browserHarness.ts';
test('상세 창에서 하위 업무를 체크·해제·추가하고 조회 계정은 읽기만 한다',{skip:browserSkipReason('checklist.browser.spec')},async()=>{
 const harness=await startBrowserHarness();
 let opened:Awaited<ReturnType<typeof harness.openPage>>|undefined;
 try{
 const auth='Basic '+Buffer.from('admin:'+HARNESS_ADMIN.password).toString('base64');
 const response=await fetch(harness.base+'/api/tasks',{method:'POST',headers:{Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify({title:'IR 입사 준비',requester:'owen',requested_at:'2026-11-09T00:00:00Z',description:'1. 편지\n2. 자리셋팅\n3. 계정생성\n4. PC셋팅'})});
 assert.equal(response.status,201);const {id}=await response.json();
 opened=await harness.openPage(HARNESS_ADMIN);const page=opened.page as any;
 await page.goto(harness.base);await page.locator(`[data-task="${id}"]`).click();
 await page.getByRole('checkbox',{name:'계정생성 완료',exact:true}).click();
 await page.getByRole('heading',{name:/1\/4 완료/}).waitFor();
 assert.equal(await page.getByRole('checkbox',{name:'계정생성 완료',exact:true}).isChecked(),true);
 await page.getByRole('checkbox',{name:'계정생성 완료',exact:true}).click();
 await page.getByRole('heading',{name:/0\/4 완료/}).waitFor();
 await page.getByLabel('하위 업무 추가',{exact:true}).fill('보안교육');await page.getByRole('button',{name:'하위 업무 추가',exact:true}).click();
 await page.getByRole('checkbox',{name:'보안교육 완료',exact:true}).waitFor();
 await page.reload();await page.locator(`[data-task="${id}"]`).click();await page.getByRole('heading',{name:/0\/5 완료/}).waitFor();
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'/tmp/aijinet-checklist.png',fullPage:true});
 const viewer=await harness.openPage(HARNESS_VIEWER);const vp=viewer.page as any;
 try{await vp.goto(harness.base);await vp.locator(`[data-task="${id}"]`).click();assert.equal(await vp.getByRole('checkbox',{name:'계정생성 완료',exact:true}).isDisabled(),true);assert.equal(await vp.getByRole('button',{name:'하위 업무 추가',exact:true}).count(),0);}finally{await viewer.close();}
 }finally{await opened?.close();await harness.stop();}
});
