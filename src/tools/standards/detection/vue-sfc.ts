import path from 'node:path';
import { inspectText } from './inspection.js';

export interface SfcBlock { kind: 'script' | 'style'; language?: string; content: string }

/** Inspect complete top-level blocks; skip template/custom bodies as opaque content. */
export async function inspectSfc(root: string, file: string, text: string): Promise<SfcBlock[]> {
  const blocks: SfcBlock[] = [];
  let offset = 0;
  while (offset < text.length) {
    const rest = text.slice(offset);
    const whitespace = /^\s+/.exec(rest);
    if (whitespace) { offset += whitespace[0].length; continue; }
    if (rest.startsWith('<!--')) {
      const end = text.indexOf('-->', offset + 4);
      if (end < 0) break;
      offset = end + 3;
      continue;
    }
    const start = /^<([a-z][\w-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/i.exec(rest);
    if (!start) break;
    const tag = start[1].toLowerCase();
    const attrs = new Map<string, string>();
    const attrText = start[2].replace(/\/\s*$/, '');
    const attr = /\s+([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s'"=<>`]+)))?/gy;
    let at = 0;
    let valid = true;
    while (at < attrText.trimEnd().length) {
      attr.lastIndex = at;
      const match = attr.exec(attrText);
      if (!match || attrs.has(match[1].toLowerCase())) { valid = false; break; }
      attrs.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
      at = attr.lastIndex;
    }
    const bodyStart = offset + start[0].length;
    const selfClosing = /\/\s*$/.test(start[2]);
    // Balance nested template tags without inspecting their script-like text.
    const closing = new RegExp(`<!--[^]*?-->|${tag === 'template' ? '{{[^]*?}}|' : ''}<\\/?${tag}\\b(?:"[^"]*"|'[^']*'|[^'">])*>`, 'gi');
    closing.lastIndex = bodyStart;
    let depth = 1;
    let bodyEnd = bodyStart;
    let end = bodyStart;
    if (!selfClosing) {
      let match;
      while ((match = closing.exec(text))) {
        if (match[0].startsWith('<!--') || match[0].startsWith('{{')) continue;
        if (match[0].startsWith('</')) depth--;
        else if (tag === 'template' && !/\/\s*>$/.test(match[0])) depth++;
        if (depth === 0) { bodyEnd = match.index; end = closing.lastIndex; break; }
      }
      if (depth !== 0) break;
    }
    offset = end;
    if (!valid || (tag !== 'script' && tag !== 'style')) continue;
    let language = attrs.get('lang')?.toLowerCase();
    let content = text.slice(bodyStart, bodyEnd);
    if (attrs.has('src')) {
      const src = attrs.get('src') ?? '';
      content = '';
      if (src && !path.isAbsolute(src) && !/^[\w@]+:|[?#]/.test(src)) {
        const local = path.join(path.dirname(file), src);
        const external = await inspectText(root, local);
        if (external !== undefined) {
          content = external;
          language ??= path.extname(src).slice(1).toLowerCase();
        }
      }
      if (!language) continue;
    } else {
      language ??= tag === 'script' ? 'js' : 'css';
    }
    blocks.push({ kind: tag, language, content });
  }
  return blocks;
}
