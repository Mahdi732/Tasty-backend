export class MemoryEmailSender {
  constructor() {
    this.sent = [];
  }

  async sendVerificationOtp(payload) {
    this.sent.push(payload);
    return { accepted: true };
  }

  latestOtpFor(email) {
    const normalized = String(email).toLowerCase();
    for (let i = this.sent.length - 1; i >= 0; i -= 1) {
      if (String(this.sent[i].toEmail).toLowerCase() === normalized) {
        return this.sent[i].otpCode;
      }
    }
    return null;
  }
}

