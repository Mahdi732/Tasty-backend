import {
  ACTIVATION_BLOCKERS,
  RESTAURANT_STATUS,
  SUBSCRIPTION_STATUS,
  VERIFICATION_STATUS,
} from '../constants/restaurant.js';

export class ActivationGateService {
  constructor({ requireVerification }) {
    this.requireVerification = requireVerification;
  }

  evaluate(restaurant) {
    const blockers = [];

    if (![SUBSCRIPTION_STATUS.TRIAL, SUBSCRIPTION_STATUS.ACTIVE].includes(restaurant.subscription.status)) {
      blockers.push(ACTIVATION_BLOCKERS.SUBSCRIPTION_INACTIVE);
    }

    if (this.requireVerification) {
      if (restaurant.verification.status === VERIFICATION_STATUS.REJECTED) {
        blockers.push(ACTIVATION_BLOCKERS.VERIFICATION_REJECTED);
      } else if (restaurant.verification.status !== VERIFICATION_STATUS.VERIFIED) {
        blockers.push(ACTIVATION_BLOCKERS.VERIFICATION_REQUIRED);
      }
    }

    if (blockers.length === 0) {
      return {
        nextStatus: RESTAURANT_STATUS.ACTIVE,
        activationBlockers: [],
      };
    }

    if (blockers.includes(ACTIVATION_BLOCKERS.SUBSCRIPTION_INACTIVE)) {
      return {
        nextStatus: RESTAURANT_STATUS.PENDING_SUBSCRIPTION,
        activationBlockers: blockers,
      };
    }

    return {
      nextStatus: RESTAURANT_STATUS.PENDING_VERIFICATION,
      activationBlockers: blockers,
    };
  }
}
