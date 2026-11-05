import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,normalizeSettings} from '../public/settings-model.js';
test('[R-032] 회사명 기본값과 저장된 이전 브랜딩은 갱신하고 사용자 설정은 보존',()=>{
 assert.equal(defaults.texts.portalName,'아이지넷');
 const original={texts:{portalName:'orbit.ops',pageEyebrow:'ORBIT OPS · GENERAL AFFAIRS',footer:'orbit.ops · 요청부터 완료까지, 업무의 모든 순간을 기록합니다.'}};
 const before=JSON.stringify(original);const settings=normalizeSettings(original);assert.equal(settings.texts.portalName,'아이지넷');assert.doesNotMatch(JSON.stringify(settings.texts),/orbit[. _-]*ops/i);assert.equal(JSON.stringify(original),before);
 const custom=normalizeSettings({texts:{portalName:'아이지넷 피플팀',bannerTitle:'우리 팀의 업무'},logo:'data:image/png;base64,AAAA'});assert.equal(custom.texts.portalName,'아이지넷 피플팀');assert.equal(custom.texts.bannerTitle,'우리 팀의 업무');assert.equal(custom.logo,'data:image/png;base64,AAAA');
});
