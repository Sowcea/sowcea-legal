/**
 * AgentMarkdown — renderiza a resposta do agente do módulo de forma arrumada, moderna e responsiva.
 * Pedido Marino 07/09/2026: "coloca listas, cards, algo moderno, intuitivo, bonito e acima de tudo arrumado responsivamente".
 * Sem dependências: parser markdown mínimo (títulos, listas, tabelas, citações, código, negrito/itálico/links).
 *  - Tabela de 2 colunas  → cartão chave/valor (lê-se bem em telemóvel).
 *  - Tabela de 3+ colunas → tabela compacta em ecrã largo, cartões por linha em ecrã estreito.
 *  - Títulos → secções com barra de cor do módulo; listas → itens com marcador de cor.
 */
import type { JSX, ReactNode } from 'react';

type Block =
  | { t: 'h'; level: number; text: string }
  | { t: 'p'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'quote'; text: string }
  | { t: 'code'; text: string }
  | { t: 'hr' };

const isTableLine = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isSepLine = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const splitRow = (l: string) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

export function parseMarkdown(src: string): Block[] {
  const lines = (src ?? '').replace(/\r\n/g, '\n').split('\n');
  const out: Block[] = [];
  let i = 0;
  const flushPara = (buf: string[]) => { const text = buf.join(' ').trim(); if (text) out.push({ t: 'p', text }); };
  let para: string[] = [];
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) { flushPara(para); para = []; i++; continue; }
    if (trimmed.startsWith('```')) {
      flushPara(para); para = [];
      const buf: string[] = []; i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) { buf.push(lines[i]); i++; }
      i++; out.push({ t: 'code', text: buf.join('\n') }); continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (h) { flushPara(para); para = []; out.push({ t: 'h', level: h[1].length, text: h[2].replace(/\s*#+$/, '') }); i++; continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) { flushPara(para); para = []; out.push({ t: 'hr' }); i++; continue; }
    if (isTableLine(trimmed)) {
      flushPara(para); para = [];
      const rowsRaw: string[] = [];
      while (i < lines.length && isTableLine(lines[i].trim())) { rowsRaw.push(lines[i].trim()); i++; }
      const body = rowsRaw.filter((r) => !isSepLine(r));
      if (body.length) {
        const head = splitRow(body[0]);
        const rows = body.slice(1).map(splitRow).map((r) => (r.length < head.length ? [...r, ...Array(head.length - r.length).fill('')] : r.slice(0, head.length)));
        out.push({ t: 'table', head, rows });
      }
      continue;
    }
    if (/^>\s?/.test(trimmed)) {
      flushPara(para); para = [];
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) { buf.push(lines[i].trim().replace(/^>\s?/, '')); i++; }
      out.push({ t: 'quote', text: buf.join(' ') }); continue;
    }
    if (/^([-*•]|\d+[.)])\s+/.test(trimmed)) {
      flushPara(para); para = [];
      const ordered = /^\d+[.)]\s+/.test(trimmed);
      const items: string[] = [];
      while (i < lines.length) {
        const l = lines[i]; const tr = l.trim();
        if (/^([-*•]|\d+[.)])\s+/.test(tr)) { items.push(tr.replace(/^([-*•]|\d+[.)])\s+/, '')); i++; }
        else if (tr && /^\s{2,}/.test(l) && items.length) { items[items.length - 1] += ' ' + tr; i++; } // continuação indentada
        else break;
      }
      out.push({ t: ordered ? 'ol' : 'ul', items }); continue;
    }
    para.push(trimmed); i++;
  }
  flushPara(para);
  return out;
}

/** inline: **negrito**, *itálico*, `código`, [texto](url), ~~riscado~~ */
export function Inline({ text }: { text: string }): JSX.Element {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)\s]+)\)|\*[^*\n]+\*|~~[^~]+~~)/g;
  let last = 0; let m: RegExpExecArray | null; let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    const tok = m[0];
    if (tok.startsWith('**')) nodes.push(<strong key={k++} className="font-semibold text-slate-900">{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith('`')) nodes.push(<code key={k++} className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[0.85em] text-slate-800">{tok.slice(1, -1)}</code>);
    else if (tok.startsWith('[')) { const lm = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(tok); nodes.push(<a key={k++} href={lm?.[2]} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2">{lm?.[1]}</a>); }
    else if (tok.startsWith('~~')) nodes.push(<s key={k++} className="text-slate-500">{tok.slice(2, -2)}</s>);
    else nodes.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) nodes.push(<span key={k++}>{text.slice(last)}</span>);
  return <>{nodes}</>;
}

function KeyValueCard({ head, rows, accent }: { head: string[]; rows: string[][]; accent: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {head.some((h) => h) && (
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600" style={{ background: `${accent}14` }}>
          <span>{head[0]}</span><span>{head[1]}</span>
        </div>
      )}
      <dl className="divide-y divide-slate-100">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,42%)_minmax(0,1fr)] gap-x-3 px-3 py-2 text-[13px]">
            <dt className="text-slate-600"><Inline text={r[0] ?? ''} /></dt>
            <dd className="min-w-0 break-words font-medium text-slate-900"><Inline text={r[1] ?? ''} /></dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ResponsiveTable({ head, rows, accent }: { head: string[]; rows: string[][]; accent: string }) {
  return (
    <div>
      {/* ecrã largo: tabela compacta com scroll horizontal próprio */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr style={{ background: `${accent}14` }}>
              {head.map((h, i) => <th key={i} className="whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600"><Inline text={h} /></th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((r, i) => (
              <tr key={i} className="align-top">
                {r.map((c, j) => <td key={j} className={`px-3 py-2 ${j === 0 ? 'font-medium text-slate-900' : 'text-slate-700'}`}><Inline text={c} /></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* ecrã estreito: um cartão por linha */}
      <div className="space-y-2 sm:hidden">
        {rows.map((r, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-1.5 text-[13px] font-semibold text-slate-900"><Inline text={r[0] ?? ''} /></p>
            <dl className="space-y-1">
              {r.slice(1).map((c, j) => (
                <div key={j} className="flex items-baseline justify-between gap-3 text-[12px]">
                  <dt className="shrink-0 text-slate-600"><Inline text={head[j + 1] ?? ''} /></dt>
                  <dd className="min-w-0 break-words text-right text-slate-800"><Inline text={c} /></dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

/** texto legível (≥ 4.5:1) sobre o accent — mesma regra do dock */
function inkOn(hex: string): string {
  const h = hex.replace('#', ''); const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6); const n = parseInt(full, 16);
  if (Number.isNaN(n)) return '#ffffff';
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  const l = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  return (1.05 / (l + 0.05)) >= 4.5 ? '#ffffff' : '#0f172a';
}

export function AgentMarkdown({ text, accent = '#00b6b4' }: { text: string; accent?: string }) {
  const blocks = parseMarkdown(text);
  return (
    <div className="space-y-2.5 text-[13px] leading-relaxed text-slate-800">
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h': {
            const big = b.level <= 2;
            return (
              <div key={i} className={`flex items-center gap-2 ${i === 0 ? '' : 'pt-1'}`}>
                <span aria-hidden className="h-4 w-1 shrink-0 rounded-full" style={{ background: accent }} />
                <p className={`${big ? 'text-[14px]' : 'text-[13px]'} font-semibold text-slate-900`}><Inline text={b.text} /></p>
              </div>
            );
          }
          case 'p': return <p key={i} className="break-words"><Inline text={b.text} /></p>;
          case 'ul': return (
            <ul key={i} className="space-y-1.5">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2">
                  <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                  <span className="min-w-0 break-words"><Inline text={it} /></span>
                </li>
              ))}
            </ul>
          );
          case 'ol': return (
            <ol key={i} className="space-y-1.5">
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-[2px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold" style={{ background: accent, color: inkOn(accent) }}>{j + 1}</span>
                  <span className="min-w-0 break-words pt-[2px]"><Inline text={it} /></span>
                </li>
              ))}
            </ol>
          );
          case 'table': return b.head.length === 2
            ? <KeyValueCard key={i} head={b.head} rows={b.rows} accent={accent} />
            : <ResponsiveTable key={i} head={b.head} rows={b.rows} accent={accent} />;
          case 'quote': return (
            <blockquote key={i} className="rounded-r-xl border-l-4 bg-slate-50 px-3 py-2 text-slate-700" style={{ borderColor: accent }}><Inline text={b.text} /></blockquote>
          );
          case 'code': return <pre key={i} className="overflow-x-auto rounded-xl bg-slate-900 px-3 py-2 font-mono text-[12px] text-slate-100">{b.text}</pre>;
          case 'hr': return <hr key={i} className="border-slate-200" />;
          default: return null;
        }
      })}
    </div>
  );
}
