const cloud=process.env.STORAGE_BACKEND==='supabase';
export const kpi=cloud?async(action,payload={})=>{const {rpc}=await import('./supabase-store.js');return rpc(action,payload,'orbit_kpi');}:(await import('./kpi-store-local.js')).kpi;
