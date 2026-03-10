import nodemailer from 'nodemailer';
import { EmailSender } from './email-sender.interface.js';

export class NodemailerEmailSender extends EmailSender {
  constructor({ env, logger }) {
    super();
    this.env = env;
    this.logger = logger;

    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }

  async sendVerificationOtp({ toEmail, otpCode, ttlSeconds }) {
    if (!this.env.SMTP_ENABLED) {
      this.logger.info({ toEmail }, 'smtp_disabled_skipping_email_send');
      return { accepted: true };
    }

    const subject = 'Verify your Tasty account email';
    const text = `Your verification code is ${otpCode}. It expires in ${Math.floor(ttlSeconds / 60)} minutes.`;

    await this.transporter.sendMail({
      from: this.env.SMTP_FROM,
      to: toEmail,
      subject,
      text,
    });

    return { accepted: true };
  }
}

