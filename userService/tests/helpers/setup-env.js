process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.LOG_LEVEL = 'silent';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/test-auth';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.BODY_LIMIT = '16kb';
process.env.TRUST_PROXY = '1';

process.env.JWT_ISSUER = 'tasty-auth-service-test';
process.env.JWT_AUDIENCE = 'tasty-platform-test';
process.env.JWT_ACCESS_TTL_SECONDS = '900';
process.env.JWT_REFRESH_TTL_DAYS = '30';
process.env.JWT_ACTIVE_KID = 'key-test-active';
process.env.JWT_PREVIOUS_KID = 'key-test-previous';
process.env.JWT_PRIVATE_KEY =
  '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDL3LbZesNBBwtp\npJN2EEm4HzKKUI1uE1wvwVNW8xNj6IFK+b/WqitH5DZioRTGMJSGqA0j9SEAN3sh\nh6qk5Ff5jfLwOWk9+LUyOf+WGwoRFvgUfG6vZ7Pp3KyknppBFUWJJIq6c/hvrXU/\n6urPiM5M/2IwLyEEpDuyupxH6BA++6FiSzzDQECBK862p3/5mGEEmp1Ida+9dWMC\nQxeuOfZRxniZP178tWh7UuNSeNQzXZQzcFr+4jmJ0YqeQPHr8nxN54pVtALwq9Wz\nLKEYR4cRsrLxjvYU1pZHhtnNj35DpPRlRFt90ODG31YVDKZH4s9iUaZDRPre3AVr\nr+cHq2v5AgMBAAECggEAKeTlvrO3xHlKIx+rHiwiui/PFxWOuvxHiZjVI504cuOp\nDltczSSTWGbRtlscBc6d9z451RXe/khoiW9z5gb2/VXqguuJcS7XLcc1ewd7fh+W\nQ79+j5VkJ78ty3a8hHt2msRjrgV/HJQs8EG6l4OpwbEJ4JUO2AFYM1aeHzjVfduh\n7/hpAYbqkCMwLNvoRjSW2sIfq6VQB78NsIZALGmWbwaRzBuBK5vR+IS8rQSFryne\nkVWdPyqLnAOj49zm9HKIm1kNA8nCNRDwlI6caAr10jIhLz2da0FEhDeKSTTmYdz9\nO4x9mNOacw/TGtyr1576X0fI+fxKiTAr03R0mXU0wQKBgQD7VcyVCy+jMhZ9PRKl\ny8N45MRWs1ODOx9aos9gi7zyfH3wdRKulVdH/UxGWIHN3U/8k/JNqKp4BwZ145cQ\nit/BYbGxTwrkTWAEJO3hQMnWWtWx9Ef6WVArnv25pP1sToMK+5kKv7JVV19Aufpz\nexnBDNq5Iv6mPprg/0PNnw8FnQKBgQDPpVnC01ylFQmadv6q2M+3ZnPEnC+PyXGH\nbjQQMZXSx+Hy6l2NrIm9Q5TsKyKKLoZf1KKmhs5mElsp4CHhqFzq3PjwbY4qmOVf\nQEBnXbMa/DSaxrWFfHGDHMmhGD055dyp6m9N54iy/2LFF0E1/Nwtnbrk4YYwBsUw\n0uh8mBi/DQKBgQCJAIAATpStFMSFiCD+F1B6Odl8mUvQoQ26Tj1Ul1drpsjPpkGE\nwQtOxpgpUF2RZi4PtGXER0iFHO88m87gyZKmyyYdTMTXJgZMvASfYL2lBuatlkcW\nBFFbNdOAupsZysJL3lHSNiRzuKjHk5keEeA8B1HC0XyWClJKi1reXvHFUQKBgEvd\nFZZgspB9xyxwHUs+O2W+QL2scpQN/TSFxu/DrgF8lciyZ8vDJe/IKTi/6baimOWa\nQnKk/fO88SGzia1wXcJRSYJOBIr7oZHTX7RkP3O0gWOrBdbnSHGmquP4fyYQHTbX\nOCM2XHNJa0Sm4mRfJfJklkvZObWCQ7k61UXwK9phAoGALNAoiI9/Vgf+g2kux0hq\nVGDJbAAtfS3tcYYpPYhzvwr6K1seHl1HCqja7KsLz/hVrWY/f7dUOAhYQsAwq/Ac\nj4y+yLqri8yYP1D8bzmXnCMgtfyDon0I0rvaC9o1VRsjxNhlZDPWhYkbqtamuxDn\nRC1VyuSK/+y5CZswPv1ifRo=\n-----END PRIVATE KEY-----\n';
process.env.JWT_PUBLIC_KEY =
  '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy9y22XrDQQcLaaSTdhBJ\nuB8yilCNbhNcL8FTVvMTY+iBSvm/1qorR+Q2YqEUxjCUhqgNI/UhADd7IYeqpORX\n+Y3y8DlpPfi1Mjn/lhsKERb4FHxur2ez6dyspJ6aQRVFiSSKunP4b611P+rqz4jO\nTP9iMC8hBKQ7srqcR+gQPvuhYks8w0BAgSvOtqd/+ZhhBJqdSHWvvXVjAkMXrjn2\nUcZ4mT9e/LVoe1LjUnjUM12UM3Ba/uI5idGKnkDx6/J8TeeKVbQC8KvVsyyhGEeH\nEbKy8Y72FNaWR4bZzY9+Q6T0ZURbfdDgxt9WFQymR+LPYlGmQ0T63twFa6/nB6tr\n+QIDAQAB\n-----END PUBLIC KEY-----\n';
process.env.JWT_PREVIOUS_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY;
process.env.TOKEN_HASH_SECRET = 'test_token_hash_secret_value_123456789';

process.env.REFRESH_TOKEN_TRANSPORT = 'body';
process.env.REFRESH_COOKIE_NAME = 'rt';
process.env.COOKIE_SECURE = 'false';
process.env.COOKIE_DOMAIN = '';
process.env.COOKIE_SAME_SITE = 'lax';

process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '1000';
process.env.LOGIN_RATE_LIMIT_MAX = '1000';
process.env.REFRESH_RATE_LIMIT_MAX = '1000';

process.env.OAUTH_STATE_TTL_SECONDS = '600';
process.env.ALLOW_AUTO_LINK_VERIFIED_OAUTH_EMAIL = 'false';
