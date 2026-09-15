/**
 * AgentChatDock — "Parler avec <agent>": chat DENTRO do módulo com o agente Dify DEDICADO deste módulo.
 * Pré-requisito geral, Parte E (Marino 07/09/2026). Regra de ouro: nada se mistura — este chat só fala com o agente
 * deste módulo, através da Edge Function genérica `module-agent-chat` (a UI nunca vê chaves; o gate abre com a
 * validação do módulo na Runway). Zero escritas directas: a UI só envia mensagens; quem grava é a função.
 * Conversa por utilizador e por país (sessionStorage.selectedCountry); id da conversa em localStorage.
 * v2 (07/09 22:15): respostas arrumadas — AgentMarkdown (cartões, listas, tabelas responsivas), folha inteira no telemóvel, chips.
 * v4 (07/09 23:50, Parte G): separadores Chat · Conseils · Tâches — o agente propõe, o Marino aprova aqui, o runner executa (AgentPanels.tsx).
 * v3.2 (23:10): texto legível sobre o accent (readableOn, patch a11y do Finance Hub portado).
 * v3 (07/09 22:30, Parte F; 22:45 Marino: "voz embutida no chat directamente" → microfone e língua sempre no compositor): VOZ — toggle "Voix" (leitura das respostas), microfone (Web Speech API; fallback gravação → module-agent-voice),
 *   leitura automática das respostas (ElevenLabs quando há chave/voz; senão voz do dispositivo), stop. O utilizador fala na
 *   sua língua (pt-PT por defeito) e o agente responde na mesma; a execução (tools/código) é sempre em inglês (missão).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { AgentMarkdown } from './AgentMarkdown';
import { ProposalsPanel, TasksPanel } from './AgentPanels';
import { guessLang, listenOnce, playBase64, recordUntilStop, speakWithDevice, speechRecognitionSupported, toSpeakable, type VoiceStatus } from './AgentVoice';

type Msg = { id: string; role: 'user' | 'assistant'; content: string; tool_calls?: string[]; created_at?: string; pending?: boolean };
type Status = { agent_name: string | null; gate_open: boolean; gate_reason?: string; module_name?: string };
type VoicePhase = 'idle' | 'listening' | 'transcribing' | 'speaking';

function countryCode(): string {
  try { const raw = sessionStorage.getItem('selectedCountry'); if (raw) { const c = JSON.parse(raw); return String(c?.code ?? '').toUpperCase(); } } catch { /* sem país */ }
  return '';
}

async function fnRequest(fn: string, action: string, body: Record<string, unknown> | FormData) {
  const sb = supabase as any;
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.access_token) throw new Error('Connecte-toi pour parler avec l’agent.');
  const base = String(sb.supabaseUrl ?? sb.rest?.url?.replace(/\/rest\/v1\/?$/, '') ?? '');
  const key = String(sb.supabaseKey ?? '');
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const r = await fetch(`${base}/functions/v1/${fn}?action=${action}`, {
    method: 'POST',
    headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), apikey: key, Authorization: `Bearer ${session.access_token}` },
    body: isForm ? (body as FormData) : JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d?.error ?? `Erreur ${r.status}`); (e as any).code = d?.code; (e as any).status = r.status; (e as any).data = d; throw e; }
  return d;
}
const callFn = (action: string, body: Record<string, unknown>) => fnRequest('module-agent-chat', action, body);
const callVoice = (action: string, body: Record<string, unknown> | FormData) => fnRequest('module-agent-voice', action, body);
const callActions = (action: string, body: Record<string, unknown>) => fnRequest('module-agent-actions', action, body);
type Tab = 'chat' | 'conseils' | 'taches';

/** ferramentas usadas → chips legíveis (nunca nomes técnicos crus) */
function toolLabel(t: string): { label: string; kind: 'consult' | 'escalate' | 'tool' } {
  const x = t.trim();
  if (x === 'consult_module') return { label: '🔗 consulté un autre module', kind: 'consult' };
  if (x === 'escalate_to_hermes') return { label: '⚖️ escaladé à Hermès', kind: 'escalate' };
  const nice = x.replace(/^(finance|geo|gh|memory|notif|svc|pod|team|triad_center|triad)_/, '').replace(/_/g, ' ');
  return { label: nice, kind: 'tool' };
}

function ToolChips({ tools, accent }: { tools: string[]; accent: string }) {
  const uniq = Array.from(new Set(tools.flatMap((t) => t.split(';')).map((t) => t.trim()).filter(Boolean)));
  if (!uniq.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {uniq.map((t) => {
        const { label, kind } = toolLabel(t);
        const cls = kind === 'consult' ? 'border-violet-200 bg-violet-50 text-violet-800' : kind === 'escalate' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-600';
        return <span key={t} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${cls}`} style={kind === 'tool' ? { borderColor: `${accent}55` } : undefined}>{label}</span>;
      })}
    </div>
  );
}

const LANGS: Array<{ code: string; label: string }> = [{ code: 'pt-PT', label: 'PT' }, { code: 'fr-FR', label: 'FR' }, { code: 'en-US', label: 'EN' }];

/**
 * a11y (Validation Runway quality-external, 07/09/2026): texto branco sobre o accent teal (#00b6b4) dá 2.51:1 — axe
 * color-contrast "serious" (WCAG AA exige 4.5:1). Escolhe o texto (branco ou quase-preto) que garante ≥ 4.5:1 sobre o
 * accent recebido, para qualquer módulo que reutilize este dock. (Patch 272a7b4 do Finance Hub portado para a fonte canónica.)
 */
const INK_DARK = '#0f172a';
function relLuminance(hex: string): number {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return 0;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrastRatio(a: string, b: string): number {
  const la = relLuminance(a), lb = relLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** cor de texto legível (≥ 4.5:1) sobre uma cor de fundo sólida */
export function readableOn(bg: string): string {
  return contrastRatio('#ffffff', bg) >= 4.5 ? '#ffffff' : INK_DARK;
}

export function AgentChatDock({ moduleSlug, accent = '#00b6b4' }: { moduleSlug: string; accent?: string }) {
  const ink = readableOn(accent); // texto sobre o accent (botão flutuante, avatar, bolhas do utilizador, Envoyer, toggle)
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [convId, setConvId] = useState<string | null>(null);
  // Parte G: separadores Conseils / Tâches + admin
  const [tab, setTab] = useState<Tab>('chat');
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const actions = useCallback((action: string, body: Record<string, unknown>) => callActions(action, { module_slug: moduleSlug, ...body }), [moduleSlug]);
  useEffect(() => {
    if (!open) return;
    (supabase as any).from('profiles').select('is_global').limit(1).then((r: any) => setIsAdmin(r?.data?.[0]?.is_global === true)).catch(() => setIsAdmin(false));
    actions('proposals_list', { status: 'proposed' }).then((d) => setPendingCount((d?.proposals ?? []).length)).catch(() => setPendingCount(0));
  }, [open, actions, tab]);
  // voz (Parte F)
  const voiceKey = `agent-voice:${moduleSlug}`;
  const [voiceOn, setVoiceOn] = useState<boolean>(() => { try { return localStorage.getItem(`agent-voice:${moduleSlug}`) === '1'; } catch { return false; } });
  const [voiceLang, setVoiceLang] = useState<string>(() => { try { return localStorage.getItem('agent-voice:lang') || 'pt-PT'; } catch { return 'pt-PT'; } });
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus | null>(null);
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [partial, setPartial] = useState('');
  const stopListenRef = useRef<(() => void) | null>(null);
  const stopRecordRef = useRef<(() => Promise<{ blob: Blob; filename: string }>) | null>(null);
  const stopSpeakRef = useRef<(() => void) | null>(null);
  const country = countryCode();
  const lsKey = `agent-chat:${moduleSlug}:${country || 'ALL'}`;
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // estado do agente (nome + gate) — uma vez ao abrir
  useEffect(() => {
    if (!open || status) return;
    callFn('status', { module_slug: moduleSlug }).then(setStatus).catch((e) => setErr(String(e.message ?? e)));
  }, [open, status, moduleSlug]);
  // estado da voz — quando a voz é ligada
  useEffect(() => {
    if (!open || !voiceOn || voiceStatus) return;
    callVoice('status', { module_slug: moduleSlug }).then((s) => setVoiceStatus(s as VoiceStatus)).catch(() => setVoiceStatus({ enabled: true, elevenlabs: false, voice_id: null, provider: 'device', languages: LANGS.map((l) => l.code), default_language: 'pt-PT' }));
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.getVoices();
  }, [open, voiceOn, voiceStatus, moduleSlug]);

  // retomar a conversa deste utilizador/país
  useEffect(() => {
    if (!open) return;
    let saved: string | null = null;
    try { saved = localStorage.getItem(lsKey); } catch { /* privado */ }
    if (saved && !convId) {
      setConvId(saved);
      callFn('history', { module_slug: moduleSlug, conversation_id: saved })
        .then((d) => setMsgs((d?.messages ?? []) as Msg[]))
        .catch(() => { try { localStorage.removeItem(lsKey); } catch { /* ignora */ } setConvId(null); });
    }
  }, [open, lsKey, moduleSlug, convId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open]);
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const stopSpeaking = useCallback(() => { stopSpeakRef.current?.(); stopSpeakRef.current = null; setPhase((p) => (p === 'speaking' ? 'idle' : p)); }, []);

  /** lê uma resposta em voz alta (ElevenLabs se disponível; senão dispositivo), na língua da resposta */
  const speakAnswer = useCallback(async (answer: string) => {
    const lang = guessLang(answer, voiceLang);
    const spoken = toSpeakable(answer);
    if (!spoken) return;
    stopSpeaking();
    setPhase('speaking');
    try {
      if (voiceStatus?.provider === 'elevenlabs') {
        try {
          const s = await callVoice('speak', { module_slug: moduleSlug, text: answer, language: lang.slice(0, 2) }) as { audio_base64: string; mime: string };
          const p = playBase64(s.audio_base64, s.mime); stopSpeakRef.current = p.stop; await p.done;
        } catch {
          const p = speakWithDevice(spoken, lang); stopSpeakRef.current = p.stop; await p.done;
        }
      } else {
        const p = speakWithDevice(spoken, lang); stopSpeakRef.current = p.stop; await p.done;
      }
    } finally { stopSpeakRef.current = null; setPhase('idle'); }
  }, [moduleSlug, voiceLang, voiceStatus, stopSpeaking]);

  const send = async (raw?: string, channel: 'text' | 'voice' = 'text') => {
    const q = (raw ?? text).trim();
    if (!q || busy) return;
    setErr(null); setText('');
    const tmp = `tmp-${Date.now()}`;
    setMsgs((m) => [...m, { id: tmp, role: 'user', content: q }, { id: `${tmp}-a`, role: 'assistant', content: '…', pending: true }]);
    setBusy(true);
    try {
      const d = await callFn('chat', { module_slug: moduleSlug, message: q, conversation_id: convId ?? undefined, country_code: country || undefined, channel });
      if (d.conversation_id && d.conversation_id !== convId) { setConvId(d.conversation_id); try { localStorage.setItem(lsKey, d.conversation_id); } catch { /* ignora */ } }
      const answer: string = d.answer || '(sans réponse)';
      setMsgs((m) => m.map((x) => x.id === `${tmp}-a` ? { id: d.message_id ?? x.id, role: 'assistant', content: answer, tool_calls: d.tools_used ?? [] } : x));
      if (voiceOn) void speakAnswer(answer);
    } catch (e: any) {
      const gate = e?.code === 'gate_closed';
      setMsgs((m) => m.filter((x) => x.id !== `${tmp}-a`));
      setErr(gate ? 'L’agent s’ouvre après la validation du module.' : String(e?.message ?? e));
    } finally { setBusy(false); }
  };

  /** microfone: Web Speech API na língua escolhida; sem suporte → gravação + transcrição na Edge Fn */
  const toggleListen = async () => {
    if (phase === 'listening') { stopListenRef.current?.(); if (stopRecordRef.current) { const stop = stopRecordRef.current; stopRecordRef.current = null; await finishRecording(stop); } return; }
    if (busy || phase === 'transcribing') return;
    stopSpeaking(); setErr(null); setPartial('');
    if (speechRecognitionSupported()) {
      setPhase('listening');
      const { promise, stop } = listenOnce(voiceLang, setPartial);
      stopListenRef.current = stop;
      const heard = await promise;
      stopListenRef.current = null; setPhase('idle'); setPartial('');
      if (heard) void send(heard, 'voice'); else setErr('Je n’ai rien entendu. Réessaie en parlant plus près du micro.');
      return;
    }
    try {
      const rec = await recordUntilStop();
      stopRecordRef.current = rec.stop; setPhase('listening');
    } catch { setErr('Micro indisponible dans ce navigateur.'); setPhase('idle'); }
  };
  const finishRecording = async (stop: () => Promise<{ blob: Blob; filename: string }>) => {
    setPhase('transcribing');
    try {
      const { blob, filename } = await stop();
      const fd = new FormData(); fd.append('audio', blob, filename); fd.append('language', voiceLang.slice(0, 2));
      const t = await callVoice('transcribe', fd) as { text: string };
      setPhase('idle');
      if (t.text) void send(t.text, 'voice'); else setErr('Je n’ai rien entendu.');
    } catch (e: any) {
      setPhase('idle');
      setErr(e?.code === 'no_elevenlabs' ? 'La dictée n’est pas disponible dans ce navigateur (pas de reconnaissance vocale intégrée).' : String(e?.message ?? e));
    }
  };

  const setVoice = (on: boolean) => { setVoiceOn(on); try { localStorage.setItem(voiceKey, on ? '1' : '0'); } catch { /* ignora */ } if (!on) { stopSpeaking(); stopListenRef.current?.(); } };
  const setLang = (l: string) => { setVoiceLang(l); try { localStorage.setItem('agent-voice:lang', l); } catch { /* ignora */ } };
  const reset = () => { stopSpeaking(); setMsgs([]); setConvId(null); setErr(null); try { localStorage.removeItem(lsKey); } catch { /* ignora */ } };
  const agent = status?.agent_name || 'l’agent du module';
  const initials = (status?.agent_name || 'A').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const voiceHint = !voiceOn ? '' : voiceStatus?.provider === 'elevenlabs' ? 'voix ElevenLabs' : 'voix de l’appareil';

  const button = (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      aria-label={`Parler avec ${agent}`}
      title={`Parler avec ${agent}`}
      aria-expanded={open}
      style={{ background: accent, color: ink }}
      className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
    >
      <span aria-hidden>💬</span>
      <span className="hidden sm:inline">Parler avec {agent}</span>
    </button>
  );

  const drawer = open ? (
    <div role="dialog" aria-modal="false" aria-label={`Chat avec ${agent}`}
         className="fixed inset-x-0 bottom-0 z-[60] flex h-[min(88vh,760px)] flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-[#f7fafb] shadow-2xl sm:inset-x-auto sm:bottom-20 sm:right-5 sm:h-[min(680px,calc(100vh-7rem))] sm:w-[min(460px,calc(100vw-2.5rem))] sm:rounded-2xl">
      <header className="flex items-center justify-between gap-2 border-b border-slate-200/70 bg-white px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold" style={{ background: accent, color: ink }}>{initials}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{agent}</p>
            <p className="truncate text-[11px] text-slate-600">{status?.module_name ?? moduleSlug}{country ? ` · ${country}` : ''}{voiceHint ? ` · ${voiceHint}` : ' · agent dédié à ce module'}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={() => setVoice(!voiceOn)} aria-label={`Voix ${voiceOn ? 'activée' : 'désactivée'}`} aria-pressed={voiceOn} title={voiceOn ? 'Désactiver la lecture vocale des réponses' : 'Lire les réponses à voix haute'}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${voiceOn ? '' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                  style={voiceOn ? { background: accent, borderColor: accent, color: ink } : undefined}>
            {voiceOn ? '🔊 Voix' : '🔇 Voix'}
          </button>
          {(
            <select value={voiceLang} onChange={(e) => setLang(e.target.value)} aria-label="Langue d’écoute" className="rounded-full border border-slate-200 bg-white px-1.5 py-1 text-[11px] text-slate-700">
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          )}
          <button type="button" onClick={reset} className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-slate-50" title="Nouvelle conversation">Nouvelle</button>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="rounded-full px-2 py-1 text-slate-600 hover:bg-slate-100">✕</button>
        </div>
      </header>

      <nav aria-label="Sections" className="flex gap-1 border-b border-slate-200/70 bg-white px-3 pb-2 sm:px-4">
        {([['chat', '💬 Chat'], ['conseils', `💡 Conseils${pendingCount ? ` (${pendingCount})` : ''}`], ['taches', '⚙️ Tâches']] as Array<[Tab, string]>).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} aria-label={k === 'chat' ? 'Chat' : k === 'conseils' ? 'Conseils' : 'Tâches'} aria-pressed={tab === k}
                  className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${tab === k ? '' : 'text-slate-700 hover:bg-slate-100'}`}
                  style={tab === k ? { background: accent, color: ink } : undefined}>{l}</button>
        ))}
      </nav>

      {tab === 'conseils' && <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4"><ProposalsPanel call={actions} accent={accent} isAdmin={isAdmin} /></div>}
      {tab === 'taches' && <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4"><TasksPanel call={actions} accent={accent} moduleSlug={moduleSlug} /></div>}
      {tab === 'chat' && <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-4">
        {status && !status.gate_open && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">L’agent s’ouvre après la validation du module. {status.gate_reason}</div>
        )}
        {msgs.length === 0 && !err && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-center text-xs text-slate-600">
            <p className="text-2xl" aria-hidden>💬</p>
            <p className="mt-1">Pose une question sur ce module, à l’écrit ou à la voix (🎙️).</p>
            <p className="mt-0.5">{agent} ne connaît que ce module et répond avec les données réelles, dans ta langue.</p>
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            {m.role === 'user' ? (
              <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm px-3.5 py-2 text-[13px] shadow-sm" style={{ background: accent, color: ink }}>{m.content}</div>
            ) : (
              <div className="w-full max-w-[96%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                {m.pending ? (
                  <span className="inline-flex items-center gap-2 text-[13px] text-slate-600">
                    <span className="inline-flex gap-1" aria-hidden>
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full" style={{ background: accent }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:120ms]" style={{ background: accent }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:240ms]" style={{ background: accent }} />
                    </span>
                    {agent} réfléchit…
                  </span>
                ) : <AgentMarkdown text={m.content} accent={accent} />}
                {!m.pending && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {!!m.tool_calls?.length && <ToolChips tools={m.tool_calls} accent={accent} />}
                    {voiceOn && (
                      <button type="button" onClick={() => void speakAnswer(m.content)} aria-label="Écouter cette réponse" title="Écouter" className="ml-auto rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-600 hover:bg-slate-50">🔈 Écouter</button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {phase === 'listening' && (
          <div className="rounded-xl border px-3 py-2 text-xs text-slate-700" style={{ borderColor: `${accent}66`, background: `${accent}12` }}>
            <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" aria-hidden /> J’écoute ({LANGS.find((l) => l.code === voiceLang)?.label ?? voiceLang})… {partial && <em className="text-slate-600">{partial}</em>}
          </div>
        )}
        {phase === 'transcribing' && <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">Transcription…</div>}
        {err && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>}
        <div ref={endRef} />
      </div>}

      {tab === 'chat' && <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex items-end gap-2 border-t border-slate-200/70 bg-white p-3">
        {(
          phase === 'speaking' ? (
            <button type="button" onClick={stopSpeaking} aria-label="Arrêter la lecture" title="Stop" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-lg hover:bg-slate-50">⏹</button>
          ) : (
            <button type="button" onClick={() => void toggleListen()} disabled={busy || phase === 'transcribing'} aria-label={phase === 'listening' ? 'Arrêter l’écoute' : 'Parler'} aria-pressed={phase === 'listening'} title={phase === 'listening' ? 'Arrêter' : 'Parler'}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg transition disabled:opacity-40 ${phase === 'listening' ? 'border-red-300 bg-red-50' : 'border-slate-200 hover:bg-slate-50'}`}>
              {phase === 'listening' ? '⏹' : '🎙️'}
            </button>
          )
        )}
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
          rows={2}
          maxLength={2000}
          placeholder={`Écris ou parle à ${agent}…`}
          aria-label="Message"
          className="flex-1 resize-none rounded-xl border border-slate-200 bg-[#f7fafb] px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:bg-white focus:outline-none"
        />
        <button type="submit" disabled={busy || !text.trim()} style={{ background: accent, color: ink }} className="rounded-xl px-3.5 py-2 text-sm font-semibold shadow-sm disabled:opacity-40">Envoyer</button>
      </form>}
    </div>
  ) : null;

  if (typeof document === 'undefined') return null;
  return createPortal(<>{button}{drawer}</>, document.body);
}
