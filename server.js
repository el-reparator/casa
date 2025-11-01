// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const sendgrid = require('@sendgrid/mail');
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
app.use(bodyParser.json());
app.use(express.static('public')); // serve index.html + app.js nella cartella public

// Recipients - in produzione prendi da DB o env var
const RECIPIENTS = (process.env.ALERT_RECIPIENTS || '').split(',').map(s => s.trim()).filter(Boolean);

app.post('/api/alert', async (req, res) => {
  const body = req.body;
  // Controlli di sicurezza: rate limit, autenticazione, validazione payload ecc.
  try {
    const msg = {
      to: RECIPIENTS,
      from: process.env.FROM_EMAIL,
      subject: `Allarme suono rilevato - ${new Date().toISOString()}`,
      text: `Rilevato suono. Dettagli: ${JSON.stringify(body)}`,
      html: `<p>Rilevato suono.</p><pre>${JSON.stringify(body,null,2)}</pre>`
    };
    await sendgrid.send(msg);
    return res.json({ ok: true });
  } catch (err) {
    console.error('SendGrid error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('Server listening on', PORT));
