const { defineConfig } = require("cypress");

module.exports = defineConfig({
    e2e: {
        // The site that `make create-site` makes, served by `make start`.
        baseUrl: "http://localhost:8080/Plone",
        specPattern: "cypress/e2e/**/*.cy.js",
        supportFile: "cypress/support/e2e.js",
        // pdf.js can need some seconds to render a page on a CI machine.
        defaultCommandTimeout: 10000,
        viewportWidth: 1280,
        viewportHeight: 900,
        video: false,
    },
});
