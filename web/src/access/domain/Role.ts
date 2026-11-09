export const ROLES = ['admin', 'viewer'] as const;
export type Role = (typeof ROLES)[number];
