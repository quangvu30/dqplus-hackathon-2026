const { transport, isReal, MAIL_FROM } = require('../../config/mailer');

// Best-effort email: returns 'sent' | 'failed' | 'skipped'; never throws.
async function sendEmail(to, subject, text) {
  try {
    const info = await transport.sendMail({ from: MAIL_FROM, to, subject, text });
    if (!isReal) {
      console.log(`[email:console] to=${to} subject="${subject}"`);
      return 'skipped';
    }
    return info.accepted?.length ? 'sent' : 'failed';
  } catch (err) {
    console.error('email send failed:', err.message);
    return 'failed';
  }
}

module.exports = { sendEmail };
