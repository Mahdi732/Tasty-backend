import axios from 'axios';
import { SmsSender } from './sms-sender.interface.js';

export class TwilioSmsSender extends SmsSender {
  constructor({ accountSid, authToken, fromPhone, logger }) {
    super();
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.fromPhone = fromPhone;
    this.logger = logger;
  }

  async sendVerificationOtp({ toPhoneNumber, otpCode, ttlSeconds }) {
    const body = new URLSearchParams({
      To: toPhoneNumber,
      From: this.fromPhone,
      Body: `Your Tasty verification code is ${otpCode}. It expires in ${Math.ceil(ttlSeconds / 60)} minutes.`,
    });

    try {
      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        body,
        {
          auth: { username: this.accountSid, password: this.authToken },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 8000,
        }
      );
      return { accepted: true, provider: 'twilio', messageId: response.data?.sid || null };
    } catch (error) {
      this.logger?.error({ err: error }, 'twilio_sms_send_failed');
      throw error;
    }
  }
}
