import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('[R-032] 개요 업무의 상태·기한 라벨, 미지정 표시와 모바일 배치를 확인',{skip:!process.env.ORBIT_PLAYWRIGHT_PATH},async()=>{
 const {chromium}=await import(process.env.ORBIT_PLAYWRIGHT_PATH);const dir=mkdtempSync(join(tmpdir(),'overview-labels-'));const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3207',DATA_DIR:dir,ADMIN_PASSWORD:'test-admin',VIEWER_PASSWORD:'test-viewer'},stdio:['ignore','pipe','pipe']});let browser;
 try{await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw Error('server failed');})]);browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});const ctx=await browser.newContext({httpCredentials:{username:'admin',password:'test-admin'},viewport:{width:1440,height:1050}});for(const due_date of ['2030-01-01','']){const response=await ctx.request.post('http://127.0.0.1:3207/api/tasks',{data:{title:due_date?'기한 표시 확인':'미지정 확인',requester:'표기 검증',requested_at:'2026-11-01T00:00:00Z',due_date}});if(due_date){const {id}=await response.json();await ctx.request.post('http://127.0.0.1:3207/api/tasks/'+id+'/status',{data:{status:'진행 중'}});}}
 const page=await ctx.newPage();await page.goto('http://127.0.0.1:3207');await page.locator('.task-row').first().waitFor();assert.match(await page.locator('.brand').innerText(),/아이지넷/);assert.doesNotMatch(await page.locator('body').innerText(),/orbit[. _-]*ops/i);
 for(const row of await page.locator('.task-row').all()){assert.equal(await row.locator('dt').filter({hasText:'업무 상태'}).count(),1);assert.equal(await row.locator('dt').filter({hasText:'처리 기한'}).count(),1);}
 await page.locator('.task-row').filter({hasText:'미지정 확인'}).getByText('미지정',{exact:true}).waitFor();await page.screenshot({path:'/tmp/aijinet-overview-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/aijinet-overview-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }finally{if(browser)await browser.close();if(server.exitCode===null){const stopped=once(server,'exit');server.kill();await stopped;}rmSync(dir,{recursive:true,force:true});}
});
