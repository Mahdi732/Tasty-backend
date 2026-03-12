import axios from 'axios';
import { PushSender } from './push.sender.js';

export class FcmPushSender extends PushSender {
  constructor({ serverKey, logger }) {
    super();
    this.serverKey = serverKey;
    this.logger = logger;
  }

  async send({ toToken, title, body, data = {} }) {
    try {
      const response = await axios.post(
        'https://fcm.googleapis.com/fcm/send',
        {
          to: toToken,
          notification: { title, body },
          data,
        },
        {
          headers: {
            Authorization: `key=${this.serverKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        }
      );
      return { accepted: true, provider: 'fcm', response: response.data };
    } catch (error) {
      this.logger?.error({ err: error }, 'fcm_push_send_failed');
      throw error;
    }
  }
}
