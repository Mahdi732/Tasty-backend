export class RedisMock {
  constructor() {
    this.store = new Map();
  }

  async connect() {
    return true;
  }

  async quit() {
    return true;
  }

  async get(key) {
    return this.store.get(key) ?? null;
  }

  async set(key, value, options = {}) {
    this.store.set(key, value);
    if (options.EX) {
      const ttlMs = options.EX * 1000;
      if (ttlMs <= 2147483647) {
        setTimeout(() => this.store.delete(key), ttlMs).unref?.();
      }
    }
    return 'OK';
  }

  async del(key) {
    this.store.delete(key);
    return 1;
  }

  async sendCommand(args) {
    const [cmd, key] = args;
    if (cmd === 'INCR') {
      const current = Number(this.store.get(key) || 0) + 1;
      this.store.set(key, String(current));
      return current;
    }
    if (cmd === 'PTTL') {
      return 60000;
    }
    if (cmd === 'EXPIRE') {
      return 1;
    }
    return 1;
  }
}

