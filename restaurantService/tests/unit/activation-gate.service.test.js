import { ActivationGateService } from '../../src/services/activation-gate.service.js';

describe('ActivationGateService', () => {
  it('returns ACTIVE when subscription and verification pass', () => {
    const service = new ActivationGateService({ requireVerification: true });
    const result = service.evaluate({
      subscription: { status: 'ACTIVE' },
      verification: { status: 'VERIFIED' },
    });

    expect(result.nextStatus).toBe('ACTIVE');
    expect(result.activationBlockers).toHaveLength(0);
  });

  it('returns pending status with blockers when rules fail', () => {
    const service = new ActivationGateService({ requireVerification: true });
    const result = service.evaluate({
      subscription: { status: 'NONE' },
      verification: { status: 'UNVERIFIED' },
    });

    expect(result.nextStatus).toBe('PENDING_SUBSCRIPTION');
    expect(result.activationBlockers).toEqual(
      expect.arrayContaining(['SUBSCRIPTION_INACTIVE', 'VERIFICATION_REQUIRED'])
    );
  });
});

