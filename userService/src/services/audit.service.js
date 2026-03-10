export class AuditService {
  constructor(logger) {
    this.logger = logger;
  }

  log(event, payload = {}) {
    this.logger.info({ event, ...payload }, 'security_audit_event');
  }
}

