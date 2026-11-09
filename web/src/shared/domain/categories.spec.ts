// R-033
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CATEGORIES, FIXED_CATEGORY, categoriesOrDefault, registrationCategories } from './categories.ts';

test('[R-033] older settings still offer the fixed category when registering', () => {
  assert.ok(registrationCategories(categoriesOrDefault({ categories: ['사용자 분류'] })).includes('고정업무'));
  assert.deepEqual(registrationCategories(['사용자 분류']), ['사용자 분류', '고정업무']);
});

test('[R-033] the fixed category is offered once and keeps its configured position', () => {
  assert.deepEqual(registrationCategories(['가', '고정업무', '나']), ['가', '고정업무', '나']);
  assert.equal(registrationCategories(['고정업무', '고정업무']).length, 1);
});

test('[R-033] an empty list still offers the fixed category', () => {
  assert.deepEqual(registrationCategories([]), ['고정업무']);
});

test('[R-033] missing settings fall back to the default categories, which already hold the fixed one', () => {
  assert.deepEqual(categoriesOrDefault(undefined), DEFAULT_CATEGORIES);
  assert.deepEqual(categoriesOrDefault({}), DEFAULT_CATEGORIES);
  assert.deepEqual(categoriesOrDefault({ categories: undefined }), DEFAULT_CATEGORIES);
  assert.ok(DEFAULT_CATEGORIES.includes(FIXED_CATEGORY));
  assert.deepEqual([...DEFAULT_CATEGORIES], ['일반 총무', '고정업무', '비품·자산', '구매·지출', '시설·환경', '계약', '복리후생', '기타']);
});

test('[R-033] configured categories win over the default and are not mutated', () => {
  const configured = ['요청지원', '기타'];
  assert.deepEqual(categoriesOrDefault({ categories: configured }), ['요청지원', '기타']);
  registrationCategories(configured);
  assert.deepEqual(configured, ['요청지원', '기타']);
});
