const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000/api',
    specPattern: 'cypress/e2e/**/*.cy.{js,ts}',
    supportFile: false,
  },
});
