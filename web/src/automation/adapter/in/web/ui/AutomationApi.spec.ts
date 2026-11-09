import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recordingClient } from '../../../../../shared/adapter/in/web/ui/testing/recordingClient.ts';
import { createAutomationApi } from './AutomationApi.ts';
import { FakeAutomationApi } from './testing/fakeAutomationApi.ts';

test('suggest POSTs the text', async () => {
  const client = recordingClient();
  await createAutomationApi(client).suggest('노트북 구매');
  assert.deepEqual(client.requests, [{ path: 'automation', body: { text: '노트북 구매' }, hasBody: true }]);
});

test('the fake answers its configured suggestion and records the text', async () => {
  const fake = new FakeAutomationApi();
  fake.suggestion = { classification: { category: '구매·지출', method: '키워드 규칙', reason: 'r' }, similar: [], method: 'm' };
  assert.equal((await fake.suggest('x')).classification.category, '구매·지출');
  assert.deepEqual(fake.log.argsOf('suggest'), [['x']]);
});
