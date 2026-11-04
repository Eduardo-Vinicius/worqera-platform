const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isEmail(value) {
  return EMAIL_RE.test(String(value || '').trim().toLowerCase());
}

/** Trimmed, lowercased e-mail; '' clears it; anything else that is not an e-mail is refused. */
function normalizeEmail(value) {
  const email = String(value ?? '').trim().toLowerCase();
  if (email && !EMAIL_RE.test(email)) {
    const err = new Error('E-mail inválido. Confira se tem @ e o domínio (ex.: nome@gmail.com).');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  return email;
}

module.exports = { EMAIL_RE, isEmail, normalizeEmail };
