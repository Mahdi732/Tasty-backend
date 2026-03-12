import { PushSender } from './push.sender.js';

export class NoopPushSender extends PushSender {
  async send() {
    return { accepted: true, provider: 'noop' };
  }
}
