// src/utils/mailer.ts
import nodemailer from "nodemailer";
import { SentMessageInfo } from "nodemailer";

const {
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_SECURE,
  EMAIL_SERVICE,
  EMAIL_FROM,
} = process.env;

let transporter: nodemailer.Transporter | null = null;

const createTransporter = (): nodemailer.Transporter | null => {
  try {
    if (EMAIL_SERVICE) {
      return nodemailer.createTransport({
        service: EMAIL_SERVICE,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS,
        },
      });
    }

    if (EMAIL_HOST && EMAIL_USER && EMAIL_PASS) {
      const port = EMAIL_PORT ? Number(EMAIL_PORT) : undefined;
      const secure = EMAIL_SECURE === "true" || EMAIL_SECURE === "1";
      return nodemailer.createTransport({
        host: EMAIL_HOST,
        port,
        secure,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS,
        },
      });
    }

    // Try sendmail as last resort (local)
    return nodemailer.createTransport({ sendmail: true });
  } catch (err) {
    console.warn("createTransporter error:", err);
    return null;
  }
};

transporter = createTransporter();

export const sendMail = async (opts: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}): Promise<SentMessageInfo | null> => {
  const from = opts.from ?? EMAIL_FROM ?? EMAIL_USER ?? `no-reply@example.com`;
  if (!transporter) {
    // transporter not configured — log for dev and return null
    console.warn(
      `Mailer not configured. Pretending to send email to ${opts.to}. Subject: ${opts.subject}\nText: ${opts.text}`
    );
    // For local dev it's useful to still return a pseudo-info object
    return null;
  }
  try {
    const info = await transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return info;
  } catch (err) {
    console.error("sendMail error:", err);
    throw err;
  }
};

export default { sendMail };
