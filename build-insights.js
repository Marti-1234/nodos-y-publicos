#!/usr/bin/env node
/**
 * Mini generador de artículos: content/insights/*.md -> <slug>/index.html
 *
 * Sin dependencias (Node puro). Cada .md lleva un frontmatter simple
 * (title, excerpt, category, author, date) y el cuerpo en un subconjunto
 * de markdown: ## y ### para títulos, **negrita**, *cursiva*,
 * [texto](url), listas -/1., > cita y tablas | a | b |.
 *
 * Uso: node build-insights.js
 *
 * Las URLs de salida son deliberadamente idénticas a las que ya usa
 * nodosypublicos.com en WordPress (slug plano en la raíz, ej.
 * /del-dato-al-criterio/) para no perder el indexado SEO existente.
 *
 * El header/footer de este template están duplicados a mano desde
 * index.html (con rutas absolutas en vez de relativas, porque estas
 * páginas viven un nivel por debajo). Si cambias el header/footer del
 * one-pager, recuerda replicar el cambio aquí.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const CONTENT_DIR = path.join(ROOT, 'content', 'insights');

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function formatDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('Frontmatter no encontrado');
  const meta = {};
  match[1].split('\n').forEach((line) => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  });
  return { meta, body: match[2].trim() };
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(text) {
  // Los textos ya vienen de markdown de confianza (autoría propia), no de
  // entrada de usuario, así que no hace falta un escapado exhaustivo salvo
  // para no romper el HTML con < > sueltos.
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+?)\*([^*]|$)/g, '$1<em>$2</em>$3')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function isBlockStart(line) {
  return (
    /^#{2,3}\s+/.test(line) ||
    line.startsWith('> ') ||
    line.trim().startsWith('|') ||
    /^-\s+/.test(line) ||
    /^\d+\.\s+/.test(line)
  );
}

function renderTable(rows) {
  const parseRow = (r) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const header = parseRow(rows[0]);
  const bodyRows = rows.slice(2).map(parseRow); // rows[1] es la fila separadora ---
  let out = '<div class="nyp-article-table-wrap"><table><thead><tr>';
  header.forEach((h) => { out += `<th>${inline(h)}</th>`; });
  out += '</tr></thead><tbody>';
  bodyRows.forEach((r) => {
    out += '<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>';
  });
  out += '</tbody></table></div>';
  return out;
}

function renderMarkdown(md) {
  const lines = md.split('\n');
  let html = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }

    const heading = line.match(/^(#{2,3})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      html += `<h${level}>${inline(heading[2])}</h${level}>\n`;
      i++; continue;
    }

    if (line.startsWith('> ')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('> ')) { buf.push(lines[i].slice(2)); i++; }
      html += `<blockquote>${inline(buf.join(' '))}</blockquote>\n`;
      continue;
    }

    if (line.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i]); i++; }
      html += renderTable(rows) + '\n';
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\d+\.\s+/, '')); i++; }
      html += '<ol>' + items.map((it) => `<li>${inline(it)}</li>`).join('') + '</ol>\n';
      continue;
    }

    if (/^-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) { items.push(lines[i].replace(/^-\s+/, '')); i++; }
      html += '<ul>' + items.map((it) => `<li>${inline(it)}</li>`).join('') + '</ul>\n';
      continue;
    }

    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) { buf.push(lines[i]); i++; }
    html += `<p>${inline(buf.join(' '))}</p>\n`;
  }

  return html;
}

function headerHtml() {
  return `<header class="nyp-header">
  <div class="nyp-header-inner">
    <a href="/" class="nyp-logo">
      <img src="/assets/favicon.svg" alt="" class="nyp-logo-icon" width="38" height="38">
      <img src="/assets/logo.png" alt="Nodos y Públicos" class="nyp-logo-word" width="331" height="33">
    </a>
    <nav class="nyp-nav">
      <ul class="nyp-nav-links">
        <li><a href="/#resolvemos">Qué resolvemos</a></li>
        <li><a href="/#paraquien">Para quién</a></li>
        <li><a href="/#comotrabajamos">Cómo trabajamos</a></li>
        <li><a href="/#casos">Casos de uso</a></li>
        <li><a href="/#sobre">Sobre nosotros</a></li>
      </ul>
      <a href="/#contacto" class="nyp-cta-btn">Hablemos</a>
    </nav>
    <button class="nyp-burger" id="nyp-burger" aria-expanded="false" aria-controls="nyp-mobile-nav" aria-label="Abrir menú">
      <span></span><span></span><span></span>
    </button>
  </div>
  <nav class="nyp-mobile-nav" id="nyp-mobile-nav">
    <a href="/#resolvemos">Qué resolvemos</a>
    <a href="/#paraquien">Para quién</a>
    <a href="/#comotrabajamos">Cómo trabajamos</a>
    <a href="/#casos">Casos de uso</a>
    <a href="/#sobre">Sobre nosotros</a>
    <a href="/#contacto" class="nyp-cta-btn">Hablemos</a>
  </nav>
</header>`;
}

function footerHtml() {
  return `<footer>
  <div class="nyp-wrap">
    <div class="nyp-footer-inner">
      <div>
        <a href="/" class="nyp-logo">
          <img src="/assets/favicon.svg" alt="" class="nyp-logo-icon" width="28" height="28">
          <img src="/assets/logo.png" alt="Nodos y Públicos" class="nyp-logo-word" width="331" height="33">
        </a>
        <p class="nyp-footer-tag">nodosypublicos.com</p>
      </div>
      <div class="nyp-footer-names">
        <span>Martí Perramon · Javier Iturralde de Bracamonte</span>
        &nbsp;·&nbsp;<a href="https://nodosypublicos.com/aviso-legal/" target="_blank" rel="noopener">Aviso legal</a>
        &nbsp;·&nbsp;<a href="https://nodosypublicos.com/privacidad/" target="_blank" rel="noopener">Privacidad</a>
        &nbsp;·&nbsp;<a href="https://nodosypublicos.com/cookies/" target="_blank" rel="noopener">Cookies</a>
      </div>
    </div>
  </div>
</footer>`;
}

function articleHtml({ meta, contentHtml, slug }) {
  const dateFormatted = formatDate(meta.date);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(meta.title)} — Nodos y Públicos</title>
<meta name="description" content="${escapeHtml(meta.excerpt)}">
<link rel="canonical" href="https://nodosypublicos.com/${slug}/">

<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/assets/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">

<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(meta.title)}">
<meta property="og:description" content="${escapeHtml(meta.excerpt)}">
<meta property="og:url" content="https://nodosypublicos.com/${slug}/">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${escapeHtml(meta.title)}">
<meta name="twitter:description" content="${escapeHtml(meta.excerpt)}">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">

<link rel="stylesheet" href="/styles.css">
</head>
<body>

${headerHtml()}

<main>
<article class="nyp-article">
  <div class="nyp-wrap nyp-article-head">
    <a href="/#insights" class="nyp-article-back">← Insights</a>
    <div class="nyp-eyebrow">${escapeHtml(meta.category)}</div>
    <h1>${escapeHtml(meta.title)}</h1>
    <div class="nyp-article-meta">${escapeHtml(meta.author)} · ${dateFormatted}</div>
  </div>
  <div class="nyp-wrap nyp-article-body">
${contentHtml}  </div>
  <div class="nyp-wrap nyp-article-cta">
    <div class="nyp-lead-box">
      <p>¿Quieres hablar sobre cómo aplicar esto en tu organización? Cuéntanos tu contexto y lo revisamos juntos.</p>
      <a href="/#contacto" class="nyp-cta-btn">Hablemos</a>
    </div>
  </div>
</article>
</main>

${footerHtml()}

<script>
(() => {
  const burger = document.getElementById('nyp-burger');
  const nav = document.getElementById('nyp-mobile-nav');
  if (!burger || !nav) return;
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('nyp-open');
    burger.setAttribute('aria-expanded', String(open));
  });
})();
</script>
</body>
</html>
`;
}

function build() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error('No existe content/insights/');
    process.exit(1);
  }
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    console.log('No hay artículos .md en content/insights/');
    return;
  }

  files.forEach((file) => {
    const slug = file.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const contentHtml = renderMarkdown(body);
    const html = articleHtml({ meta, contentHtml, slug });

    const outDir = path.join(ROOT, slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
    console.log('generado:', `/${slug}/`);
  });

  console.log(`\n${files.length} artículo(s) generado(s).`);
}

build();
