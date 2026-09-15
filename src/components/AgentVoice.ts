/**
 * AgentVoice — voz do agente do módulo (Parte F do pré-requisito geral, Marino 07/09/2026).
 * Escuta: Web Speech API do browser na língua escolhida (pt-PT por defeito); sem suporte → MediaRecorder → Edge Fn
 * `module-agent-voice?action=transcribe` (ElevenLabs Scribe, 501 sem chave). Fala: `?action=speak` (ElevenLabs) quando
 * houver chave + voz; senão voz do dispositivo (speechSynthesis) na língua da resposta. Sem dependências.
 */
import { parseMarkdown } from './AgentMarkdown';

export type VoiceStatus = { enabled: boolean; elevenlabs: boolean; voice_id: string | null; provider: 'elevenlabs' | 'device'; languages: string[]; default_language: string };

/** markdown → texto falável (sem tabelas, símbolos, crases, URLs, emojis) */
export function toSpeakable(md: string, maxChars = 1800): string {
  const strip = (s: string) => s
    .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/~~([^~]+)~~/g, '$1').replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1').replace(/https?:\/\/\S+/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, '').replace(/\s{2,}/g, ' ').trim();
  const end = (s: string) => (s && !/[.!?:…]$/.test(s) ? `${s}.` : s);
  const out: string[] = [];
  for (const b of parseMarkdown(md)) {
    if (b.t === 'h' || b.t === 'p' || b.t === 'quote') out.push(end(strip(b.text)));
    else if (b.t === 'ul' || b.t === 'ol') for (const it of b.items) out.push(end(strip(it)));
    else if (b.t === 'table') for (const r of b.rows) out.push(end(r.length === 2 ? `${strip(r[0])}: ${strip(r[1])}` : r.map(strip).filter(Boolean).join(', ')));
  }
  let t = out.filter(Boolean).join(' ');
  if (t.length > maxChars) t = `${t.slice(0, maxChars - 1).replace(/\s+\S*$/, '')}…`;
  return t;
}

export function speechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const W = window as any;
  return !!(W.SpeechRecognition || W.webkitSpeechRecognition);
}

/** Ouve uma frase com o reconhecimento do browser. Resolve com o texto ('' se nada). */
export function listenOnce(lang: string, onPartial?: (t: string) => void): { promise: Promise<string>; stop: () => void } {
  const W = window as any;
  const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
  const rec = new Ctor();
  rec.lang = lang; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
  let finalText = ''; let done = false;
  const promise = new Promise<string>((resolve) => {
    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript; }
      onPartial?.((finalText + ' ' + interim).trim());
    };
    rec.onerror = () => { if (!done) { done = true; resolve(finalText.trim()); } };
    rec.onend = () => { if (!done) { done = true; resolve(finalText.trim()); } };
    try { rec.start(); } catch { if (!done) { done = true; resolve(''); } }
  });
  return { promise, stop: () => { try { rec.stop(); } catch { /* ignora */ } } };
}

/** Grava o microfone até stop(); devolve o Blob e o nome do ficheiro. */
export async function recordUntilStop(): Promise<{ stop: () => Promise<{ blob: Blob; filename: string }> }> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) ?? '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  rec.start();
  return {
    stop: () => new Promise((resolve) => {
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || 'audio/webm';
        resolve({ blob: new Blob(chunks, { type }), filename: `voix.${type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm'}` });
      };
      rec.stop();
    }),
  };
}

function pickDeviceVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const norm = (v: SpeechSynthesisVoice) => v.lang.toLowerCase().replace('_', '-');
  const want = lang.toLowerCase();
  return voices.find((v) => norm(v) === want) ?? voices.find((v) => norm(v).startsWith(want.slice(0, 2))) ?? null;
}

/** Lê com a voz do dispositivo. Devolve stop(). */
export function speakWithDevice(text: string, lang: string): { done: Promise<void>; stop: () => void } {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return { done: Promise.resolve(), stop: () => undefined };
  const synth = window.speechSynthesis; synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang; const v = pickDeviceVoice(lang); if (v) u.voice = v; u.rate = 1.02;
  const done = new Promise<void>((resolve) => { u.onend = () => resolve(); u.onerror = () => resolve(); });
  synth.speak(u);
  return { done, stop: () => synth.cancel() };
}

/** Toca áudio base64 (ElevenLabs). Devolve stop(). */
export function playBase64(b64: string, mime: string): { done: Promise<void>; stop: () => void } {
  const audio = new Audio(`data:${mime};base64,${b64}`);
  const done = new Promise<void>((resolve) => { audio.onended = () => resolve(); audio.onerror = () => resolve(); });
  void audio.play().catch(() => undefined);
  return { done, stop: () => { audio.pause(); audio.currentTime = 0; } };
}

/** Língua provável de um texto (para a voz da resposta): pt / fr / en. */
export function guessLang(text: string, fallback: string): string {
  const t = ` ${text.toLowerCase().slice(0, 400)} `;
  const score = (words: string[]) => words.reduce((n, w) => n + (t.split(` ${w} `).length - 1), 0);
  const pt = score(['não', 'nao', 'você', 'está', 'são', 'com', 'para', 'uma', 'dos', 'das', 'também', 'é']);
  const fr = score(['les', 'des', 'est', 'une', 'pour', 'avec', 'pas', 'vous', 'sur', 'dans', 'être']);
  const en = score(['the', 'and', 'with', 'for', 'this', 'that', 'are', 'not', 'you']);
  if (pt >= fr && pt >= en && pt > 0) return 'pt-PT';
  if (fr >= en && fr > 0) return 'fr-FR';
  if (en > 0) return 'en-US';
  return fallback;
}
