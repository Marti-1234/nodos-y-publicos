# Nodos y Públicos — one-pager

One-pager estático (HTML/CSS/JS, sin build step) que reestructura la home de
[nodosypublicos.com](https://nodosypublicos.com) según el brief de rediseño
del 10/08/26, más los artículos de Insights migrados desde WordPress/Elementor
a páginas estáticas (ver "Insights (artículos)" más abajo — esa parte sí tiene
un build step mínimo, `build-insights.js`). Implementación paralela a la web
actual (WordPress sigue sirviendo el resto del sitio por ahora), pensada para
desplegarse en el VPS de Hetzner gestionado con Coolify, la misma
infraestructura donde está alojada la web de Vindra.

## Estructura

```
index.html         página única, en la raíz
styles.css          sistema de diseño (extraído del CSS real de nodosypublicos.com)
i18n.js             diccionario de traducción ES/EN
script.js           idioma (ES/EN) + nav móvil + envío del formulario de contacto
assets/             favicons y logotipo
contact-service/    microservicio independiente (mensaje libre → email por SMTP)
content/insights/   artículos en markdown (fuente de los Insights)
build-insights.js   genera <slug>/index.html a partir de content/insights/*.md
<slug>/index.html   páginas de artículo generadas (no editar a mano)
```

## Bilingüe (ES/EN)

El toggle ES/EN del header traduce el contenido en cliente (mismo patrón que
la web actual): cada texto traducible lleva `data-i18n="clave"` en
`index.html`, y `i18n.js` centraliza las cadenas ES/EN. `script.js` aplica el
idioma guardado en `localStorage` al cargar y al hacer clic en ES/EN.

- El desplegable "Tipo de organización" traduce solo el texto visible; el
  `value` que se envía a MailerLite / al microservicio se mantiene siempre en
  español (las 8 categorías canónicas), para no duplicar taxonomías en el
  backend.
- La nota "these articles are currently published in Spanish only" solo se
  muestra cuando el idioma activo es inglés (los artículos del blog real
  siguen publicándose solo en español).
- Esta traducción es solo de interfaz (client-side): no hay URLs `/en/`
  independientes ni `hreflang`, igual que en el comportamiento actual del
  sitio.

## Insights (artículos)

El blog deja de depender de WordPress/Elementor. Cada artículo es un
`.md` en `content/insights/`, con frontmatter simple:

```
---
title: Título del artículo
excerpt: Una frase para meta description y listados.
category: IA y Gestión Cultural
author: Nombre Apellido
date: 2026-07-24
---

Cuerpo en markdown: ## subtítulos, **negrita**, *cursiva*,
[enlaces](url), listas -/1., > citas y tablas | a | b |.
```

**Para publicar un artículo nuevo:** añade un `.md` en `content/insights/`
con el nombre de archivo igual al slug que quieras (`mi-articulo-nuevo.md`
→ `nodosypublicos.com/mi-articulo-nuevo/`) y ejecuta:

```bash
node build-insights.js
```

Esto genera `mi-articulo-nuevo/index.html` con el mismo header, footer y
sistema de diseño del one-pager. Añade el enlace a mano en la sección
Insights de `index.html` (y su traducción en `i18n.js`) si quieres que
aparezca en la lista destacada de la home.

**Por qué las URLs no cambian:** los 6 artículos migrados desde WordPress
usan exactamente el mismo slug que tenían en `nodosypublicos.com` (rutas
planas en la raíz, no bajo `/blog-y-recursos/`), comprobado contra el sitio
en vivo. Mismo dominio, misma URL — cero redirects, cero pérdida de SEO.

**Limitación conocida:** el header/footer de `build-insights.js` están
duplicados a mano desde `index.html` con rutas absolutas (porque los
artículos viven un nivel por debajo). Si cambias el header o el footer del
one-pager, replica el cambio en `build-insights.js` y vuelve a ejecutar el
build.

**Pendiente:** con 6 artículos la lista de Insights de la home los muestra
todos y no hace falta un archivo/índice aparte. Si en el futuro hay más
artículos de los que caben en esa lista, habrá que construir una página de
archivo (`/insights/` o similar) — no existe todavía.

## Pendiente de confirmar con Martí

- **Logos de "Legitimidad"**: los 6 huecos ya están rellenos (AECID, ICOM,
  Gobierno de la República Dominicana/Cultura, UNESCO/Mondiacult 25 España,
  Dansa València, CCPE) en `assets/logos/`. El CCPE es una marca clara y va
  envuelto en un chip oscuro (`.nyp-logo-strip-chip`) para mantener contraste
  sobre el papel; el resto va directo.
- **`CONTACT_SERVICE_URL`** en `script.js`: apunta a un dominio provisional
  (`contacto.nodosypublicos.com`); actualizar con la URL real una vez desplegado
  el recurso Coolify del microservicio.
- **Insights**: los 6 enlaces ya apuntan a los artículos reales migrados
  desde WordPress (ver sección "Insights (artículos)" arriba).

## Despliegue en Coolify

Dos recursos independientes:

1. **One-pager** (este repo, raíz) — recurso "Static Site" nativo de Coolify.
   No requiere Dockerfile: Coolify sirve `index.html` directamente.
2. **`contact-service/`** — recurso Docker independiente (tiene su propio
   `Dockerfile`). Variables de entorno a configurar en Coolify (ver
   `contact-service/.env.example`):
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (cuenta Gandi)
   - `CONTACT_EMAIL_TO=info@nodosypublicos.com`
   - `ALLOWED_ORIGIN` (dominio exacto del one-pager, sin barra final)

Al conectar el repo a Coolify, cada `git push` puede redesplegar
automáticamente vía webhook.

## Desarrollo local

El one-pager no necesita build step; basta con servirlo como estático:

```bash
npx serve .
```

Para probar `contact-service` localmente:

```bash
cd contact-service
cp .env.example .env   # y rellenar credenciales SMTP reales
npm install
npm start
```
