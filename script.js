(() => {
  'use strict';

  /* ------------------------------------------------------------------
   * MailerLite — cuenta ya utilizada en nodosypublicos.com (visible en
   * el código público del sitio actual). MAILERLITE_FORM_ID es un
   * placeholder: sustituir por el ID real en cuanto se cree el nuevo
   * formulario (solo nombre + email + tipo de organización, sin el
   * campo "mensaje", que va al microservicio propio).
   * ------------------------------------------------------------------ */
  const MAILERLITE_ACCOUNT_ID = '38397';
  const MAILERLITE_FORM_ID = 'REPLACE_WITH_NEW_FORM_ID';

  /* Segundo recurso Coolify (microservicio de contacto). Sustituir por
   * la URL real una vez desplegado. */
  const CONTACT_SERVICE_URL = 'https://contacto.nodosypublicos.com/send';

  /* ---------------- Navegación móvil ---------------- */
  const burger = document.getElementById('nyp-burger');
  const mobileNav = document.getElementById('nyp-mobile-nav');

  if (burger && mobileNav) {
    burger.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('nyp-open');
      burger.setAttribute('aria-expanded', String(isOpen));
    });
    mobileNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('nyp-open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------------- Formulario de contacto ---------------- */
  const form = document.getElementById('nyp-contact-form');
  if (!form) return;

  const submitBtn = document.getElementById('nyp-form-submit-btn');
  const submitLabel = submitBtn.querySelector('.nyp-form-submit-label');
  const statusEl = document.getElementById('nyp-form-status');

  function setStatus(message, tone) {
    statusEl.textContent = message;
    statusEl.className = 'nyp-form-status nyp-show' + (tone ? ' nyp-status-' + tone : '');
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

    if (!data.nombre || !data.email || !data.tipo_organizacion || !data.mensaje) {
      setStatus('Completa todos los campos antes de enviar.', 'warn');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    submitLabel.textContent = 'Enviando…';
    setStatus('', '');

    const [mlResult, serviceResult] = await Promise.allSettled([
      submitToMailerLite(data),
      submitToContactService(data),
    ]);

    submitBtn.disabled = false;
    submitBtn.removeAttribute('aria-busy');
    submitLabel.textContent = 'Enviar mensaje';

    if (serviceResult.status === 'fulfilled') {
      setStatus('¡Gracias! Hemos recibido tu mensaje. Te responderemos en menos de 24h.', 'ok');
      form.reset();
    } else if (mlResult.status === 'fulfilled') {
      setStatus('Te hemos añadido a nuestra lista, pero no hemos podido entregar tu mensaje. Escríbenos directamente a info@nodosypublicos.com.', 'warn');
    } else {
      setStatus('No hemos podido enviar tu mensaje. Escríbenos directamente a info@nodosypublicos.com.', 'error');
    }
  });
})();
