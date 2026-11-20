const { spawnSync } = require("child_process");
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
        setupNodeEvents(on) {
            on("task", {
                // The signature tags of a PDF, read by spike/check_tags.py.
                checkTags(path) {
                    const result = spawnSync(
                        "uvx",
                        ["--with", "jsonschema", "python", "spike/check_tags.py", "--json", path],
                        { encoding: "utf-8" },
                    );
                    if (result.error || !result.stdout) {
                        throw new Error(`check_tags.py failed: ${result.error || result.stderr}`);
                    }
                    return JSON.parse(result.stdout);
                },
            });
        },
    },
});
