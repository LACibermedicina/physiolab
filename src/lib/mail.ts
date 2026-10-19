import nodemailer from 'nodemailer';
export async function sendMail(to: string, subject: string, text: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) throw new Error('SMTP nao configurado');
  const tr = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465), secure: process.env.SMTP_SECURE !== 'false',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  await tr.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text });
}
