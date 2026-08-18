(() => {
  'use strict';

  /* ------------------------------------------------------------------
   * MailerLite — cuenta ya utilizada en nodosypublicos.com. Formulario
   * dedicado (solo nombre + email + tipo de organización, sin el campo
   * "mensaje", que va al microservicio propio).
   * ------------------------------------------------------------------ */
  const MAILERLITE_ACCOUNT_ID = '38397';
  const MAILERLITE_FORM_ID = '196072170508519379';

  /* Segundo recurso Coolify (microservicio de contacto), desplegado y
   * verificado end-to-end (SMTP, CORS, validación). */
  const CONTACT_SERVICE_URL = 'https://contacto.nodosypublicos.com/send';

  const LANG_STORAGE_KEY = 'nyp-lang';

  /* ---------------- Idioma (ES/EN) ---------------- */
  const titleEl = document.getElementById('nyp-title');
  const metaDescEl = document.getElementById('nyp-meta-desc');
  const insightNoteEl = document.getElementById('nyp-insight-note');
  const burgerEl = document.getElementById('nyp-burger');
  const langButtons = document.querySelectorAll('.nyp-lang button');

  let currentLang = 'es';

  function applyLanguage(lang) {
    const dict = window.NYP_I18N[lang];
    if (!dict) return;
    currentLang = lang;

    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const value = dict[key];
      if (value === undefined) return;
      if (el.tagName === 'OPTION') {
        el.textContent = value;
      } else {
        el.innerHTML = value;
      }
    });

    if (titleEl) titleEl.textContent = dict['meta.title'];
    if (metaDescEl) metaDescEl.setAttribute('content', dict['meta.description']);
    if (burgerEl) burgerEl.setAttribute('aria-label', dict['burger.ariaLabel']);

    if (insightNoteEl) {
      if (lang === 'en' && dict['insights.note']) {
        insightNoteEl.textContent = dict['insights.note'];
        insightNoteEl.style.display = 'block';
      } else {
        insightNoteEl.style.display = 'none';
      }
    }

    langButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }

  langButtons.forEach((btn) => {
    btn.addEventListener('click', () => applyLanguage(btn.getAttribute('data-lang')));
  });

  applyLanguage(localStorage.getItem(LANG_STORAGE_KEY) === 'en' ? 'en' : 'es');

  /* ---------------- Navegación móvil ---------------- */
  const mobileNav = document.getElementById('nyp-mobile-nav');

  if (burgerEl && mobileNav) {
    burgerEl.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('nyp-open');
      burgerEl.setAttribute('aria-expanded', String(isOpen));
    });
    mobileNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('nyp-open');
        burgerEl.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------------- Formulario de contacto ---------------- */
  const form = document.getElementById('nyp-contact-form');
  if (!form) return;

  const submitBtn = document.getElementById('nyp-form-submit-btn');
  const submitLabel = submitBtn.querySelector('.nyp-form-submit-label');
  const statusEl = document.getElementById('nyp-form-status');

  function setStatus(key, tone) {
    statusEl.textContent = key ? window.NYP_I18N[currentLang][key] : '';
    statusEl.className = 'nyp-form-status' + (key ? ' nyp-show' : '') + (tone ? ' nyp-status-' + tone : '');
  }

  /* Envío a MailerLite: se hace mediante un POST de formulario real a
   * un iframe oculto (igual que el embed oficial de MailerLite), no
   * mediante fetch — el endpoint no admite CORS para peticiones
   * fetch/XHR de origen cruzado. Al ir a un iframe oculto no es
   * posible leer la respuesta desde JS: se trata como "best effort". */
  function submitToMailerLite(data) {
    return new Promise((resolve) => {
      const frameName = 'nyp-ml-frame';
      let frame = document.getElementById(frameName);
      if (!frame) {
        frame = document.createElement('iframe');
        frame.id = frameName;
        frame.name = frameName;
        frame.style.display = 'none';
        document.body.appendChild(frame);
      }

      const mlForm = document.createElement('form');
      mlForm.action = `https://assets.mailerlite.com/jsonp/${MAILERLITE_ACCOUNT_ID}/forms/${MAILERLITE_FORM_ID}/subscribe`;
      mlForm.method = 'POST';
      mlForm.target = frameName;
      mlForm.style.display = 'none';

      const fields = {
        'fields[name]': data.nombre,
        'fields[email]': data.email,
        'fields[tipo_de_organizacion]': data.tipo_organizacion,
        'ml-submit': '1',
      };
      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        mlForm.appendChild(input);
      });

      document.body.appendChild(mlForm);
      mlForm.submit();
      mlForm.remove();

      // No hay forma fiable de confirmar el resultado desde un iframe
      // cross-origin: se resuelve tras un breve margen para dar tiempo
      // al envío antes de continuar con el flujo del microservicio.
      setTimeout(resolve, 400);
    });
  }

  async function submitToContactService(data) {
    const response = await fetch(CONTACT_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('contact-service responded with ' + response.status);
    return response;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = {
      nombre: form.nombre.value.trim(),
      email: form.email.value.trim(),
      tipo_organizacion: form.tipo_organizacion.value,
      mensaje: form.mensaje.value.trim(),
    };
    const consentPrivacy = form.consent_privacy.checked;
    const consentNewsletter = form.consent_newsletter.checked;

    if (!data.nombre || !data.email || !data.tipo_organizacion || !data.mensaje) {
      setStatus('form.statusIncomplete', 'warn');
      return;
    }
    if (!consentPrivacy) {
      setStatus('form.statusConsent', 'warn');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    submitLabel.textContent = window.NYP_I18N[currentLang]['form.sending'];
    setStatus(null, null);

    /* RGPD: el envío del mensaje (interés legítimo en responder la consulta)
     * y la suscripción a la lista de MailerLite (marketing) requieren
     * consentimientos distintos. Solo se llama a MailerLite si la persona
     * ha marcado explícitamente la casilla de newsletter. */
    const tasks = [submitToContactService(data)];
    if (consentNewsletter) tasks.unshift(submitToMailerLite(data));
    else tasks.unshift(Promise.resolve({ skipped: true }));

    const [mlResult, serviceResult] = await Promise.allSettled(tasks);

    submitBtn.disabled = false;
    submitBtn.removeAttribute('aria-busy');
    submitLabel.textContent = window.NYP_I18N[currentLang]['form.submit'];

    if (serviceResult.status === 'fulfilled') {
      setStatus('form.statusOk', 'ok');
      form.reset();
    } else if (consentNewsletter && mlResult.status === 'fulfilled') {
      setStatus('form.statusWarn', 'warn');
    } else {
      setStatus('form.statusError', 'error');
    }
  });
})();
