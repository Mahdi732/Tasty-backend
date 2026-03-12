import { SmsSender } from './sms.sender.js';

export class NoopSmsSender extends SmsSender {
  async send() {
    return { accepted: true, provider: 'noop' };
  }
}
