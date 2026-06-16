const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const SB = !!(SUPABASE_URL && SUPABASE_KEY);

const SB_H: Record<string, string> = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

const MEM: Record<string, any> = {};
const CHOT_MEM: Record<string, boolean> = {};

try {
  const _cm = typeof localStorage !== 'undefined' && localStorage.getItem('mn5:chotmem');
  if (_cm) Object.assign(CHOT_MEM, JSON.parse(_cm));
} catch {}

export function saveChotMem() {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem('mn5:chotmem', JSON.stringify(CHOT_MEM));
  } catch {}
}

let storageOK = true;

function logError(context: string, err: any) {
  console.error(`[Storage Error][${context}]:`, err);
}

export async function sGet<T>(k: string): Promise<T | null> {
  if (SB) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/data?key=eq.${encodeURIComponent(k)}&select=value`,
        { headers: { ...SB_H, 'Cache-Control': 'no-cache' }, cache: 'no-store' }
      );
      if (r.ok) {
        const d = await r.json();
        const v = d?.[0] ? d[0].value : null;
        if (v != null) MEM[k] = v;
        return v ?? MEM[k] ?? null;
      }
    } catch (err) {
      logError('sGet_supabase', err);
    }
    return MEM[k] ?? null;
  }
  if (k in MEM) return MEM[k];
  try {
    const r = await (window as any).storage.get(k);
    const v = r ? JSON.parse(r.value) : null;
    if (v != null) MEM[k] = v;
    return v ?? MEM[k] ?? null;
  } catch (err) {
    logError('sGet_local', err);
    storageOK = false;
    return MEM[k] ?? null;
  }
}

export async function sSet<T>(k: string, v: T): Promise<void> {
  MEM[k] = v;
  if (SB) {
    try {
      const p = await fetch(`${SUPABASE_URL}/rest/v1/data?key=eq.${encodeURIComponent(k)}`, {
        method: 'PATCH',
        headers: { ...SB_H, Prefer: 'return=representation' },
        body: JSON.stringify({ value: v, updated_at: new Date().toISOString() }),
      });
      const txt = await p.text();
      if (p.status === 404 || txt === '[]') {
        await fetch(`${SUPABASE_URL}/rest/v1/data`, {
          method: 'POST',
          headers: { ...SB_H, Prefer: 'return=minimal,resolution=merge-duplicates' },
          body: JSON.stringify({ key: k, value: v }),
        });
      }
    } catch (err) {
      logError('sSet_supabase', err);
    }
    return;
  }
  try {
    await (window as any).storage.set(k, JSON.stringify(v));
  } catch (err) {
    logError('sSet_local', err);
    storageOK = false;
  }
}

export async function sList(prefix: string): Promise<string[]> {
  const memKeys = Object.keys(MEM).filter((k) => k.startsWith(prefix) && MEM[k] != null);
  if (SB) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/data?select=key&key=like.${encodeURIComponent(prefix + '%')}`,
        { headers: { ...SB_H, 'Cache-Control': 'no-cache' }, cache: 'no-store' }
      );
      if (r.ok) {
        const d = await r.json();
        return Array.from(new Set([...memKeys, ...d.map((x: any) => x.key)]));
      }
    } catch (err) {
      logError('sList_supabase', err);
    }
    return memKeys;
  }
  try {
    const r = await (window as any).storage.list(prefix);
    const dk = r ? r.keys : [];
    return Array.from(new Set([...memKeys, ...dk]));
  } catch (err) {
    logError('sList_local', err);
    return memKeys;
  }
}

export async function sDel(k: string): Promise<void> {
  delete MEM[k];
  if (SB) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/data?key=eq.${encodeURIComponent(k)}`, { method: 'DELETE', headers: SB_H });
    } catch (err) {
      logError('sDel_supabase', err);
    }
    return;
  }
  try {
    await (window as any).storage.delete(k);
  } catch (err) {
    logError('sDel_local', err);
  }
}

export { CHOT_MEM, saveChotMem };
