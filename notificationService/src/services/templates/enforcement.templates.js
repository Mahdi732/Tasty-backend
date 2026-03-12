export class EnforcementTemplates {
  buildDriverWaitingPush({ orderId }) {
    return {
      title: 'Driver is waiting',
      body: `Driver is waiting for Order #${orderId}. Please complete QR verification within 5 minutes.`,
    };
  }

  buildThreeMinutesWarningSms({ orderId }) {
    return `Warning: 3 mins left before account suspension. Order #${orderId}.`;
  }

  buildFraudDetectedSms({ idNumberMasked, amount }) {
    return `FRAUD DETECTED. Your ID ${idNumberMasked} is flagged with a debt of ${amount}. Legal action initiated.`;
  }
}
