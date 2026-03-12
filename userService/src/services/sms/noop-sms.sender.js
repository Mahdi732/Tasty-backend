import { SmsSender } from './sms-sender.interface.js';

export class NoopSmsSender extends SmsSender {
  async sendVerificationOtp() {
    return { accepted: true, provider: 'noop' };
  }
}
