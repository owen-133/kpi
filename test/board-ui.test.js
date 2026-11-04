import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';

test('Chromium에서 Svelte 보드·검색·접기·상태변경·조회권한·모바일',{skip:!process.env.ORBIT_PLAYWRIGHT_PATH},async()=>{
 const {chromium}=await import(process.env.ORBIT_PLAYWRIGHT_PATH);const dir=mkdtempSync(join(tmpdir(),'orbit-board-ui-'));
 const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3201',DATA_DIR:dir,ADMIN_PASSWORD:'test-admin',VIEWER_PASSWORD:'test-viewer'},stdio:['ignore','pipe','pipe']});let browser;
 try{await Promise.race([once(server.stdout,'data'),once(server,'exit').then(()=>{throw Error('server failed');})]);
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({httpCredentials:{username:'admin',password:'test-admin'},viewport:{width:1440,height:1050}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error'&&!msg.text().includes('favicon'))errors.push(msg.text());});
 await page.goto('http://127.0.0.1:3201');await page.getByRole('button',{name:'＋ 새 업무 등록'}).click();
 await page.locator('[name="title"]').fill('테스트 노트북 준비');await page.locator('[name="requester"]').fill('홍길동');await page.locator('[name="department"]').fill('인사팀');await page.locator('[name="category"]').selectOption('비품·자산');await page.locator('[name="description"]').fill('신규 입사자 장비 세팅');await page.getByRole('button',{name:'업무 등록',exact:true}).click();await page.locator('#detail-dialog[open]').waitFor();
 await page.getByRole('button',{name:'닫기'}).last().click();await page.locator('nav [data-view="board"]').click();
 await page.getByRole('heading',{name:'흩어진 요청을, 한 장의 보드로.'}).waitFor();await page.locator('button.request-row').filter({hasText:'테스트 노트북 준비'}).waitFor();
 await page.getByRole('searchbox',{name:'업무 검색'}).fill('해당없음');await page.getByText('조건에 맞는 업무가 없습니다.').waitFor();await page.getByRole('searchbox',{name:'업무 검색'}).fill('신규 입사자');
 await page.getByRole('combobox',{name:'카드 분류 기준'}).selectOption('department');await page.getByRole('button',{name:/인사팀 전체/}).click();assert.equal(await page.locator('button.request-row').filter({hasText:'테스트 노트북 준비'}).count(),0);await page.getByRole('button',{name:/인사팀 접수/}).click();
 await page.locator('button.request-row').filter({hasText:'테스트 노트북 준비'}).click();await page.locator('#status-form select').selectOption('완료');await page.getByRole('button',{name:'상태 변경',exact:true}).click();await page.getByText('접수 → 완료',{exact:true}).waitFor();await page.getByRole('button',{name:'닫기'}).last().click();
 await page.getByRole('button',{name:/완료 업무 1건/}).click();await page.locator('button.request-row').filter({hasText:'테스트 노트북 준비'}).waitFor();
 await page.screenshot({path:'/tmp/orbit-board-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/orbit-board-mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile horizontal overflow');
 const viewer=await browser.newContext({httpCredentials:{username:'viewer',password:'test-viewer'}});const vp=await viewer.newPage();await vp.goto('http://127.0.0.1:3201');await vp.locator('nav [data-view="board"]').click();await vp.getByText('조회 전용',{exact:true}).waitFor();assert.equal(await vp.locator('#new-task:visible').count(),0);await vp.getByRole('button',{name:/완료 업무 1건/}).click();await vp.locator('button.request-row').filter({hasText:'테스트 노트북 준비'}).click();await vp.locator('#detail-dialog[open]').waitFor();assert.equal(await vp.locator('#status-form').count(),0);
 assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();if(server.exitCode===null){const ended=once(server,'exit');server.kill();await ended;}rmSync(dir,{recursive:true,force:true});}
});
