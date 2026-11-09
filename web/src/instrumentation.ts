// Runs once when the server starts. Applies the legacy startup refusals (config/startupChecks.ts documents how the
// legacy STORAGE_BACKEND=supabase maps to DATABASE_URL here). Next 16 keeps serving (every request answers 500)
// when this hook only throws, so a refusal also ends the process with exit code 1 (config/refuseToStart.ts).
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { refuseToStartWhenMisconfigured } = await import('./config/refuseToStart.ts');
  refuseToStartWhenMisconfigured(process.env);
}
