import { EmailSender } from './email-sender.interface.js';

export class NoopEmailSender extends EmailSender {
  async sendVerificationOtp() {
    return { accepted: true };
  }
}

