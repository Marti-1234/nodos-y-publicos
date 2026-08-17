const express = require('express');
const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  CONTACT_EMAIL_TO,
  ALLOWED_ORIGIN,
  PORT = 3000,
} = process.env;

for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'CONTACT_EMAIL_TO', 'ALLOWED_ORIGIN']) {
  if (!process.env[key]) {
    console.error(`Falta la variable de entorno ${key}`);
    process.exit(1);
  }
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

const app = express();
app.use(express.json({ limit: '20kb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

function isNonEmptyString(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

// Elimina saltos de línea para evitar inyección de cabeceras SMTP en campos que van al asunto.
function sanitizeHeaderValue(value) {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

app.post('/send', async (req, res) => {
  const { nombre, email, tipo_organizacion: tipoOrganizacion, mensaje } = req.body || {};

  if (
    !isNonEmptyString(nombre, 200) ||
    !isNonEmptyString(email, 200) ||
    !isNonEmptyString(tipoOrganizacion, 300) ||
    !isNonEmptyString(mensaje, 1024)
  ) {
    return res.status(400).json({ error: 'Faltan campos obligatorios o son inválidos.' });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: 'Email inválido.' });
  }

  try {
    await transporter.sendMail({
      from: `"Nodos y Públicos — Web" <${SMTP_USER}>`,
      to: CONTACT_EMAIL_TO,
      replyTo: email,
      subject: `Nuevo mensaje desde nodosypublicos.com — ${sanitizeHeaderValue(nombre)}`,
      text: [
        `Nombre: ${nombre}`,
        `Email: ${email}`,
        `Tipo de organización: ${tipoOrganizacion}`,
        '',
        'Mensaje:',
        mensaje,
      ].join('\n'),
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error enviando el email de contacto:', error);
    res.status(502).json({ error: 'No se pudo enviar el mensaje.' });
  }
});

app.get('/health', (req, res) => res.status(200).json({ ok: true }));

app.listen(PORT, () => {
  console.log(`contact-service escuchando en el puerto ${PORT}`);
});
