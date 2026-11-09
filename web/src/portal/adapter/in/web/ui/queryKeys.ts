// Query keys of the portal (UI-DESIGN §2, "읽는 시점"). Every read of the browser uses one of these.
export const queryKeys = {
  session: ['session'] as const,
  settings: ['settings'] as const,
  tasks: ['tasks'] as const,
  task: (id: string) => ['task', id] as const,
  trash: ['trash'] as const,
  reportPreview: (month: string) => ['report-preview', month] as const,
  reports: ['reports'] as const,
  improvements: ['improvements'] as const,
  lifecycleHistory: ['lifecycle-history'] as const,
  settingsHistory: ['settings-history'] as const,
  improvementHistory: (id: string) => ['improvement-history', id] as const,
};
