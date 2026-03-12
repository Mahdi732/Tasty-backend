const STATES = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN',
});

export class GatewayUpstreamError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'GatewayUpstreamError';
    this.statusCode = details.statusCode || 503;
    this.errorCode = details.errorCode || 'UPSTREAM_SERVICE_UNAVAILABLE';
    this.serviceName = details.serviceName || 'unknown-service';
    this.isUpstreamUnavailable = true;
    this.isCircuitOpen = Boolean(details.isCircuitOpen);
    this.isTimeout = Boolean(details.isTimeout);
    this.cause = details.cause;
  }
}

export class CircuitBreaker {
  constructor({ name, logger, failureThreshold = 5, resetTimeoutMs = 30000 }) {
    this.name = name;
    this.logger = logger;
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;

    this.state = STATES.CLOSED;
    this.consecutiveFailures = 0;
    this.nextAttemptAt = 0;
  }

  transitionTo(nextState, reason) {
    if (this.state === nextState) {
      return;
    }

    const prev = this.state;
    this.state = nextState;
    this.logger?.warn?.(
      {
        breaker: this.name,
        previousState: prev,
        nextState,
        reason,
        consecutiveFailures: this.consecutiveFailures,
      },
      'grpc_circuit_state_changed'
    );
  }

  markSuccess() {
    this.consecutiveFailures = 0;
    this.nextAttemptAt = 0;
    this.transitionTo(STATES.CLOSED, 'upstream_recovered');
  }

  markFailure() {
    this.consecutiveFailures += 1;

    if (this.state === STATES.HALF_OPEN || this.consecutiveFailures >= this.failureThreshold) {
      this.nextAttemptAt = Date.now() + this.resetTimeoutMs;
      this.transitionTo(STATES.OPEN, 'failure_threshold_reached');
    }
  }

  canAttempt() {
    if (this.state !== STATES.OPEN) {
      return true;
    }

    if (Date.now() >= this.nextAttemptAt) {
      this.transitionTo(STATES.HALF_OPEN, 'open_window_elapsed');
      return true;
    }

    return false;
  }

  async execute(action) {
    if (!this.canAttempt()) {
      throw new GatewayUpstreamError(`${this.name} circuit is open`, {
        serviceName: this.name,
        errorCode: 'CIRCUIT_OPEN',
        isCircuitOpen: true,
      });
    }

    try {
      const result = await action();
      this.markSuccess();
      return result;
    } catch (error) {
      this.markFailure();
      throw error;
    }
  }
}
