const OFFICE = 'essentia360.office@gmail.com';
const FROM = 'Essentia360 <quotes@mail.essentia360.co.za>';
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clip = (s, n) => String(s == null ? '' : s).slice(0, n);

async function send(payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error('resend ' + r.status + ' ' + (await r.text()).slice(0, 300));
  return r.json();
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'POST only' });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  if (b.hp) return res.status(200).json({ success: true });
  const d = {
    service: clip(b.service, 200) || 'Not specified', name: clip(b.name, 120), email: clip(b.email, 160),
    cell: clip(b.cell, 40), area: clip(b.area, 160), property: clip(b.property, 160), job: clip(b.job, 3000) || '(not provided)'
  };
  if (!d.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email) || !d.cell || !d.area) return res.status(400).json({ success: false, message: 'Missing details' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ success: false, message: 'Not configured' });

  const rows = [['Service', d.service], ['Name', d.name], ['Email', d.email], ['Cell', d.cell], ['Area', d.area], ['Property', d.property], ['Job description', d.job]];
  const table = '<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">' + rows.map(r => '<tr><td style="padding:6px 14px 6px 0;color:#555;vertical-align:top"><b>' + r[0] + '</b></td><td style="padding:6px 0;white-space:pre-wrap">' + esc(r[1]) + '</td></tr>').join('') + '</table>';
  const text = rows.map(r => r[0] + ': ' + r[1]).join('\n');

  try {
    await send({
      from: FROM, to: [OFFICE], reply_to: d.email,
      subject: 'New quote request: ' + d.service + ' - ' + d.area,
      html: '<p style="font-family:Arial,sans-serif">New quote request from the Essentia360 website. Reply to this email to reach the customer.</p>' + table,
      text: 'New quote request from the Essentia360 website. Reply to this email to reach the customer.\n\n' + text
    });
  } catch (e) {
    console.error(e.message);
    return res.status(502).json({ success: false, message: 'Send failed' });
  }
  try {
    await send({
      from: FROM, to: [d.email],
      subject: 'We received your quote request - Essentia360',
      html: '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5"><p>Hi ' + esc(d.name.split(' ')[0]) + ',</p><p>Thank you, your request has been received. We will be in touch to arrange an appointment for a site assessment.</p><p>Here is what you sent us:</p>' + table + '<p>If you need to reach us, email essentia360.office@gmail.com.</p><p>Kind regards,<br>Essentia360<br>essentia360.co.za</p></div>',
      text: 'Hi ' + d.name.split(' ')[0] + ',\n\nThank you, your request has been received. We will be in touch to arrange an appointment for a site assessment.\n\nHere is what you sent us:\n' + text + '\n\nIf you need to reach us, email essentia360.office@gmail.com.\n\nKind regards,\nEssentia360\nessentia360.co.za'
    });
  } catch (e) { console.error('confirm ' + e.message); }
  return res.status(200).json({ success: true });
};
