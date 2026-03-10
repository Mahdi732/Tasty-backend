const normalizeOrigin = (value) => (typeof value === 'string' ? value.replace(/\/$/, '') : value);

export const buildCorsOptions = (allowedOrigins) => ({
  origin: (origin, callback) => {
    const normalizedAllowedOrigins = allowedOrigins.map(normalizeOrigin);
    const normalizedOrigin = normalizeOrigin(origin);

    if (!origin) {
      return callback(null, true);
    }
    if (normalizedAllowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS blocked for origin'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
});

