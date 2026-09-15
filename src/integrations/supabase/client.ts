// Supabase client — env-first (Cloudflare Pages / Lovable inject VITE_* at build time), PROD fallback.
// Never use `??` for Vite env (Lovable defines empty strings) — see feedback_vite_env_never_nullish.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { brokeredPreviewStorage } from './previewAuthStorage';

const PROD_URL = "https://dtqqjeaadboqrhbldicj.supabase.co";
const PROD_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0cXFqZWFhZGJvcXJoYmxkaWNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTYxMDUsImV4cCI6MjA3MTU3MjEwNX0.yeRn-fs_zETKYdvbrqrd7tMzQgCt_xeb-cvRTpjdSDc";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || PROD_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || PROD_PUBLISHABLE_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Web Lock do supabase-js que nunca pode pendurar a app (08/09/2026, Database Center).
// O supabase-js serializa getSession()/refresh — e portanto todas as queries — atras do
// Web Lock `lock:sb-<ref>-auth-token`. Um separador preso num refresh mantinha o lock para
// sempre: a navegacao dentro do modulo "bloqueava". Esperamos no maximo 3 s pelo lock e
// seguimos sem ele; o unico custo e uma corrida rara de refresh.
async function safeAuthLock<R>(name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  if (typeof navigator === "undefined" || !navigator.locks) return fn();
  let acquired = false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    return await navigator.locks.request(name, { signal: ctrl.signal }, async () => {
      acquired = true;
      clearTimeout(timer);
      return fn();
    });
  } catch (e) {
    if (!acquired) return fn();
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    lock: safeAuthLock,
    storage: brokeredPreviewStorage(),
    persistSession: true,
    autoRefreshToken: true,
  }
});
