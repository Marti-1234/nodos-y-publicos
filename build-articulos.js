#!/usr/bin/env node
/**
 * Últimos artículos de Transferencias Culturales -> bloque "Últimos artículos" de index.html
 *
 * Sin dependencias (Node 18+, usa fetch). Lee el RSS del blog y sustituye lo
 * que hay entre los marcadores <!-- articulos:inicio --> y <!-- articulos:fin -->
 * por las tres entradas más recientes (título, fecha y enlace).
 *
 * El RSS de transferenciasculturales.com no envía cabeceras CORS, así que el
 * navegador no puede leerlo desde nodosypublicos.com: por eso la lista se
 * genera aquí y se publica como HTML estático.
 *
 * Uso: node build-articulos.js   (y después commit + push para publicar)
 */

const fs = require('fs');
const path = require('path');

const FEED_URL = 'https://transferenciasculturales.com/rss/';
const INDEX = path.join(__dirname, 'index.html');
const COUNT = 3;

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function decodeEntities(str) {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function tag(item, name) {
  const m = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decodeEntities(m[1]) : '';
}

function formatDate(date) {
  return `${date.getUTCDate()} de ${MESES[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}

async function main() {
  const res = await fetch(FEED_URL);
  if (!res.ok) throw new Error(`RSS respondió ${res.status}`);
  const xml = await res.text();

  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(([, item]) => ({ title: tag(item, 'title'), link: tag(item, 'link'), date: new Date(tag(item, 'pubDate')) }))
    .filter((it) => it.title && it.link.startsWith('https://') && !isNaN(it.date))
    .sort((a, b) => b.date - a.date)
    .slice(0, COUNT);

  if (items.length < COUNT) throw new Error(`Solo se han encontrado ${items.length} artículos en el RSS`);

  const cards = items.map((it) =>
    `        <a class="post" href="${escapeHtml(it.link)}" target="_blank" rel="noopener"><span class="meta">Transferencias Culturales · ${formatDate(it.date)}</span><h3>${escapeHtml(it.title)}</h3></a>`
  ).join('\n');

  const html = fs.readFileSync(INDEX, 'utf8');
  const re = /(<!-- articulos:inicio[^>]*-->\n)[\s\S]*?(\s*<!-- articulos:fin -->)/;
  if (!re.test(html)) throw new Error('No se encuentran los marcadores de artículos en index.html');
  fs.writeFileSync(INDEX, html.replace(re, `$1${cards}$2`));

  items.forEach((it) => console.log(`✓ ${formatDate(it.date)} · ${it.title}`));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
