export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/helpers/setup-env.js'],
  setupFilesAfterEnv: [],
  transform: {},
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
};
