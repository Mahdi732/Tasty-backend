export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testTimeout: 20000,
  setupFiles: ['<rootDir>/tests/helpers/setup-env.js'],
  setupFilesAfterEnv: [],
  transform: {},
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
};
