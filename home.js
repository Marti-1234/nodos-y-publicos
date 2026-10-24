(function () {
  // Cola de personas: las rellenas son quienes ya vienen; las discontinuas, quienes podrían venir.
  var svg = document.getElementById('queue');
  if (svg) {
    var N = 26, step = 40, lit = [0, 1, 2, 4, 5, 7, 10, 13, 17, 22];
    var out = '<line class="ground" x1="0" y1="136" x2="1040" y2="136"></line>';
    for (var i = 0; i < N; i++) {
      var x = 20 + i * step, on = lit.indexOf(i) > -1;
      var cls = 'fig' + (on ? ' lit' : '');
      var style = on ? ' style="--i:' + lit.indexOf(i) + '"' : '';
      out += '<g transform="translate(' + x + ' 0)">' +
        '<circle class="' + cls + '"' + style + ' cx="0" cy="50" r="12"></circle>' +
        '<path class="' + cls + '"' + style + ' d="M-18 134 L-18 92 Q-18 70 0 70 Q18 70 18 92 L18 134 Z"></path></g>';
    }
    svg.innerHTML = out;
  }

  // Formulario de contacto → microservicio contact-service (SMTP a info@nodosypublicos.com).
  var CONTACT_SERVICE_URL = 'https://contacto.nodosypublicos.com/send';
  var form = document.getElementById('contact-form');
  if (!form) return;
  var status = document.getElementById('form-status');
  var submitBtn = document.getElementById('f-submit');

  function setStatus(text, kind) {
    status.textContent = text;
    status.className = 'status' + (kind ? ' ' + kind : '');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = {
      nombre: form.nombre.value.trim(),
      email: form.email.value.trim(),
      mensaje: form.mensaje.value.trim(),
      // El servicio exige este campo; en la home nueva la organización es opcional.
      tipo_organizacion: form.organizacion.value.trim() || 'No indicada',
    };

    if (!data.nombre || !data.mensaje) { setStatus('Escribe tu nombre y unas líneas sobre lo que quieres entender.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) { setStatus('Escribe un correo electrónico válido para poder responderte.'); return; }
    if (!form.consent_privacy.checked) { setStatus('Acepta el tratamiento de datos para poder enviar el mensaje.'); return; }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando…';
    setStatus('');

    fetch(CONTACT_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(function (res) {
      if (!res.ok) throw new Error('contact-service ' + res.status);
      setStatus('Gracias. Te respondo en unos días.', 'ok');
      form.reset();
    }).catch(function () {
      setStatus('No se ha podido enviar. Escríbeme a info@nodosypublicos.com.');
    }).then(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar';
    });
  });
})();
