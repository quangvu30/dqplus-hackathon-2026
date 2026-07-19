require('dotenv').config();
const nodemailer = require('nodemailer');

// Without SMTP_HOST we fall back to a JSON transport that logs instead of sending,
// so the in-app notification path stays demoable with zero mail infra.
const transport = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

const isReal = Boolean(process.env.SMTP_HOST);
const MAIL_FROM = process.env.MAIL_FROM || 'VietNexus <no-reply@vietnexus.local>';

module.exports = { transport, isReal, MAIL_FROM };
