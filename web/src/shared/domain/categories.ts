// Work-category rules the registration form and the board rely on.

export const FIXED_CATEGORY = '고정업무';

export const DEFAULT_CATEGORIES: readonly string[] = ['일반 총무', FIXED_CATEGORY, '비품·자산', '구매·지출', '시설·환경', '계약', '복리후생', '기타'];

// Configured categories, or the defaults when settings carry none.
export function categoriesOrDefault(settings?: { readonly categories?: readonly string[] } | null): readonly string[] {
  return settings?.categories ?? DEFAULT_CATEGORIES;
}

// Categories a person can pick when registering: the configured ones plus the fixed category, each once.
export function registrationCategories(categories: readonly string[]): string[] {
  return [...new Set([...categories, FIXED_CATEGORY])];
}
