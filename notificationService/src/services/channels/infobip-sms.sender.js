import axios from 'axios';
import { SmsSender } from './sms.sender.js';

export class InfobipSmsSender extends SmsSender {
  constructor({ baseUrl, apiKey, fromPhone, logger }) {
    super();
    this.baseUrl = String(baseUrl || '').replace(/\/$/, '');
    this.apiKey = apiKey;
    this.fromPhone = fromPhone;
    this.logger = logger;
  }

  async send({ toPhoneNumber, text }) {
    const payload = {
      messages: [
        {
          from: this.fromPhone,
          destinations: [{ to: toPhoneNumber }],
          text,
        },
      ],
    };

    try {
      const response = await axios.post(`${this.baseUrl}/sms/2/text/advanced`, payload, {
        headers: {
          Authorization: `App ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 8000,
      });
      const messageId = response.data?.messages?.[0]?.messageId || null;
      return { accepted: true, provider: 'infobip', messageId };
    } catch (error) {
      this.logger?.error({ err: error }, 'infobip_sms_send_failed');
      throw error;
    }
  }
}
