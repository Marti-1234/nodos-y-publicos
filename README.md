# Nodos y Públicos — one-pager

One-pager estático (HTML/CSS/JS, sin build step) que reestructura la home de
[nodosypublicos.com](https://nodosypublicos.com) según el brief de rediseño
del 10/08/26. Implementación paralela a la web actual (WordPress), pensada
para desplegarse en el VPS de Hetzner gestionado con Coolify, la misma
infraestructura donde está alojada la web de Vindra.

## Estructura

```
index.html        página única, en la raíz
styles.css         sistema de diseño (extraído del CSS real de nodosypublicos.com)
i18n.js            diccionario de traducción ES/EN
script.js          idioma (ES/EN) + nav móvil + envío del formulario de contacto
assets/            favicons y logotipo
contact-service/   microservicio independiente (mensaje libre → email por SMTP)
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

## Pendiente de confirmar con Martí

- **Logos de "Legitimidad"**: la sección tiene placeholders (`<!-- LOGO: institución -->`
  en `index.html`) hasta tener el listado real de instituciones.
- **`MAILERLITE_FORM_ID`** en `script.js`: la cuenta de MailerLite (`38397`) ya
  está en uso en la web actual, pero el formulario que separa nombre/email/tipo
  de organización sin el campo mensaje aún no existe — crearlo y sustituir la
  constante.
- **`CONTACT_SERVICE_URL`** en `script.js`: apunta a un dominio provisional
  (`contacto.nodosypublicos.com`); actualizar con la URL real una vez desplegado
  el recurso Coolify del microservicio.
- **Insights**: los 5 enlaces apuntan de forma provisional al archivo del blog
  (`/blog-y-recursos/`) hasta confirmar la URL de cada artículo concreto.
- **Nota bilingüe de Insights**: el aviso "these articles are currently
  published in Spanish only" del sitio actual no se ha incluido — este
  one-pager es monolingüe en español, a diferencia de la home actual, que
  tiene un selector ES/EN. Confirmar si hace falta reintroducirlo.

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
