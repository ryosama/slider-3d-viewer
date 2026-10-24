/* Shared parsing utilities. No network access or executable Markdown. */
(function (root) {
  'use strict';
  const defaults = {
    theme: {
      'slide-border-width': '1px', 'slide-border-color': '#3c424b',
      'slide-border-radius': '18px', 'slide-background-color': '#171a20',
      'slide-transparency': '10%', 'background-color': '#000', 'text-color': '#fff',
      'font-face': 'Arial, sans-serif', 'breadcrumb-style': 'dotted', 'breadcrumb-color': '#ef5350',
    },
    transition: {
      'when-slide-to-previous': 'zoom-out-zoom-in', 'when-slide-to-next': 'follow-breadcrumb',
      'when-slide-to-another': 'zoom-out-zoom-in', 'follow-breadcrumb-speed': '1',
      'zoom-out-ratio': '1.7', 'zoom-out-speed': '1', 'zoom-in-speed': '1',
    },
  };
  function parseConfig(text) {
    const config = { order: [], theme: { ...defaults.theme }, transition: { ...defaults.transition } };
    let section = '';
    for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
      const heading = line.match(/^#{1,6}\s+(order|theme|transition)\s*$/i);
      if (heading) { section = heading[1].toLowerCase(); continue; }
      if (/^#/.test(line)) { section = ''; continue; }
      const item = line.match(/^\s*-\s+(.+?)\s*$/);
      if (!item) continue;
      if (section === 'order') config.order.push(item[1].replace(/^`|`$/g, ''));
      else if (section === 'theme' || section === 'transition') {
        const pair = item[1].match(/^([a-z-]+)\s*:\s*(.+)$/);
        if (pair && Object.hasOwn(defaults[section], pair[1])) config[section][pair[1]] = pair[2];
      }
    }
    if (!['dotted', 'dashed', 'plain', 'none'].includes(config.theme['breadcrumb-style'])) config.theme['breadcrumb-style'] = 'dotted';
    for (const key of ['when-slide-to-previous', 'when-slide-to-next', 'when-slide-to-another']) {
      if (!['zoom-out-zoom-in', 'follow-breadcrumb'].includes(config.transition[key])) config.transition[key] = defaults.transition[key];
    }
    return config;
  }
  function number(value, fallback, min = .1, max = 10) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
  }
  function normalize(path) {
    const parts = [];
    for (const part of path.replace(/\\/g, '/').split('/')) {
      if (part === '..') parts.pop();
      else if (part && part !== '.') parts.push(part);
    }
    return parts.join('/');
  }
  function resolve(base, path) {
    return normalize(base.slice(0, base.lastIndexOf('/') + 1) + path);
  }
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const safeExternal = value => /^https?:\/\//i.test(value);
  function inline(text, context) {
    const token = /(!?\[([^\]]*)\]\(([^\s)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let result = '', last = 0, match;
    while ((match = token.exec(text))) {
      result += escape(text.slice(last, match.index));
      if (match[4] !== undefined) result += `<code>${escape(match[4])}</code>`;
      else if (match[5] !== undefined) result += `<strong>${escape(match[5])}</strong>`;
      else if (match[6] !== undefined) result += `<em>${escape(match[6])}</em>`;
      else {
        const label = escape(match[2]);
        let url;
        try { url = decodeURI(match[3]); } catch { url = match[3]; }
        if (match[1].startsWith('!')) {
          const source = context.image(url);
          result += source ? `<img src="${escape(source)}" alt="${label}" loading="eager">` : `<span class="missing-image">[Image introuvable : ${label}]</span>`;
        } else if (safeExternal(url)) result += `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;
        else if (/^mailto:/i.test(url)) result += `<a href="${escape(url)}">${label}</a>`;
        else if (!/^[a-z][a-z\d+.-]*:/i.test(url) && !url.startsWith('//')) result += `<a href="#" data-slide-link="${escape(url)}">${label}</a>`;
        else result += label;
      }
      last = token.lastIndex;
    }
    return result + escape(text.slice(last));
  }
  function markdown(text, context = { image: () => null }) {
    const lines = text.replace(/\r/g, '').split('\n');
    let html = '', paragraph = [], list = '', code = null;
    function flush() { if (paragraph.length) { html += `<p>${inline(paragraph.join(' '), context)}</p>`; paragraph = []; } }
    function endList() { if (list) { html += `</${list}>`; list = ''; } }
    for (const line of lines) {
      if (/^\s*```/.test(line)) {
        flush(); endList();
        if (code !== null) { html += `<pre><code>${escape(code.join('\n'))}</code></pre>`; code = null; } else code = [];
        continue;
      }
      if (code !== null) { code.push(line); continue; }
      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      const item = line.match(/^\s*(?:([-*])|\d+\.)\s+(.+)$/);
      if (heading) { flush(); endList(); html += `<h${heading[1].length}>${inline(heading[2], context)}</h${heading[1].length}>`; }
      else if (item) { flush(); const type = item[1] ? 'ul' : 'ol'; if (list !== type) { endList(); list = type; html += `<${list}>`; } html += `<li>${inline(item[2], context)}</li>`; }
      else if (/^>\s?/.test(line)) { flush(); endList(); html += `<blockquote>${inline(line.replace(/^>\s?/, ''), context)}</blockquote>`; }
      else if (/^\s*(---|\*\*\*)\s*$/.test(line)) { flush(); endList(); html += '<hr>'; }
      else if (!line.trim()) { flush(); endList(); }
      else { endList(); paragraph.push(line.trim()); }
    }
    flush(); endList();
    if (code !== null) html += `<pre><code>${escape(code.join('\n'))}</code></pre>`;
    return html;
  }
  function title(text, fallback) { return text.match(/^#\s+(.+)$/m)?.[1] || fallback.replace(/\.md$/i, ''); }
  const api = { defaults, parseConfig, number, normalize, resolve, escape, safeExternal, markdown, title };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Orbite = api;
})(typeof window === 'undefined' ? globalThis : window);
