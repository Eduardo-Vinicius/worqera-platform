/**
 * Mailer v1 — Gmail/SMTP first (prod early), optional SES, else console.
 * Company branding: subject `[displayName]` and from `{name} via Worqera`.
 */
const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');

function envBool(key, fallback = false) {
  const v = process.env[key];
  if (v == null || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

function smtpConfig() {
  const user =
    process.env.WORQERA_Email__Smtp__Username ||
    process.env.GMAIL_USER ||
    process.env.WORQERA_Email__FromAddress ||
    '';
  const pass =
    process.env.WORQERA_Email__Smtp__Password || process.env.GMAIL_APP_PASSWORD || '';
  const host = process.env.WORQERA_Email__Smtp__Host || 'smtp.gmail.com';
  const port = Number(process.env.WORQERA_Email__Smtp__Port || 587);
  return { user, pass, host, port };
}

function platformFromAddress() {
  return (
    process.env.WORQERA_Email__FromAddress ||
    process.env.SES_FROM_EMAIL ||
    process.env.GMAIL_USER ||
    'noreply@worqera.com'
  );
}

function companyDisplayName(shop) {
  if (!shop) return 'Worqera';
  return (
    shop.branding?.displayName ||
    shop.branding?.emailFromName ||
    shop.name ||
    'Worqera'
  );
}

function brandedFrom(shop) {
  const name = companyDisplayName(shop);
  const addr = platformFromAddress();
  const fromName =
    shop?.branding?.emailFromName ||
    process.env.WORQERA_Email__FromName ||
    `${name} via Worqera`;
  return `"${String(fromName).replace(/"/g, '')}" <${addr}>`;
}

function brandedSubject(shop, subject) {
  const name = companyDisplayName(shop);
  const raw = String(subject || 'Worqera');
  if (raw.startsWith(`[${name}]`)) return raw;
  return `[${name}] ${raw}`;
}

function wrapCompanyHtml(shop, bodyHtml) {
  const name = companyDisplayName(shop);
  const logo = shop?.branding?.logoUrl
    ? `<img src="${shop.branding.logoUrl}" alt="${name}" style="max-height:40px;margin-bottom:12px" />`
    : '';
  return `<div style="font-family:Inter,system-ui,sans-serif;color:#110f17;line-height:1.5">
  <div style="border-bottom:2px solid #7d26de;padding-bottom:12px;margin-bottom:16px">
    ${logo}
    <div style="font-size:18px;font-weight:600;color:#4f0fa6">${name}</div>
  </div>
  ${bodyHtml}
  <p style="margin-top:28px;font-size:12px;color:#64748b">Enviado pela Worqera · gestão de pedidos</p>
</div>`;
}

async function sendMail({ to, subject, html, text, shop }) {
  if (!to) {
    return { ok: false, skipped: true, reason: 'no-recipient' };
  }

  const payload = {
    from: brandedFrom(shop),
    to: String(to),
    subject: brandedSubject(shop, subject),
    html: html ? wrapCompanyHtml(shop, html) : undefined,
    text: text || undefined,
  };

  const emailEnabled = envBool('WORQERA_Email__Enabled', true);
  const smtp = smtpConfig();
  const preferSes = envBool('WORQERA_Email__PreferSes', false);

  const hasAwsCreds = Boolean(
    process.env.AWS_ACCESS_KEY_ID ||
      process.env.AWS_PROFILE ||
      process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI
  );

  if (
    preferSes &&
    process.env.SES_FROM_EMAIL &&
    process.env.AWS_REGION &&
    hasAwsCreds
  ) {
    try {
      const ses = new AWS.SES({ region: process.env.AWS_REGION });
      await ses
        .sendEmail({
          Source: payload.from,
          Destination: { ToAddresses: [payload.to] },
          Message: {
            Subject: { Data: payload.subject, Charset: 'UTF-8' },
            Body: {
              Html: payload.html ? { Data: payload.html, Charset: 'UTF-8' } : undefined,
              Text: {
                Data: payload.text || payload.subject,
                Charset: 'UTF-8',
              },
            },
          },
        })
        .promise();
      return { ok: true, provider: 'ses' };
    } catch (err) {
      console.error('[mailer] SES failed', err.message);
      if (process.env.NODE_ENV === 'production' && !smtp.user) throw err;
    }
  }

  if (emailEnabled && smtp.user && smtp.pass) {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    await transporter.sendMail(payload);
    return { ok: true, provider: 'smtp' };
  }

  console.info('[mailer:dev]', {
    to: payload.to,
    subject: payload.subject,
    text: payload.text || '(html)',
  });
  return { ok: true, provider: 'console', preview: true };
}

module.exports = {
  sendMail,
  fromAddress: platformFromAddress,
  companyDisplayName,
  brandedSubject,
  brandedFrom,
};
